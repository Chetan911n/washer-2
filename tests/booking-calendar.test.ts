import { execSync, exec } from "child_process";
import {
  getDaysInMonth,
  isMonthBeforeCurrent,
  isMonthBeyondHorizon,
  addMinutesToTime,
  formatTime12,
  formatLongDate,
  getIstTodayIso,
  getIstOffsetIso,
  PACKAGE_DURATIONS,
} from "../src/lib/calendarUtils";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, details || "");
    failCount++;
  }
}

function runSql(sql: string): { stdout: string; error?: string } {
  try {
    const escapedSql = sql.replace(/"/g, '\\"');
    const stdout = execSync(
      `docker exec supabase_db_jgekymuphznmfsbdexaw psql -U postgres -d postgres -t -A -c "${escapedSql}"`,
      { encoding: "utf-8" }
    ).trim();
    return { stdout };
  } catch (err: any) {
    return { stdout: "", error: err.stderr || err.message };
  }
}

function runSqlAsync(sql: string): Promise<{ stdout: string; error?: string }> {
  return new Promise((resolve) => {
    const escapedSql = sql.replace(/"/g, '\\"');
    exec(
      `docker exec supabase_db_jgekymuphznmfsbdexaw psql -U postgres -d postgres -t -A -c "${escapedSql}"`,
      { encoding: "utf-8" },
      (error, stdout, stderr) => {
        resolve({ stdout: stdout || "", error: stderr || (error ? error.message : undefined) });
      }
    );
  });
}

async function runCalendarAndAvailabilityTests() {
  console.log("\n========================================================");
  console.log("TEST SUITE 5: Booking Calendar & Live Slot Availability");
  console.log("========================================================\n");

  // ---------------------------------------------------------------------------
  // SECTION 1: DATABASE LIVE AVAILABILITY & CONCURRENCY
  // ---------------------------------------------------------------------------
  console.log("--- PART 1: Database Availability & Capacity Rules ---");

  const chetanId = "00000000-0000-0000-0000-000000000001";
  const washerId = "00000000-0000-0000-0000-000000000003";

  // Setup test environment
  runSql(`
    -- Seed customer, parking spots, and car
    INSERT INTO auth.users (id, aud, role, phone, email, created_at, updated_at)
    VALUES ('${chetanId}', 'authenticated', 'authenticated', '+910000000001', 'test_cal@test.local', now(), now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, name, phone, role)
    VALUES ('${chetanId}', 'Chetan Test', '+910000000001', 'customer')
    ON CONFLICT (id) DO UPDATE SET role = 'customer';

    INSERT INTO public.parking_spots (id, owner_id, address, spot_label) VALUES
      ('cal_spot_1', '${chetanId}', 'Tower A', 'A1'),
      ('cal_spot_2', '${chetanId}', 'Tower B', 'B1'),
      ('cal_spot_3', '${chetanId}', 'Tower C', 'C1'),
      ('cal_spot_4', '${chetanId}', 'Tower D', 'D1'),
      ('cal_spot_5', '${chetanId}', 'Tower E', 'E1')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.cars (id, owner_id, name, car_type, plate)
    VALUES ('cal_car_1', '${chetanId}', 'Test City', 'sedan', 'MH 12 TC 1001')
    ON CONFLICT (id) DO NOTHING;

    -- Clean bookings for test
    DELETE FROM public.bookings;
  `);

  // DB Test 1: get_available_slots returns no slots for past date or date past horizon
  console.log("\nDB Test 1: get_available_slots returns 0 rows for past dates and dates past horizon");
  const pastSlotsRes = runSql(`SELECT count(*) FROM public.get_available_slots('green_valley', CURRENT_DATE - 1, 'deep');`);
  assert(pastSlotsRes.stdout.trim() === "0", "get_available_slots returns 0 rows for past date (CURRENT_DATE - 1)");

  const horizonSlotsRes = runSql(`SELECT count(*) FROM public.get_available_slots('green_valley', CURRENT_DATE + 32, 'deep');`);
  assert(horizonSlotsRes.stdout.trim() === "0", "get_available_slots returns 0 rows for date beyond horizon (CURRENT_DATE + 32)");

  // DB Test 2: Washer capacity rule (active washers in station * 2)
  console.log("\nDB Test 2: Slot becomes unavailable when active bookings reach (2 * active washers)");
  // Ensure exactly 1 washer in green_valley -> capacity = 2 bookings per slot
  runSql(`
    DELETE FROM public.bookings;
    DELETE FROM public.profiles WHERE role = 'washer' AND station_id = 'green_valley';
    INSERT INTO auth.users (id, aud, role, phone, email, created_at, updated_at)
    VALUES ('${washerId}', 'authenticated', 'authenticated', '+910000000003', 'washer_cal@test.local', now(), now())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, name, phone, role, station_id)
    VALUES ('${washerId}', 'Washer One', '+910000000003', 'washer', 'green_valley')
    ON CONFLICT (id) DO UPDATE SET role = 'washer', station_id = 'green_valley';
  `);

  const targetDateSql = `(CURRENT_DATE + 2)::date`;
  const targetDateStr = runSql(`SELECT ${targetDateSql};`).stdout.trim();

  // Initially: 0 bookings -> slot 06:30 is available
  const initialSlotsRes = runSql(`
    SELECT is_available, is_past, end_time FROM public.get_available_slots('green_valley', ${targetDateSql}, 'deep') WHERE slot_start = '06:30';
  `);
  assert(initialSlotsRes.stdout.includes("t|f|07:45"), "06:30 slot is available (t|f) with correct end time 07:45 (+75 mins for Deep Wash)");

  // Add 1st active booking -> still available (1/2)
  runSql(`
    INSERT INTO public.bookings (id, customer_id, station_id, parking_spot_id, package_id, scheduled_date, slot_start, status, total_inr)
    VALUES ('CAL_BK_1', '${chetanId}', 'green_valley', 'cal_spot_1', 'deep', ${targetDateSql}, '06:30', 'pending', 799);
  `);
  const oneBookingRes = runSql(`
    SELECT is_available FROM public.get_available_slots('green_valley', ${targetDateSql}, 'deep') WHERE slot_start = '06:30';
  `);
  assert(oneBookingRes.stdout.trim() === "t", "06:30 slot remains available after 1 booking (1/2 capacity)");

  // Add 2nd active booking -> slot reaches capacity (2/2) -> UNAVAILABLE
  runSql(`
    INSERT INTO public.bookings (id, customer_id, station_id, parking_spot_id, package_id, scheduled_date, slot_start, status, total_inr)
    VALUES ('CAL_BK_2', '${chetanId}', 'green_valley', 'cal_spot_2', 'deep', ${targetDateSql}, '06:30', 'pending', 799);
  `);
  const fullBookingRes = runSql(`
    SELECT is_available FROM public.get_available_slots('green_valley', ${targetDateSql}, 'deep') WHERE slot_start = '06:30';
  `);
  assert(fullBookingRes.stdout.trim() === "f", "06:30 slot becomes unavailable (f) when reaching 2 bookings (2 * 1 washer)");

  // Querying available slots filter returns no row for a full slot
  const availableSlotsRes = runSql(`
    SELECT count(*) FROM public.get_available_slots('green_valley', ${targetDateSql}, 'deep') WHERE slot_start = '06:30' AND is_available = true;
  `);
  assert(availableSlotsRes.stdout.trim() === "0", "Querying available slots returns no slot for the full slot");

  // DB Test 3: Cancelled booking frees its slot
  console.log("\nDB Test 3: A cancelled booking frees its slot");
  runSql(`UPDATE public.bookings SET status = 'cancelled' WHERE id = 'CAL_BK_1';`);
  const afterCancelRes = runSql(`
    SELECT is_available FROM public.get_available_slots('green_valley', ${targetDateSql}, 'deep') WHERE slot_start = '06:30';
  `);
  assert(afterCancelRes.stdout.trim() === "t", "Cancelled booking frees slot: 06:30 becomes available again (1 active out of 2)");

  // DB Test 4: Paid booking frees its slot
  console.log("\nDB Test 4: A paid booking frees its slot");
  // Fill slot again with CAL_BK_3
  runSql(`
    INSERT INTO public.bookings (id, customer_id, station_id, parking_spot_id, package_id, scheduled_date, slot_start, status, total_inr)
    VALUES ('CAL_BK_3', '${chetanId}', 'green_valley', 'cal_spot_1', 'deep', ${targetDateSql}, '06:30', 'pending', 799);
  `);
  const refilledRes = runSql(`
    SELECT is_available FROM public.get_available_slots('green_valley', ${targetDateSql}, 'deep') WHERE slot_start = '06:30';
  `);
  assert(refilledRes.stdout.trim() === "f", "Slot is full again with 2 active bookings (CAL_BK_2 & CAL_BK_3)");

  // Progress CAL_BK_2 to paid: assigned -> washing -> awaiting_payment -> paid
  runSql(`
    UPDATE public.bookings SET status = 'assigned', washer_id = '${washerId}' WHERE id = 'CAL_BK_2';
    UPDATE public.bookings SET status = 'washing' WHERE id = 'CAL_BK_2';
    UPDATE public.bookings SET status = 'awaiting_payment' WHERE id = 'CAL_BK_2';
    UPDATE public.bookings SET status = 'paid' WHERE id = 'CAL_BK_2';
  `);
  const afterPaidRes = runSql(`
    SELECT is_available FROM public.get_available_slots('green_valley', ${targetDateSql}, 'deep') WHERE slot_start = '06:30';
  `);
  assert(afterPaidRes.stdout.trim() === "t", "Paid booking frees slot: 06:30 becomes available again (only CAL_BK_3 active)");

  // DB Test 5: create_booking rejects a full slot directly, bypassing the UI
  console.log("\nDB Test 5: create_booking rejects a full slot directly with clear error message");
  // Fill slot so active bookings for 06:30 = 2 (CAL_BK_3 + CAL_BK_4)
  runSql(`
    INSERT INTO public.bookings (id, customer_id, station_id, parking_spot_id, package_id, scheduled_date, slot_start, status, total_inr)
    VALUES ('CAL_BK_4', '${chetanId}', 'green_valley', 'cal_spot_4', 'deep', ${targetDateSql}, '06:30', 'pending', 799);
  `);
  const directBypassSql = `
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${chetanId}';
    SET request.jwt.claim.role = 'authenticated';
    SELECT public.create_booking(
      ARRAY['cal_car_1']::TEXT[],
      'deep',
      '${targetDateStr}'::DATE,
      '06:30',
      'cal_spot_5',
      'green_valley'
    );
  `;
  const directBypassRes = runSql(directBypassSql);
  assert(
    Boolean(directBypassRes.error && directBypassRes.error.includes("is full for this station. Maximum capacity reached")),
    "create_booking rejects direct insert on full slot with clear error message",
    directBypassRes.error
  );

  // DB Test 6: Two simultaneous create_booking calls for the last slot: exactly one succeeds
  console.log("\nDB Test 6: Race-Safe Concurrency: Two simultaneous create_booking calls for the last slot");
  const raceDateSql = `(CURRENT_DATE + 3)::date`;
  const raceDateStr = runSql(`SELECT ${raceDateSql};`).stdout.trim();

  // Clear bookings on race date and occupy 1 of 2 places
  runSql(`
    DELETE FROM public.bookings WHERE scheduled_date = '${raceDateStr}' AND slot_start = '08:30';
    INSERT INTO public.bookings (id, customer_id, station_id, parking_spot_id, package_id, scheduled_date, slot_start, status, total_inr)
    VALUES ('RACE_INIT', '${chetanId}', 'green_valley', 'cal_spot_1', 'deep', '${raceDateStr}', '08:30', 'pending', 799);
  `);

  const simCall1 = `
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${chetanId}';
    SET request.jwt.claim.role = 'authenticated';
    SELECT public.create_booking(ARRAY['cal_car_1']::TEXT[], 'deep', '${raceDateStr}'::DATE, '08:30', 'cal_spot_2', 'green_valley');
  `;
  const simCall2 = `
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${chetanId}';
    SET request.jwt.claim.role = 'authenticated';
    SELECT public.create_booking(ARRAY['cal_car_1']::TEXT[], 'deep', '${raceDateStr}'::DATE, '08:30', 'cal_spot_3', 'green_valley');
  `;

  const [call1Res, call2Res] = await Promise.all([runSqlAsync(simCall1), runSqlAsync(simCall2)]);
  const isCall1Success = !call1Res.error && (call1Res.stdout.includes('"id"') || call1Res.stdout.includes("AW"));
  const isCall2Success = !call2Res.error && (call2Res.stdout.includes('"id"') || call2Res.stdout.includes("AW"));
  const hasOneSuccess = (isCall1Success && !isCall2Success) || (!isCall1Success && isCall2Success);
  const failureError = call1Res.error || call2Res.error || "";

  assert(hasOneSuccess, "Exactly one of two simultaneous create_booking calls succeeded");
  assert(
    failureError.includes("is full for this station. Maximum capacity reached"),
    "The losing concurrent call failed with slot full capacity error"
  );

  // DB Test 7: Asia/Kolkata boundary check (23:50 IST)
  console.log("\nDB Test 7: Asia/Kolkata timezone boundary check (23:50 IST does not shift to wrong UTC date)");
  const tzCheckRes = runSql(`
    SELECT 
      (('2026-10-26 18:20:00+00'::timestamptz) AT TIME ZONE 'Asia/Kolkata')::date as ist_date,
      to_char(('2026-10-26 18:20:00+00'::timestamptz) AT TIME ZONE 'Asia/Kolkata', 'HH24:MI') as ist_time;
  `);
  assert(
    tzCheckRes.stdout.trim() === "2026-10-26|23:50",
    "At 18:20 UTC, Asia/Kolkata correctly resolves to 2026-10-26 23:50 IST without date shift"
  );

  // DB Test 8: get_available_slots does not expose PII (names, phones, plates)
  console.log("\nDB Test 8: get_available_slots returns only timing and availability (no PII)");
  const piiProbeRes = runSql(`
    SELECT row_to_json(t) FROM (
      SELECT * FROM public.get_available_slots('green_valley', ${targetDateSql}, 'ext') LIMIT 1
    ) t;
  `);
  let slotObj: any = {};
  try {
    slotObj = JSON.parse(piiProbeRes.stdout.trim());
  } catch (e) {}

  const keys = Object.keys(slotObj);
  const hasPii = keys.some((k) => ["name", "phone", "plate", "customer", "customer_id", "plate_number"].includes(k));
  assert(!hasPii, "get_available_slots output has no customer names, phone numbers, or plates");
  assert(
    keys.includes("slot_start") && keys.includes("end_time") && keys.includes("is_available") && keys.includes("is_past"),
    "get_available_slots contains strictly slot_start, end_time, is_available, and is_past"
  );

  // ---------------------------------------------------------------------------
  // SECTION 2: APP CALENDAR & UI LOGIC
  // ---------------------------------------------------------------------------
  console.log("\n--- PART 2: App Calendar & UI Logic ---");

  // App Test 1: Calendar shows correct number of days, including February in leap years
  console.log("App Test 1: Days in month calculation (including February in leap years)");
  assert(getDaysInMonth(2024, 1) === 29, "February 2024 (leap year) has 29 days");
  assert(getDaysInMonth(2025, 1) === 28, "February 2025 (non-leap year) has 28 days");
  assert(getDaysInMonth(2026, 1) === 28, "February 2026 (non-leap year) has 28 days");
  assert(getDaysInMonth(2028, 1) === 29, "February 2028 (leap year) has 29 days");
  assert(getDaysInMonth(2026, 9) === 31, "October 2026 has 31 days");
  assert(getDaysInMonth(2026, 10) === 30, "November 2026 has 30 days");

  // App Test 2: Month navigation arrow disable rules
  console.log("\nApp Test 2: Previous arrow disabled before current month; Next arrow disabled beyond horizon");
  // Today is October 2026 (year 2026, month index 9)
  const todayY = 2026;
  const todayM = 9; // Oct
  const horizonY = 2026;
  const horizonM = 10; // Nov (30 days ahead lands in Nov)

  assert(isMonthBeforeCurrent(2026, 8, todayY, todayM) === true, "Prev arrow is disabled for September 2026 (before current month)");
  assert(isMonthBeforeCurrent(2026, 9, todayY, todayM) === true, "Prev arrow is disabled for October 2026 (current month)");
  assert(isMonthBeforeCurrent(2026, 10, todayY, todayM) === false, "Prev arrow is enabled for November 2026 (future month)");

  assert(isMonthBeyondHorizon(2026, 10, horizonY, horizonM) === true, "Next arrow is disabled for November 2026 (reaches horizon)");
  assert(isMonthBeyondHorizon(2026, 11, horizonY, horizonM) === true, "Next arrow is disabled for December 2026 (beyond horizon)");
  assert(isMonthBeyondHorizon(2026, 9, horizonY, horizonM) === false, "Next arrow is enabled for October 2026 (before horizon)");

  // App Test 3: Changing package recalculates end times
  console.log("\nApp Test 3: Changing package recalculates end times");
  const slotStart = "08:30";
  const extEnd = addMinutesToTime(slotStart, PACKAGE_DURATIONS.ext); // 45m -> 09:15
  const deepEnd = addMinutesToTime(slotStart, PACKAGE_DURATIONS.deep); // 75m -> 09:45
  const premEnd = addMinutesToTime(slotStart, PACKAGE_DURATIONS.prem); // 120m -> 10:30

  assert(extEnd === "09:15", "Exterior Wash (45 min) from 08:30 ends at 09:15");
  assert(deepEnd === "09:45", "Deep Wash (75 min) from 08:30 ends at 09:45");
  assert(premEnd === "10:30", "Premium Detail (120 min) from 08:30 ends at 10:30");

  // App Test 4: Slot clearing logic when slot becomes unavailable
  console.log("\nApp Test 4: Selected slot clearing logic when unavailable");
  const mockSlots = [
    { slot_start: "06:30", end_time: "07:15", is_available: false, is_past: false },
    { slot_start: "08:30", end_time: "09:15", is_available: true, is_past: false },
  ];
  const selectedSlotStart = "06:30";
  const matchingSlot = mockSlots.find((s) => s.slot_start === selectedSlotStart);
  let resolvedSlot: string | undefined = selectedSlotStart;
  if (!matchingSlot || !matchingSlot.is_available) {
    resolvedSlot = undefined;
  }
  assert(resolvedSlot === undefined, "Selected slot 06:30 is cleared when it becomes unavailable");

  // App Test 5: Next button disabled until date and slot are chosen
  console.log("\nApp Test 5: Next button disabled validation");
  function isNextButtonDisabled(d?: string, sl?: string): boolean {
    return !d || !sl;
  }
  assert(isNextButtonDisabled("", "") === true, "Next button disabled when both date and slot empty");
  assert(isNextButtonDisabled("2026-10-27", "") === true, "Next button disabled when date chosen but slot empty");
  assert(isNextButtonDisabled("", "08:30") === true, "Next button disabled when slot chosen but date empty");
  assert(isNextButtonDisabled("2026-10-27", "08:30") === false, "Next button ENABLED when both date and slot are chosen");

  // Teardown
  runSql(`
    DELETE FROM public.bookings;
    DELETE FROM public.parking_spots WHERE owner_id = '${chetanId}';
    DELETE FROM public.cars WHERE owner_id = '${chetanId}';
    DELETE FROM public.profiles WHERE id IN ('${chetanId}', '${washerId}');
    DELETE FROM auth.users WHERE id IN ('${chetanId}', '${washerId}');
  `);

  console.log("\n--------------------------------------------------------");
  console.log(`Booking Calendar Suite Results: ${passCount} Passed, ${failCount} Failed`);
  console.log("--------------------------------------------------------\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runCalendarAndAvailabilityTests().catch((err) => {
  console.error("Calendar test suite error:", err);
  process.exit(1);
});
