import { OtpProvider } from "./types";
import { DevOtpProvider } from "./providers/devOtpProvider";
import { LiveWhatsAppOtpProvider } from "./providers/liveWhatsAppOtpProvider";

export function getOtpMode(): "dev" | "live" {
  const mode = (process.env.OTP_MODE || "").trim().toLowerCase();
  const isProduction =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build";

  if (isProduction) {
    if (mode !== "live") {
      throw new Error(
        `[CRITICAL SECURITY REFUSAL] In production, OTP_MODE must be set to 'live'. Current value: '${mode || "undefined"}'. App refusing to start.`
      );
    }
    return "live";
  }

  // In non-production environments, default to 'dev' if not explicitly 'live'
  if (mode === "live") {
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
