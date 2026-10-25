import { NextResponse } from "next/server";
import { getOtpMode } from "@/lib/auth/otpManager";
import { SEEDED_DEV_USERS } from "@/lib/auth/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const mode = getOtpMode();
    const isDev = mode === "dev";

    return NextResponse.json({
      success: true,
      mode,
      devMode: isDev,
      isLive: !isDev,
      demoUsers: isDev ? SEEDED_DEV_USERS : [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
