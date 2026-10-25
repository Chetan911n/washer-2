import { OTP_CONFIG, DEV_FIXED_OTP } from "./constants";
import { maskPhone, authLog } from "./privacy";

interface PhoneState {
  lastSentAt: number; // timestamp ms
  sendTimestamps: number[]; // requests in the last hour
  activeCode?: string;
  codeExpiresAt?: number;
  failedAttempts: number;
  lockedUntil?: number;
}

interface IpState {
  sendTimestamps: number[];
}

class OtpRateLimiter {
  private phoneStates = new Map<string, PhoneState>();
  private ipStates = new Map<string, IpState>();

  private cleanOldTimestamps(timestamps: number[], windowMs: number): number[] {
    const now = Date.now();
    return timestamps.filter((t) => now - t < windowMs);
  }

  public checkCanSend(phone: string, ip: string): { allowed: boolean; reason?: string; retryAfterSeconds?: number } {
    const now = Date.now();
    const pState = this.phoneStates.get(phone);
    const iState = this.ipStates.get(ip);

    // 1. Check phone cooldown (30 seconds)
    if (pState && pState.lastSentAt) {
      const elapsed = (now - pState.lastSentAt) / 1000;
      if (elapsed < OTP_CONFIG.COOLDOWN_SECONDS) {
        const remaining = Math.ceil(OTP_CONFIG.COOLDOWN_SECONDS - elapsed);
        return {
          allowed: false,
          reason: `Please wait ${remaining} seconds before requesting a new code.`,
          retryAfterSeconds: remaining,
        };
      }
    }

    // 2. Check phone hourly limit (5 per hour)
    if (pState) {
      const activeTimestamps = this.cleanOldTimestamps(pState.sendTimestamps, 3600 * 1000);
      pState.sendTimestamps = activeTimestamps;
      if (activeTimestamps.length >= OTP_CONFIG.MAX_REQUESTS_PER_PHONE_HOUR) {
        return {
          allowed: false,
          reason: "Too many OTP requests for this phone number. Please try again after 1 hour.",
          retryAfterSeconds: 3600,
        };
      }
    }

    // 3. Check IP hourly limit (20 per hour)
    if (iState) {
      const activeIpTimestamps = this.cleanOldTimestamps(iState.sendTimestamps, 3600 * 1000);
      iState.sendTimestamps = activeIpTimestamps;
      if (activeIpTimestamps.length >= OTP_CONFIG.MAX_REQUESTS_PER_IP_HOUR) {
        return {
          allowed: false,
          reason: "Too many OTP requests from your network. Please try again after 1 hour.",
          retryAfterSeconds: 3600,
        };
      }
    }

    return { allowed: true };
  }

  public recordSend(phone: string, ip: string, code: string): void {
    const now = Date.now();
    let pState = this.phoneStates.get(phone);
    if (!pState) {
      pState = {
        lastSentAt: now,
        sendTimestamps: [now],
        activeCode: code,
        codeExpiresAt: now + OTP_CONFIG.EXPIRY_SECONDS * 1000,
        failedAttempts: 0,
      };
      this.phoneStates.set(phone, pState);
    } else {
      pState.lastSentAt = now;
      pState.sendTimestamps.push(now);
      pState.activeCode = code;
      pState.codeExpiresAt = now + OTP_CONFIG.EXPIRY_SECONDS * 1000;
    }

    let iState = this.ipStates.get(ip);
    if (!iState) {
      iState = { sendTimestamps: [now] };
      this.ipStates.set(ip, iState);
    } else {
      iState.sendTimestamps.push(now);
    }

    authLog("OTP_SENT_RECORDED", { phone, ip });
  }

  public checkLockout(phone: string): { locked: boolean; remainingSeconds?: number } {
    const now = Date.now();
    const pState = this.phoneStates.get(phone);
    if (pState && pState.lockedUntil && pState.lockedUntil > now) {
      const remainingSeconds = Math.ceil((pState.lockedUntil - now) / 1000);
      return { locked: true, remainingSeconds };
    }
    // If lockout expired, reset
    if (pState && pState.lockedUntil && pState.lockedUntil <= now) {
      pState.lockedUntil = undefined;
      pState.failedAttempts = 0;
    }
    return { locked: false };
  }

