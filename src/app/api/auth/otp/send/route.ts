import { NextRequest, NextResponse } from "next/server";
import { getOtpProvider } from "@/lib/auth/otpManager";
import { maskPhone, authLog } from "@/lib/auth/privacy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = (body.phone || "").trim();

    if (!phone) {
      return NextResponse.json(
        { success: false, message: "Phone number is required." },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    authLog("SEND_OTP_REQUESTED", { phone, ip });

    const provider = getOtpProvider();
    const result = await provider.sendOtp(phone, ip);

    if (!result.success) {
      return NextResponse.json(result, { status: 429 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    authLog("SEND_OTP_ERROR", { error: err.message });
    return NextResponse.json(
      { success: false, message: err.message || "Failed to process OTP request." },
      { status: 500 }
    );
  }
}
