/**
 * Utility functions for Booking Calendar & Asia/Kolkata Timezone Handling
 */

export const IST_TIMEZONE = "Asia/Kolkata";
export const BOOKING_HORIZON_DAYS = 30;

export const PACKAGE_DURATIONS: Record<string, number> = {
  ext: 45,
  deep: 75,
  prem: 120,
};

/**
 * Returns today's date in Asia/Kolkata as YYYY-MM-DD
 */
export function getIstTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST_TIMEZONE }).format(new Date());
}

/**
 * Returns current time in Asia/Kolkata as HH:mm (24-hour)
 */
export function getIstCurrentTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Returns an offset date in Asia/Kolkata as YYYY-MM-DD
 */
export function getIstOffsetIso(days: number, baseIso?: string): string {
  const base = baseIso || getIstTodayIso();
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
}

/**
 * Formats a YYYY-MM-DD date into long form, e.g. "Tuesday, 27 October 2026"
 */
export function formatLongDate(dateStr?: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateObj);
}

/**
 * Converts a 24-hour time "08:30" to "08:30 AM" or "15:00" to "03:00 PM"
 */
export function formatTime12(time24?: string): string {
  if (!time24 || !time24.includes(":")) return time24 || "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Adds minutes to a 24-hour time string "HH:mm" and returns "HH:mm"
 */
export function addMinutesToTime(time24: string, minutes: number): string {
  if (!time24 || !time24.includes(":")) return time24;
  const [h, m] = time24.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/**
 * Returns number of days in month (handles leap years accurately)
 * month is 0-indexed: 0 = Jan, 1 = Feb, ..., 11 = Dec
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Checks whether a month/year is before current month/year
 */
export function isMonthBeforeCurrent(year: number, month: number, todayYear: number, todayMonth: number): boolean {
  if (year < todayYear) return true;
  if (year === todayYear && month <= todayMonth) return true;
  return false;
}

/**
 * Checks whether a month/year is beyond the horizon month/year
 */
export function isMonthBeyondHorizon(year: number, month: number, horizonYear: number, horizonMonth: number): boolean {
  if (year > horizonYear) return true;
  if (year === horizonYear && month >= horizonMonth) return true;
  return false;
}
