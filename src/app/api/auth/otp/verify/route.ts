import { NextRequest, NextResponse } from "next/server";
import { getOtpProvider } from "@/lib/auth/otpManager";
import { authLog } from "@/lib/auth/privacy";
import { supabaseAdmin } from "@/lib/supabaseServer";

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

    // Lookup profile in Supabase database
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, name, phone, station_id")
      .eq("phone", phone)
      .maybeSingle();

    if (error) {
      authLog("VERIFY_PROFILE_LOOKUP_ERROR", { phone, error: error.message });
    }

    if (profile) {
      return NextResponse.json({
        success: true,
        user: {
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          role: profile.role,
          stationId: profile.station_id,
        },
      });
    }

    // In dev mode with seeded user fallback
    if (result.user && result.user.id) {
      return NextResponse.json({
        success: true,
        user: result.user,
      });
    }

    // In live mode for a new customer: create auth user & let trigger create profile
    try {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        phone_confirm: true,
        user_metadata: { name: "Customer", phone },
      });

      if (createError) {
        throw createError;
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.user.id,
          name: "Customer",
          phone,
          role: "customer",
          stationId: null,
        },
      });
    } catch (createErr: any) {
      authLog("AUTO_PROVISION_CUSTOMER_FAILED", { phone, error: createErr.message });
      return NextResponse.json({
        success: true,
        user: {
          id: "temp_customer",
          name: "Customer",
          phone,
          role: "customer",
          stationId: null,
        },
      });
    }
  } catch (err: any) {
    authLog("VERIFY_OTP_SERVER_ERROR", { error: err.message });
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify code." },
      { status: 500 }
    );
  }
}