  public verifyDevCode(phone: string, enteredCode: string): { valid: boolean; reason?: string } {
    const now = Date.now();
    const lockout = this.checkLockout(phone);
    if (lockout.locked) {
      return {
        valid: false,
        reason: `Account locked due to multiple incorrect attempts. Try again in ${Math.ceil(
          (lockout.remainingSeconds || 0) / 60
        )} minutes.`,
      };
    }

    if (enteredCode.trim() !== DEV_FIXED_OTP) {
      let pState = this.phoneStates.get(phone);
      if (!pState) {
        pState = {
          lastSentAt: now,
          sendTimestamps: [now],
          failedAttempts: 1,
        };
        this.phoneStates.set(phone, pState);
      } else {
        pState.failedAttempts = (pState.failedAttempts || 0) + 1;
      }

      authLog("DEV_OTP_WRONG_ATTEMPT", { phone, failedAttempts: pState.failedAttempts });

      if (pState.failedAttempts >= OTP_CONFIG.MAX_FAILED_ATTEMPTS) {
        pState.lockedUntil = now + OTP_CONFIG.LOCKOUT_SECONDS * 1000;
        return {
          valid: false,
          reason: "Too many wrong codes. Verification is locked for 15 minutes.",
        };
      }

      const remainingAttempts = OTP_CONFIG.MAX_FAILED_ATTEMPTS - pState.failedAttempts;
      return {
        valid: false,
        reason: `Invalid code. ${remainingAttempts} attempts remaining before account lockout.`,
      };
    }

    let pState = this.phoneStates.get(phone);
    if (pState) {
      pState.failedAttempts = 0;
      pState.lockedUntil = undefined;
    }

    authLog("DEV_OTP_VERIFY_SUCCESS", { phone });
    return { valid: true };
  }

  public verifyCode(phone: string, enteredCode: string): { valid: boolean; reason?: string } {
    const now = Date.now();
    const lockout = this.checkLockout(phone);
    if (lockout.locked) {
      return {
        valid: false,
        reason: `Account locked due to multiple incorrect attempts. Try again in ${Math.ceil(
          (lockout.remainingSeconds || 0) / 60
        )} minutes.`,
      };
    }

    let pState = this.phoneStates.get(phone);
    if (!pState || !pState.activeCode) {
      return { valid: false, reason: "No active OTP found. Please request a new code." };
    }

    if (pState.codeExpiresAt && pState.codeExpiresAt < now) {
      pState.activeCode = undefined;
      return { valid: false, reason: "OTP has expired. Please request a new code." };
    }

    if (pState.activeCode !== enteredCode.trim()) {
      pState.failedAttempts = (pState.failedAttempts || 0) + 1;
      authLog("OTP_VERIFY_FAILED", {
        phone,
        failedAttempts: pState.failedAttempts,
      });

      if (pState.failedAttempts >= OTP_CONFIG.MAX_FAILED_ATTEMPTS) {
        pState.lockedUntil = now + OTP_CONFIG.LOCKOUT_SECONDS * 1000;
        pState.activeCode = undefined;
        return {
          valid: false,
          reason: `Too many wrong codes. Verification is locked for 15 minutes.`,
        };
      }

      const remainingAttempts = OTP_CONFIG.MAX_FAILED_ATTEMPTS - pState.failedAttempts;
      return {
        valid: false,
        reason: `Invalid code. ${remainingAttempts} attempts remaining before account lockout.`,
      };
    }

    // Success: clear active OTP and reset failed attempts
    pState.activeCode = undefined;
    pState.failedAttempts = 0;
    pState.lockedUntil = undefined;
    authLog("OTP_VERIFY_SUCCESS", { phone });

    return { valid: true };
  }

  public resetAll(): void {
    this.phoneStates.clear();
    this.ipStates.clear();
  }
}

export const otpRateLimiter = new OtpRateLimiter();
