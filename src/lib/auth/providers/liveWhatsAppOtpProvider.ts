import crypto from "crypto";
import { OtpProvider, SendOtpResult, VerifyOtpResult, AuthUserProfile } from "../types";
import { otpRateLimiter } from "../rateLimiter";
import { OTP_CONFIG, SEEDED_DEV_USERS } from "../constants";
import { maskPhone, authLog } from "../privacy";

export class LiveWhatsAppOtpProvider implements OtpProvider {
  public readonly name = "live-whatsapp-adapter";
  public readonly isLive = true;

  private isSeededNumber(phone: string): boolean {
    const cleanPhone = phone.trim();
    return SEEDED_DEV_USERS.some((u) => u.phone === cleanPhone);
  }

  private isConfigured(): boolean {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    return Boolean(token && phoneId && token !== "YOUR_WHATSAPP_ACCESS_TOKEN");
  }

  public async sendOtp(phone: string, ip: string): Promise<SendOtpResult> {
    const cleanPhone = phone.trim();

    // The seeded test numbers must NOT be usable for real accounts in live mode
    if (this.isSeededNumber(cleanPhone)) {
      authLog("LIVE_OTP_REJECTED_SEEDED_NUMBER", { phone: cleanPhone });
      return {
        success: false,
        message: "Development test numbers cannot be used in Live mode.",
      };
    }

    // Rate limiter check
    const check = otpRateLimiter.checkCanSend(cleanPhone, ip);
    if (!check.allowed) {
      return {
        success: false,
        message: check.reason,
        cooldownSeconds: check.retryAfterSeconds,
      };
    }

    // Check if Meta WhatsApp Business API credentials and approved template are active
    if (!this.isConfigured()) {
      authLog("LIVE_OTP_INACTIVE_UNCONFIGURED", { phone: cleanPhone });
      return {
        success: false,
        message:
          "WhatsApp Business account or approved OTP template is currently pending Meta verification. Live messages cannot be sent yet.",
      };
    }

    // Generate cryptographically secure random 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();

    // Record code in rate limiter
    otpRateLimiter.recordSend(cleanPhone, ip, code);

    try {
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
      const token = process.env.WHATSAPP_ACCESS_TOKEN!;
      const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || "appwasher_auth_otp";
      const languageCode = process.env.WHATSAPP_LANGUAGE_CODE || "en";

      // Meta WhatsApp Business Cloud API standard authentication template payload
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone.replace(/[^\d]/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: code,
                },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: code,
                },
              ],
            },
          ],
        },
      };

      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        authLog("META_WHATSAPP_API_ERROR", {
          phone: cleanPhone,
          status: response.status,
          error: errorData,
        });
        return {
          success: false,
          message: "Failed to dispatch WhatsApp OTP. Please verify your phone number or try again shortly.",
        };
      }

      authLog("LIVE_OTP_DISPATCHED_SUCCESS", { phone: cleanPhone });

      return {
        success: true,
        maskedPhone: maskPhone(cleanPhone),
        cooldownSeconds: OTP_CONFIG.COOLDOWN_SECONDS,
        devMode: false,
        message: `OTP sent via WhatsApp to ${maskPhone(cleanPhone)}. Code expires in 5 minutes.`,
      };
    } catch (err: any) {
      authLog("LIVE_OTP_EXCEPTION", { phone: cleanPhone, error: err?.message });
      return {
        success: false,
        message: "An unexpected error occurred sending WhatsApp OTP. Please try again.",
      };
    }
  }

  public async verifyOtp(phone: string, code: string, ip: string): Promise<VerifyOtpResult> {
    const cleanPhone = phone.trim();

    // Fixed test codes or seeded numbers must NEVER work in production / live mode
    if (this.isSeededNumber(cleanPhone)) {
      return {
        success: false,
        error: "Seeded test numbers are not valid in live mode.",
      };
    }

    const verification = otpRateLimiter.verifyCode(cleanPhone, code);
    if (!verification.valid) {
      const lockout = otpRateLimiter.checkLockout(cleanPhone);
      return {
        success: false,
        error: verification.reason,
        lockoutRemainingSeconds: lockout.remainingSeconds,
      };
    }

    // In live mode, lookup profile from Supabase
    // If not found, profile trigger handles creation on first sign-in
    return {
      success: true,
      user: {
        id: "", // Will be populated by session / DB lookup
        name: "Customer",
        phone: cleanPhone,
        role: "customer",
      },
    };
  }
}
