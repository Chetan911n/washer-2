import { NextResponse } from "next/server";
import { getOtpMode, PROD_PROJECT_REF } from "@/lib/auth/otpManager";
import { SEEDED_DEV_USERS } from "@/lib/auth/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const mode = getOtpMode();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().toLowerCase();
    const isProdDb = supabaseUrl.includes(PROD_PROJECT_REF);
    const isDev = mode === "dev" && !isProdDb;

    return NextResponse.json({
      success: true,
      mode,
      devMode: isDev,
      isLive: !isDev,
      isStaging: isDev,
      demoUsers: isDev ? SEEDED_DEV_USERS : [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
