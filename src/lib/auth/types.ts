export type UserRole = "customer" | "station_head" | "washer";

export interface AuthUserProfile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  stationId?: string | null;
  stationName?: string | null;
}

export interface SendOtpResult {
  success: boolean;
  message?: string;
  maskedPhone?: string;
  cooldownSeconds?: number;
  devMode?: boolean;
  devCode?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  user?: AuthUserProfile;
  sessionToken?: string;
  error?: string;
  lockoutRemainingSeconds?: number;
}

export interface OtpProvider {
  name: string;
  isLive: boolean;
  sendOtp(phone: string, ip: string): Promise<SendOtpResult>;
  verifyOtp(phone: string, code: string, ip: string): Promise<VerifyOtpResult>;
}
