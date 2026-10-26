import { OtpProvider } from "./types";
import { DevOtpProvider } from "./providers/devOtpProvider";
import { LiveWhatsAppOtpProvider } from "./providers/liveWhatsAppOtpProvider";

export const PROD_PROJECT_REF = "jgekymuphznmfsbdexaw";

export function getOtpMode(): "dev" | "live" {
  const mode = (process.env.OTP_MODE || "").trim().toLowerCase();
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().toLowerCase();
  const isProduction =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build";

  // Existing production refusal (KEPT EXACTLY AS IT IS)
  if (isProduction) {
    if (mode !== "live") {
      throw new Error(
        `[CRITICAL SECURITY REFUSAL] In production, OTP_MODE must be set to 'live'. Current value: '${mode || "undefined"}'. App refusing to start.`
      );
    }
  }

  // Guard 1: Hard refusal if dev mode points at production database
  if (mode === "dev" && supabaseUrl.includes(PROD_PROJECT_REF)) {
    throw new Error("Dev OTP is not allowed against the production database.");
  }

  // Guard 2: Hard refusal if live mode points at a staging or local database
  if (mode === "live") {
    const isStaging =
      supabaseUrl.includes("staging") ||
      supabaseUrl.includes("127.0.0.1") ||
      supabaseUrl.includes("localhost") ||
      (supabaseUrl.length > 0 && !supabaseUrl.includes(PROD_PROJECT_REF));

    if (isStaging) {
      throw new Error("Live WhatsApp OTP is not allowed against a staging database.");
    }
    return "live";
  }

  return "dev";
}

let activeProvider: OtpProvider | null = null;

export function getOtpProvider(): OtpProvider {
  const mode = getOtpMode();
  if (!activeProvider || (mode === "dev" && activeProvider.isLive) || (mode === "live" && !activeProvider.isLive)) {
    if (mode === "dev") {
      activeProvider = new DevOtpProvider();
    } else {
      activeProvider = new LiveWhatsAppOtpProvider();
    }
  }
  return activeProvider;
}
