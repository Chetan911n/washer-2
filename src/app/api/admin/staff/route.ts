import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!serviceRoleKey || !token || !safeCompare(token, serviceRoleKey)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing admin credentials." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { phone, name, role, station_id } = body;

    if (!phone || !role || !["station_head", "washer"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields. Provide phone, role ('station_head' or 'washer'), and optional station_id." },
        { status: 400 }
      );
    }

    const stationId = station_id || "green_valley";

    // 1. Look up user in auth
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    let user = listData?.users?.find((u) => u.phone === phone);

    if (!user) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        phone_confirm: true,
        user_metadata: { name: name || phone, phone, role },
      });
      if (createError) throw createError;
      user = created.user;
    }

    // 2. Set profile role & station
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: user.id,
        phone,
        name: name || user.user_metadata?.name || phone,
        role,
        station_id: stationId,
        updated_at: new Date().toISOString(),
      });

    if (profileError) throw profileError;

    return NextResponse.json({
      success: true,
      message: `Staff member successfully assigned as ${role} for station ${stationId}.`,
      staff: {
        id: user.id,
        phone,
        name: name || phone,
        role,
        station_id: stationId,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
