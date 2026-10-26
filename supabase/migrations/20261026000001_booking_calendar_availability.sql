-- ==============================================================================
-- Migration: Booking Calendar & Live Time-Slot Availability
-- ==============================================================================
-- 1. Adds duration_minutes to packages (ext: 45m, deep: 75m, prem: 120m).
--    (Defaults for owner confirmation, not final business rules).
-- 2. Configures booking_horizon_days (30) and timezone ('Asia/Kolkata').
-- 3. Creates booking_slots table and settings entry.
-- 4. Replaces UTC-based date check with Asia/Kolkata timezone awareness.
-- 5. Implements get_available_slots() with washer-based capacity (2 * washers).
-- 6. Hardens create_booking() with race-safe transaction locking.
-- ==============================================================================

-- 1. Duration minutes on packages
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 45;

-- Defaults for the owner to confirm, not final business rules:
UPDATE public.packages SET duration_minutes = 45 WHERE id = 'ext';
UPDATE public.packages SET duration_minutes = 75 WHERE id = 'deep';
UPDATE public.packages SET duration_minutes = 120 WHERE id = 'prem';

-- 2. Settings: horizon, timezone, and slots
INSERT INTO public.settings (key, value) VALUES
  ('booking_horizon_days', '30'::jsonb),
  ('timezone', '"Asia/Kolkata"'::jsonb),
  ('booking_slots', '["06:30", "08:30", "15:00", "17:00"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Dedicated booking_slots table (read from table / settings, not from code)
CREATE TABLE IF NOT EXISTS public.booking_slots (
  slot_start TEXT PRIMARY KEY,
  display_order INTEGER NOT NULL
);

INSERT INTO public.booking_slots (slot_start, display_order) VALUES
  ('06:30', 1),
  ('08:30', 2),
  ('15:00', 3),
  ('17:00', 4)
ON CONFLICT (slot_start) DO UPDATE SET display_order = EXCLUDED.display_order;

-- 4. Replace UTC-based check constraint on scheduled_date
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_scheduled_date_check;

-- Trigger to validate scheduled_date using Asia/Kolkata timezone
CREATE OR REPLACE FUNCTION public.check_scheduled_date_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz TEXT;
  v_today DATE;
BEGIN
  SELECT COALESCE(value #>> '{}', 'Asia/Kolkata') INTO v_tz
  FROM public.settings WHERE key = 'timezone';
  IF v_tz IS NULL OR v_tz = '' THEN v_tz := 'Asia/Kolkata'; END IF;

  v_today := (now() AT TIME ZONE v_tz)::date;

  IF NEW.scheduled_date < v_today THEN
    RAISE EXCEPTION 'Scheduled date cannot be in the past.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_scheduled_date ON public.bookings;
CREATE TRIGGER trg_validate_scheduled_date
BEFORE INSERT OR UPDATE OF scheduled_date ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.check_scheduled_date_timezone();

-- 5. get_available_slots() function
-- Returns slot availability for a given station, date, and package
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_station_id TEXT,
  p_date DATE,
  p_package_id TEXT
)
RETURNS TABLE (
  slot_start TEXT,
  end_time TEXT,
  is_available BOOLEAN,
  is_past BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz TEXT;
  v_horizon_days INTEGER;
  v_capacity_per_washer INTEGER;
  v_now_tz TIMESTAMP;
  v_today_tz DATE;
  v_current_time_tz TEXT;
  v_duration INTEGER;
  v_washer_count INTEGER;
  v_slot_capacity INTEGER;
  v_active_count INTEGER;
  r_slot RECORD;
  v_is_past BOOLEAN;
  v_is_available BOOLEAN;
  v_end_time TEXT;
BEGIN
  -- Read settings
  SELECT COALESCE(value #>> '{}', 'Asia/Kolkata') INTO v_tz
  FROM public.settings WHERE key = 'timezone';
  IF v_tz IS NULL OR v_tz = '' THEN v_tz := 'Asia/Kolkata'; END IF;

  SELECT COALESCE((value)::int, 30) INTO v_horizon_days
  FROM public.settings WHERE key = 'booking_horizon_days';
  IF v_horizon_days IS NULL THEN v_horizon_days := 30; END IF;

  SELECT COALESCE((value)::int, 2) INTO v_capacity_per_washer
  FROM public.settings WHERE key = 'washer_slot_capacity';
  IF v_capacity_per_washer IS NULL THEN v_capacity_per_washer := 2; END IF;

  -- Time calculations in configured timezone
  v_now_tz := now() AT TIME ZONE v_tz;
  v_today_tz := v_now_tz::date;
  v_current_time_tz := to_char(v_now_tz, 'HH24:MI');

  -- Return nothing for dates outside [today, today + booking_horizon_days]
  IF p_date < v_today_tz OR p_date > (v_today_tz + v_horizon_days) THEN
    RETURN;
  END IF;

  -- Duration from packages table
  SELECT duration_minutes INTO v_duration
  FROM public.packages
  WHERE id = p_package_id;
  IF v_duration IS NULL THEN
    v_duration := 45;
  END IF;

  -- Active washers for the station
  SELECT COUNT(*) INTO v_washer_count
  FROM public.profiles
  WHERE role = 'washer' AND station_id = p_station_id;

  v_slot_capacity := v_washer_count * v_capacity_per_washer;

  -- Iterate through defined booking slots
  FOR r_slot IN 
    SELECT s.slot_start 
    FROM public.booking_slots s 
    ORDER BY s.display_order ASC 
  LOOP
    -- Calculate end_time (slot_start plus duration)
    v_end_time := to_char(r_slot.slot_start::time + (v_duration || ' minutes')::interval, 'HH24:MI');

    -- Past check: date is today and slot start has passed in Asia/Kolkata
    IF p_date = v_today_tz AND r_slot.slot_start <= v_current_time_tz THEN
      v_is_past := true;
    ELSE
      v_is_past := false;
    END IF;

    -- Count active bookings (not cancelled and not paid)
    SELECT COUNT(*) INTO v_active_count
    FROM public.bookings b
    WHERE b.station_id = p_station_id
      AND b.scheduled_date = p_date
      AND b.slot_start = r_slot.slot_start
      AND b.status NOT IN ('cancelled', 'paid');

    -- Availability rule
    IF NOT v_is_past AND v_active_count < v_slot_capacity THEN
      v_is_available := true;
    ELSE
      v_is_available := false;
    END IF;

    slot_start := r_slot.slot_start;
    end_time := v_end_time;
    is_available := v_is_available;
    is_past := v_is_past;

    RETURN NEXT;
  END LOOP;
END;
$$;

-- Grant execution to authenticated, anon, and service roles
REVOKE EXECUTE ON FUNCTION public.get_available_slots(TEXT, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(TEXT, DATE, TEXT) TO authenticated, anon, service_role, postgres;

-- 6. Update create_booking() with race-safe transaction locking and live availability checks
CREATE OR REPLACE FUNCTION public.create_booking(
  p_car_ids TEXT[],
  p_package_id TEXT,
  p_scheduled_date DATE,
  p_slot_start TEXT,
  p_parking_spot_id TEXT,
  p_station_id TEXT DEFAULT 'green_valley'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_booking_id TEXT;
  v_attempt INTEGER := 0;
  v_car_id TEXT;
  v_car RECORD;
  v_price INTEGER;
  v_total_inr INTEGER := 0;
  v_pkg_exists BOOLEAN;
  v_station_exists BOOLEAN;
  v_spot_valid BOOLEAN;
  v_tz TEXT;
  v_horizon_days INTEGER;
  v_capacity_per_washer INTEGER;
  v_now_tz TIMESTAMP;
  v_today_tz DATE;
  v_current_time_tz TEXT;
  v_washer_count INTEGER;
  v_slot_capacity INTEGER;
  v_active_count INTEGER;
  v_slot_valid BOOLEAN;
BEGIN
  -- Authenticated user validation
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Only registered users can create bookings.';
  END IF;

  -- Validate inputs
  IF p_car_ids IS NULL OR array_length(p_car_ids, 1) IS NULL OR array_length(p_car_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one car must be selected for booking.';
  END IF;

  -- Load configuration settings
  SELECT COALESCE(value #>> '{}', 'Asia/Kolkata') INTO v_tz
  FROM public.settings WHERE key = 'timezone';
  IF v_tz IS NULL OR v_tz = '' THEN v_tz := 'Asia/Kolkata'; END IF;

  SELECT COALESCE((value)::int, 30) INTO v_horizon_days
  FROM public.settings WHERE key = 'booking_horizon_days';
  IF v_horizon_days IS NULL THEN v_horizon_days := 30; END IF;

  SELECT COALESCE((value)::int, 2) INTO v_capacity_per_washer
  FROM public.settings WHERE key = 'washer_slot_capacity';
  IF v_capacity_per_washer IS NULL THEN v_capacity_per_washer := 2; END IF;

  -- Time calculations in configured timezone
  v_now_tz := now() AT TIME ZONE v_tz;
  v_today_tz := v_now_tz::date;
  v_current_time_tz := to_char(v_now_tz, 'HH24:MI');

  -- Date horizon checks in configured timezone
  IF p_scheduled_date < v_today_tz THEN
    RAISE EXCEPTION 'Scheduled date cannot be in the past.';
  END IF;

  IF p_scheduled_date > (v_today_tz + v_horizon_days) THEN
    RAISE EXCEPTION 'Scheduled date % exceeds the booking horizon of % days.', p_scheduled_date, v_horizon_days;
  END IF;

  -- Slot existence check
  SELECT EXISTS(
    SELECT 1 FROM public.booking_slots WHERE slot_start = p_slot_start
  ) INTO v_slot_valid;
  IF NOT v_slot_valid THEN
    RAISE EXCEPTION 'Invalid slot: must be one of 06:30, 08:30, 15:00, 17:00.';
  END IF;

  -- Past slot check for today
  IF p_scheduled_date = v_today_tz AND p_slot_start <= v_current_time_tz THEN
    RAISE EXCEPTION 'Slot % has already passed for today.', p_slot_start;
  END IF;

  -- Validate station
  SELECT EXISTS(SELECT 1 FROM public.stations WHERE id = p_station_id) INTO v_station_exists;
  IF NOT v_station_exists THEN
    RAISE EXCEPTION 'Invalid station id: %', p_station_id;
  END IF;

  -- Validate parking spot ownership
  SELECT EXISTS(
    SELECT 1 FROM public.parking_spots 
    WHERE id = p_parking_spot_id AND owner_id = v_uid
  ) INTO v_spot_valid;
  IF NOT v_spot_valid THEN
    RAISE EXCEPTION 'Parking spot not found or does not belong to you.';
  END IF;

  -- Validate package exists
  SELECT EXISTS(SELECT 1 FROM public.packages WHERE id = p_package_id) INTO v_pkg_exists;
  IF NOT v_pkg_exists THEN
    RAISE EXCEPTION 'Invalid package id: %', p_package_id;
  END IF;

  -- RACE-SAFE CONCURRENCY LOCK:
  -- Lock the specific station, date, and slot for this transaction
  -- This guarantees atomic count verification and prevents race condition overbooking
  PERFORM pg_advisory_xact_lock(
    hashtext(p_station_id),
    hashtext(p_scheduled_date::text || ':' || p_slot_start)
  );

  -- Capacity enforcement
  SELECT COUNT(*) INTO v_washer_count
  FROM public.profiles
  WHERE role = 'washer' AND station_id = p_station_id;

  v_slot_capacity := v_washer_count * v_capacity_per_washer;

  SELECT COUNT(*) INTO v_active_count
  FROM public.bookings b
  WHERE b.station_id = p_station_id
    AND b.scheduled_date = p_scheduled_date
    AND b.slot_start = p_slot_start
    AND b.status NOT IN ('cancelled', 'paid');

  IF v_active_count >= v_slot_capacity THEN
    RAISE EXCEPTION 'Slot % on % is full for this station. Maximum capacity reached.', p_slot_start, p_scheduled_date;
  END IF;

  -- Generate human-readable booking ID (e.g. AW5246)
  LOOP
    v_attempt := v_attempt + 1;
    v_booking_id := 'AW' || (floor(1000 + random() * 9000))::TEXT;
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.bookings WHERE id = v_booking_id);
    IF v_attempt > 100 THEN
      RAISE EXCEPTION 'Could not generate unique booking code. Please try again.';
    END IF;
  END LOOP;

  -- Validate cars and compute price snapshot
  FOR v_car_id IN SELECT unnest(p_car_ids)
  LOOP
    SELECT * INTO v_car FROM public.cars WHERE id = v_car_id AND owner_id = v_uid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Car % not found or does not belong to you.', v_car_id;
    END IF;

    SELECT price_inr INTO v_price 
    FROM public.package_prices 
    WHERE package_id = p_package_id AND car_type = v_car.car_type;

    IF v_price IS NULL THEN
      RAISE EXCEPTION 'Price not configured for package % and car type %.', p_package_id, v_car.car_type;
    END IF;

    v_total_inr := v_total_inr + v_price;
  END LOOP;

  -- Insert booking
  INSERT INTO public.bookings (
    id, customer_id, station_id, parking_spot_id, package_id, 
    scheduled_date, slot_start, status, total_inr
  ) VALUES (
    v_booking_id, v_uid, p_station_id, p_parking_spot_id, p_package_id,
    p_scheduled_date, p_slot_start, 'pending', v_total_inr
  );

  -- Insert booking cars with snapshots
  FOR v_car_id IN SELECT unnest(p_car_ids)
  LOOP
    SELECT * INTO v_car FROM public.cars WHERE id = v_car_id;
    SELECT price_inr INTO v_price 
    FROM public.package_prices 
    WHERE package_id = p_package_id AND car_type = v_car.car_type;

    INSERT INTO public.booking_cars (
      booking_id, car_id, car_type_snapshot, price_inr_snapshot
    ) VALUES (
      v_booking_id, v_car_id, v_car.car_type, v_price
    );
  END LOOP;

  DECLARE
    v_result JSONB;
  BEGIN
    SELECT row_to_json(b)::jsonb INTO v_result 
    FROM public.bookings b 
    WHERE b.id = v_booking_id;

    RETURN v_result;
  END;
END;
$$;
