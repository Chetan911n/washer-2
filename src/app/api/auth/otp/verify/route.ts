import { NextRequest, NextResponse } from "next/server";
import { getOtpProvider } from "@/lib/auth/otpManager";
import { authLog } from "@/lib/auth/privacy";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = (body.phone || "").trim();
    const code = (body.code || "").trim();

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: "Phone number and verification code are required." },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const provider = getOtpProvider();
    const result = await provider.verifyOtp(phone, code, ip);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // 1. Lookup profile in Supabase database
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, name, phone, station_id")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      authLog("VERIFY_PROFILE_LOOKUP_ERROR", { phone, error: error.message });
    }

    let authUserId = profile?.id || result.user?.id;
    let authUserName = profile?.name || result.user?.name || "Customer";
    let authUserRole = profile?.role || result.user?.role || "customer";
    let authUserStation = profile?.station_id ?? result.user?.stationId ?? null;

    // 2. If new customer in live mode without existing profile, provision in auth.users
    if (!profile && !result.user?.id) {
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone,
          phone_confirm: true,
          user_metadata: { name: "Customer", phone },
        });

        if (createError) throw createError;
        authUserId = newUser.user.id;
      } catch (createErr: any) {
        authLog("AUTO_PROVISION_CUSTOMER_FAILED", { phone, error: createErr.message });
      }
    }

    // 3. Issue a valid Supabase Auth session so browser client is authenticated
    let session: { access_token: string; refresh_token: string } | null = null;
    try {
      const email = `${phone.replace(/[^0-9]/g, "")}@appwasher.test`;
      const linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { data: { phone, name: authUserName, role: authUserRole } },
      });

      const hash = linkRes.data?.properties?.hashed_token;
      const vType = linkRes.data?.properties?.verification_type || "magiclink";

      if (hash) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        if (anonKey) {
          const client = createClient(supabaseUrl, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const exchange = await client.auth.verifyOtp({
            token_hash: hash,
            type: vType as any,
          });
          if (exchange.data?.session) {
            session = {
              access_token: exchange.data.session.access_token,
              refresh_token: exchange.data.session.refresh_token,
            };
          }
        }
      }
    } catch (sessionErr: any) {
      authLog("SESSION_GENERATION_FAILED", { phone, error: sessionErr.message });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUserId,
        name: authUserName,
        phone,
        role: authUserRole,
        stationId: authUserStation,
      },
      session,
    });
  } catch (err: any) {
    authLog("VERIFY_OTP_SERVER_ERROR", { error: err.message });
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify code." },
      { status: 500 }
    );
  }
}
