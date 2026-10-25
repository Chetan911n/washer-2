import crypto from "crypto";

/**
 * Mask phone numbers so they are never logged in plain text.
 * Example: "+910000000001" -> "+91******0001"
 * Example: "+919876543210" -> "+91******3210"
 */
export function maskPhone(phone: string): string {
  if (!phone) return "[EMPTY_PHONE]";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length <= 6) {
    return "***" + cleaned.slice(-2);
  }
  const prefix = cleaned.startsWith("+") ? cleaned.slice(0, 3) : cleaned.slice(0, 2);
  const suffix = cleaned.slice(-4);
  return `${prefix}******${suffix}`;
}

/**
 * One-way cryptographic hash of phone number for safe indexing/lookup logging.
 */
export function hashPhone(phone: string): string {
  if (!phone) return "";
  return crypto.createHash("sha256").update(phone.trim().toLowerCase()).digest("hex").slice(0, 16);
}

/**
 * Secure privacy-preserving logger that sanitizes any phone numbers before logging.
 */
export function authLog(action: string, meta?: Record<string, unknown>): void {
  const sanitizedMeta: Record<string, unknown> = {};
  if (meta) {
    for (const [key, value] of Object.entries(meta)) {
      if (typeof value === "string" && (key.toLowerCase().includes("phone") || /^\+?\d{8,15}$/.test(value.trim()))) {
        sanitizedMeta[key] = maskPhone(value);
      } else if (typeof value === "string" && (key.toLowerCase().includes("otp") || key.toLowerCase().includes("code") || key.toLowerCase().includes("password"))) {
        sanitizedMeta[key] = "[REDACTED]";
      } else {
        sanitizedMeta[key] = value;
      }
    }
  }
  console.log(`[AUTH:${action}]`, JSON.stringify(sanitizedMeta));
}
