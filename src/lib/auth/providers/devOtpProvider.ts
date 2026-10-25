import { OtpProvider, SendOtpResult, VerifyOtpResult, AuthUserProfile } from "../types";
import { DEV_FIXED_OTP, SEEDED_DEV_USERS, OTP_CONFIG } from "../constants";
import { otpRateLimiter } from "../rateLimiter";
import { maskPhone, authLog } from "../privacy";

export class DevOtpProvider implements OtpProvider {
  public readonly name = "dev-otp-adapter";
  public readonly isLive = false;

  private isSeededNumber(phone: string): boolean {
    const cleanPhone = phone.trim();
    return SEEDED_DEV_USERS.some((u) => u.phone === cleanPhone);
  }

  private getSeededUser(phone: string): (typeof SEEDED_DEV_USERS)[number] | undefined {
    const cleanPhone = phone.trim();
    return SEEDED_DEV_USERS.find((u) => u.phone === cleanPhone);
  }

  public async sendOtp(phone: string, ip: string): Promise<SendOtpResult> {
    const cleanPhone = phone.trim();

    // In dev mode, only seeded test phone numbers are permitted
    if (!this.isSeededNumber(cleanPhone)) {
      authLog("DEV_OTP_REJECTED_NON_SEEDED", { phone: cleanPhone });
      return {
        success: false,
        message: `In development mode, only seeded test numbers are allowed (+910000000001 to +910000000005).`,
      };
    }

    // Check rate limiter & cooldown
    const check = otpRateLimiter.checkCanSend(cleanPhone, ip);
    if (!check.allowed) {
      return {
        success: false,
        message: check.reason,
        cooldownSeconds: check.retryAfterSeconds,
      };
    }

    // Record OTP send with the fixed dev code (123456)
    otpRateLimiter.recordSend(cleanPhone, ip, DEV_FIXED_OTP);

    authLog("DEV_OTP_DISPATCHED", {
      phone: cleanPhone,
      mode: "dev",
    });

    return {
      success: true,
      maskedPhone: maskPhone(cleanPhone),
      cooldownSeconds: OTP_CONFIG.COOLDOWN_SECONDS,
      devMode: true,
      devCode: DEV_FIXED_OTP,
      message: `Development OTP generated for ${maskPhone(cleanPhone)}. Test code is ${DEV_FIXED_OTP}.`,
    };
  }

  public async verifyOtp(phone: string, code: string, ip: string): Promise<VerifyOtpResult> {
    const cleanPhone = phone.trim();

    if (!this.isSeededNumber(cleanPhone)) {
      return {
        success: false,
        error: "Non-seeded test number rejected in development mode.",
      };
    }

    const verification = otpRateLimiter.verifyDevCode(cleanPhone, code);
    if (!verification.valid) {
      const lockout = otpRateLimiter.checkLockout(cleanPhone);
      return {
        success: false,
        error: verification.reason,
        lockoutRemainingSeconds: lockout.remainingSeconds,
      };
    }

    const seeded = this.getSeededUser(cleanPhone);
    if (!seeded) {
      return {
        success: false,
        error: "Seeded profile not found.",
      };
    }

    const userProfile: AuthUserProfile = {
      id: seeded.id,
      name: seeded.name,
      phone: seeded.phone,
      role: seeded.role,
      stationId: seeded.stationId || null,
      stationName: seeded.stationName || null,
    };

    return {
      success: true,
      user: userProfile,
    };
  }
}
