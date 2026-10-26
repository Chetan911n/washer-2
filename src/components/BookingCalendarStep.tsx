"use client";

import React, { useState, useEffect } from "react";
import {
  getIstTodayIso,
  getIstOffsetIso,
  getDaysInMonth,
  isMonthBeforeCurrent,
  isMonthBeyondHorizon,
  formatTime12,
  addMinutesToTime,
  BOOKING_HORIZON_DAYS,
  PACKAGE_DURATIONS,
} from "@/lib/calendarUtils";
import { fetchAvailableSlotsRpc, AvailableSlot } from "@/lib/dataService";

interface BookingCalendarStepProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  selectedSlot?: string; // "HH:mm" e.g. "08:30"
  onSelectSlot: (slotStart: string, slotEnd: string) => void;
  packageId: string;
  stationId?: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function BookingCalendarStep({
  selectedDate,
  onSelectDate,
  selectedSlot,
  onSelectSlot,
  packageId,
  stationId = "green_valley",
}: BookingCalendarStepProps) {
  const todayIso = getIstTodayIso();
  const horizonIso = getIstOffsetIso(BOOKING_HORIZON_DAYS);

  const [todayYear, todayMonth] = todayIso.split("-").map(Number).slice(0, 2).map((v, i) => (i === 1 ? v - 1 : v));
  const [horizonYear, horizonMonth] = horizonIso.split("-").map(Number).slice(0, 2).map((v, i) => (i === 1 ? v - 1 : v));

  // Initial month/year from selectedDate or today
  const initDate = selectedDate || todayIso;
  const [initY, initM] = initDate.split("-").map(Number);
  const [viewYear, setViewYear] = useState<number>(initY);
  const [viewMonth, setViewMonth] = useState<number>(initM - 1); // 0-indexed

  // Slots state
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);

  // Month navigation guards
  const isPrevDisabled = isMonthBeforeCurrent(viewYear, viewMonth, todayYear, todayMonth);
  const isNextDisabled = isMonthBeyondHorizon(viewYear, viewMonth, horizonYear, horizonMonth);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Fetch live slots whenever selectedDate, packageId, or stationId changes
  const loadSlots = async (targetDate: string, targetPkg: string) => {
    setLoading(true);
    setError(null);
    setAvailabilityNotice(null);

    try {
      const data = await fetchAvailableSlotsRpc({
        stationId,
        date: targetDate,
        packageId: targetPkg,
      });
      setSlots(data);

      // Validate currently selected slot under new data
      if (selectedSlot) {
        const found = data.find((s) => s.slot_start === selectedSlot);
        if (found && found.is_available) {
          // Update slot end time in case package duration changed
          onSelectSlot(found.slot_start, found.end_time);
        } else {
          // Slot is no longer available: clear selection and alert customer
          onSelectSlot("", "");
          setAvailabilityNotice("The previously selected slot is no longer available. Please choose a slot.");
        }
      }
    } catch (err: any) {
      console.error("Failed to load available slots:", err);
      // Fallback for offline/test environments if database RPC isn't reachable
      const fallbackDuration = PACKAGE_DURATIONS[targetPkg] || 45;
      const defaultSlots: AvailableSlot[] = ["06:30", "08:30", "15:00", "17:00"].map((st) => ({
        slot_start: st,
        end_time: addMinutesToTime(st, fallbackDuration),
        is_available: true,
        is_past: false,
      }));
      setSlots(defaultSlots);
      setError("Could not refresh live availability from server. Showing standard slots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate, packageId);
    }
  }, [selectedDate, packageId, stationId]);

  // Calendar grid math
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  // Day of week of the 1st of the month: 0=Sun, 1=Mon...
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  // Monday-based offset: Mon=0, Tue=1, ..., Sun=6
  const startOffset = (firstDow + 6) % 7;

  // Jump to next day helper when no slots available
  const handleJumpNextDay = () => {
    const nextDayIso = getIstOffsetIso(1, selectedDate);
    if (nextDayIso <= horizonIso) {
      onSelectDate(nextDayIso);
      const [ny, nm] = nextDayIso.split("-").map(Number);
      setViewYear(ny);
      setViewMonth(nm - 1);
    }
  };

  const hasAnyAvailableSlot = slots.some((s) => s.is_available);

  return (
    <div style={{ marginTop: "10px" }}>
      {availabilityNotice && (
        <div
          data-testid="availability-notice"
          style={{
            background: "var(--am2)",
            color: "var(--am)",
            padding: "8px 12px",
            borderRadius: "10px",
            fontSize: "13px",
            marginBottom: "12px",
            border: "1px solid var(--am)",
          }}
        >
          {availabilityNotice}
        </div>
      )}

      {/* Main container: stacks on mobile, 2 columns side-by-side on desktop */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* ================= COLUMN 1: FULL MONTH CALENDAR ================= */}
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--ln)",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          {/* Month Header & Prev/Next Arrows */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <b style={{ fontSize: "15px", letterSpacing: "-0.01em" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </b>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                aria-label="Previous Month"
                disabled={isPrevDisabled}
                onClick={handlePrevMonth}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  border: "1px solid var(--ln)",
                  background: isPrevDisabled ? "transparent" : "var(--cd)",
                  cursor: isPrevDisabled ? "not-allowed" : "pointer",
                  opacity: isPrevDisabled ? 0.3 : 1,
                  display: "grid",
                  placeItems: "center",
                  fontSize: "16px",
                  color: "var(--tx)",
                }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next Month"
                disabled={isNextDisabled}
                onClick={handleNextMonth}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  border: "1px solid var(--ln)",
                  background: isNextDisabled ? "transparent" : "var(--cd)",
                  cursor: isNextDisabled ? "not-allowed" : "pointer",
                  opacity: isNextDisabled ? 0.3 : 1,
                  display: "grid",
                  placeItems: "center",
                  fontSize: "16px",
                  color: "var(--tx)",
                }}
              >
                ›
              </button>
            </div>
          </div>

          {/* Weekday Labels (Mon -> Sun) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              marginBottom: "6px",
            }}
          >
            {WEEKDAYS.map((w) => (
              <span
                key={w}
                style={{
                  fontSize: "12px",
                  color: "var(--mu)",
                  fontWeight: 600,
                  padding: "4px 0",
                }}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
            }}
          >
            {/* Blank offset cells */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`offset-${i}`} style={{ height: "44px" }} />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateIso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isPast = dateIso < todayIso;
              const isBeyond = dateIso > horizonIso;
              const isDisabled = isPast || isBeyond;
              const isSelected = dateIso === selectedDate;
              const isToday = dateIso === todayIso;

              return (
                <button
                  key={dateIso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectDate(dateIso)}
                  data-date={dateIso}
                  data-testid={`calendar-day-${dateIso}`}
                  style={{
                    height: "44px",
                    minWidth: "36px",
                    borderRadius: "10px",
                    border: isSelected
                      ? "1.5px solid var(--g)"
                      : isToday
                      ? "1px dashed var(--g)"
                      : "1px solid transparent",
                    background: isSelected
                      ? "var(--g)"
                      : isToday
                      ? "var(--g2)"
                      : "transparent",
                    color: isSelected
                      ? "#ffffff"
                      : isDisabled
                      ? "var(--mu)"
                      : "var(--tx)",
                    opacity: isDisabled ? 0.35 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    fontWeight: isSelected || isToday ? 600 : 500,
                    fontSize: "13px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1px",
                    padding: "2px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{dayNum}</span>
                  {isToday && (
                    <span
                      style={{
                        fontSize: "9px",
                        lineHeight: "1",
                        fontWeight: 700,
                        color: isSelected ? "#ffffff" : "var(--g)",
                      }}
                    >
                      Today
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= COLUMN 2: TIME SLOTS ================= */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <label style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>
              Time slot
            </label>
            {loading && (
              <span className="mu sm" style={{ fontSize: "12px" }}>
                Checking availability...
              </span>
            )}
          </div>

          {error && (
            <div
              style={{
                background: "var(--am2)",
                color: "var(--am)",
                padding: "10px 12px",
                borderRadius: "10px",
                fontSize: "12px",
                marginBottom: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{error}</span>
              <button
                type="button"
                className="btn o s"
                style={{ fontSize: "11px", padding: "4px 8px" }}
                onClick={() => loadSlots(selectedDate, packageId)}
              >
                Retry
              </button>
            </div>
          )}

          {/* Slots List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {slots.map((slot) => {
              const isSelected = selectedSlot === slot.slot_start;
              const isAvailable = slot.is_available;
              const isPast = slot.is_past;

              let badgeText = "Available";
              let badgeColor = "var(--g)";
              let badgeBg = "var(--g2)";

              if (isPast) {
                badgeText = "Passed";
                badgeColor = "var(--mu)";
                badgeBg = "var(--ln)";
              } else if (!isAvailable) {
                badgeText = "Full";
                badgeColor = "var(--rd)";
                badgeBg = "rgba(184, 58, 46, 0.12)";
              }

              const formattedStart = formatTime12(slot.slot_start);
              const formattedEnd = formatTime12(slot.end_time);

              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => onSelectSlot(slot.slot_start, slot.end_time)}
                  data-testid={`slot-${slot.slot_start}`}
                  style={{
                    minHeight: "48px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    border: isSelected
                      ? "1.5px solid var(--g)"
                      : "1px solid var(--ln)",
                    background: isSelected
                      ? "var(--g2)"
                      : !isAvailable
                      ? "var(--bg)"
                      : "var(--cd)",
                    opacity: !isAvailable ? 0.6 : 1,
                    cursor: !isAvailable ? "not-allowed" : "pointer",
                    color: "var(--tx)",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>
                      {formattedStart} to {formattedEnd}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "999px",
                      background: badgeBg,
                      color: badgeColor,
                    }}
                  >
                    {badgeText}
                  </span>
                </button>
              );
            })}
          </div>

          {/* If no available slots on this date */}
          {!loading && !hasAnyAvailableSlot && (
            <div
              style={{
                marginTop: "14px",
                padding: "14px",
                background: "var(--bg)",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px solid var(--ln)",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "4px", color: "var(--tx)" }}>
                No slots available on this date
              </div>
              <p className="mu sm" style={{ margin: "0 0 10px" }}>
                All slots for this day are fully booked or have passed.
              </p>
              <button
                type="button"
                className="btn o s"
                onClick={handleJumpNextDay}
                style={{ minHeight: "36px" }}
              >
                Check Next Available Date →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
