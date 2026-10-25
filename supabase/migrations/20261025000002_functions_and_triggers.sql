-- Migration 2: Database Functions, Triggers, and Status Flow Enforcement
-- AppWasher Platform: State machine, washer capacity guard, security definer business functions

-- 1. Helper functions for role and station lookup
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_station()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT station_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Status flow enforcement trigger
-- pending → assigned → washing → awaiting_payment → paid. 
-- Customer can cancel only before washing starts. Station head can cancel before paid. No other transitions.
CREATE OR REPLACE FUNCTION public.enforce_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_uid UUID;
BEGIN
  -- If status is not changing, proceed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Terminal states cannot transition to anything
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot modify status of an already cancelled booking.';
  END IF;
  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION 'Cannot modify status of an already paid booking.';
  END IF;

  -- Handle cancellation transition
  IF NEW.status = 'cancelled' THEN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
      v_user_role := public.my_role();
      -- Customer rule: can only cancel before washing starts
      IF v_user_role = 'customer' AND OLD.status NOT IN ('pending', 'assigned') THEN
        RAISE EXCEPTION 'Customer cannot cancel booking once washing has started.';
      END IF;
      -- Station head can cancel any time before paid (already guaranteed since OLD.status != 'paid')
    END IF;

    NEW.cancelled_at := COALESCE(NEW.cancelled_at, timezone('utc', now()));
    RETURN NEW;
  END IF;

  -- Forward flow transitions
  IF OLD.status = 'pending' AND NEW.status != 'assigned' THEN
    RAISE EXCEPTION 'Invalid status transition: pending booking can only move to assigned or cancelled.';
  ELSIF OLD.status = 'assigned' AND NEW.status != 'washing' THEN
    RAISE EXCEPTION 'Invalid status transition: assigned booking can only move to washing or cancelled.';
  ELSIF OLD.status = 'washing' AND NEW.status != 'awaiting_payment' THEN
    RAISE EXCEPTION 'Invalid status transition: washing booking can only move to awaiting_payment or cancelled.';
  ELSIF OLD.status = 'awaiting_payment' AND NEW.status != 'paid' THEN
    RAISE EXCEPTION 'Invalid status transition: awaiting_payment booking can only move to paid or cancelled.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_booking_status ON public.bookings;
CREATE TRIGGER trg_enforce_booking_status
BEFORE UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_booking_status_transition();

-- 3. Washer slot capacity enforcement
-- A washer can hold at most 2 active bookings per date and slot.
CREATE OR REPLACE FUNCTION public.enforce_washer_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity INTEGER := 2;
  v_active_count INTEGER;
BEGIN
  -- Only validate if washer_id is present and status is not cancelled
  IF NEW.washer_id IS NULL OR NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Read configured capacity from settings
  SELECT COALESCE((value)::int, 2) INTO v_capacity
  FROM public.settings
  WHERE key = 'washer_slot_capacity';

  -- Count existing active bookings for this washer at the given date and slot
  SELECT COUNT(*) INTO v_active_count
  FROM public.bookings
  WHERE washer_id = NEW.washer_id
    AND scheduled_date = NEW.scheduled_date
    AND slot_start = NEW.slot_start
    AND status NOT IN ('cancelled', 'paid')
    AND id != COALESCE(NEW.id, '');

  IF v_active_count >= v_capacity THEN
    RAISE EXCEPTION 'Washer has reached maximum capacity of % active bookings for slot % on %.',
      v_capacity, NEW.slot_start, NEW.scheduled_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_washer_capacity ON public.bookings;
CREATE TRIGGER trg_enforce_washer_capacity
BEFORE INSERT OR UPDATE OF washer_id, scheduled_date, slot_start, status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_washer_capacity();

-- 4. Business Functions (Security Definer)

-- a) create_booking
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
  v_total_inr INTEGER := 0;
  v_car RECORD;
  v_price INTEGER;
  v_result JSONB;
  v_pkg_exists BOOLEAN;
  v_spot_valid BOOLEAN;
  v_station_exists BOOLEAN;
  v_car_id TEXT;
  v_attempt INTEGER := 0;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User must be signed in to create a booking.';
  END IF;

  -- Validate inputs
  IF p_car_ids IS NULL OR array_length(p_car_ids, 1) IS NULL OR array_length(p_car_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one car must be selected for booking.';
  END IF;

  IF p_scheduled_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Scheduled date cannot be in the past.';
  END IF;

  IF p_slot_start NOT IN ('06:30', '08:30', '15:00', '17:00') THEN
    RAISE EXCEPTION 'Invalid slot: must be one of 06:30, 08:30, 15:00, 17:00.';
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
      v_booking_id, v_car.id, v_car.car_type, v_price
    );
  END LOOP;

  SELECT row_to_json(b)::jsonb INTO v_result 
  FROM public.bookings b 
  WHERE b.id = v_booking_id;

  RETURN v_result;
END;
$$;

-- b) assign_washer
CREATE OR REPLACE FUNCTION public.assign_washer(
  p_booking_id TEXT,
  p_washer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_station TEXT;
  v_booking RECORD;
  v_washer RECORD;
  v_result JSONB;
BEGIN
  v_caller_role := public.my_role();
  v_caller_station := public.my_station();

  IF v_caller_role != 'station_head' THEN
    RAISE EXCEPTION 'Only station heads can assign washers.';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  IF v_booking.station_id != v_caller_station THEN
    RAISE EXCEPTION 'Cannot manage booking from another station.';
  END IF;

  IF v_booking.status NOT IN ('pending', 'assigned') THEN
    RAISE EXCEPTION 'Cannot assign washer to booking in status %.', v_booking.status;
  END IF;

  -- Validate washer exists, has role washer, and belongs to same station
  SELECT * INTO v_washer FROM public.profiles WHERE id = p_washer_id;
  IF NOT FOUND OR v_washer.role != 'washer' OR v_washer.station_id != v_caller_station THEN
    RAISE EXCEPTION 'Invalid washer: must be an active washer at your station.';
  END IF;

  UPDATE public.bookings
  SET washer_id = p_washer_id, status = 'assigned'
  WHERE id = p_booking_id;

  SELECT row_to_json(b)::jsonb INTO v_result 
  FROM public.bookings b 
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

-- c) start_wash
CREATE OR REPLACE FUNCTION public.start_wash(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_before_photo_count INTEGER;
  v_result JSONB;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  IF v_booking.washer_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned washer can start this wash.';
  END IF;

  IF v_booking.status != 'assigned' THEN
    RAISE EXCEPTION 'Wash can only be started when booking is assigned (current status: %).', v_booking.status;
  END IF;

  -- Verify all 4 required before-photos exist: front, rear, left, right
  SELECT COUNT(DISTINCT position) INTO v_before_photo_count
  FROM public.photos
  WHERE booking_id = p_booking_id 
    AND kind = 'before' 
    AND position IN ('front', 'rear', 'left', 'right');

  IF v_before_photo_count < 4 THEN
    RAISE EXCEPTION 'Cannot start wash: all 4 before-wash photos (front, rear, left, right) must be uploaded first.';
  END IF;

  UPDATE public.bookings
  SET status = 'washing'
  WHERE id = p_booking_id;

  SELECT row_to_json(b)::jsonb INTO v_result 
  FROM public.bookings b 
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

-- d) complete_job
CREATE OR REPLACE FUNCTION public.complete_job(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_after_photo_count INTEGER;
  v_result JSONB;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  IF v_booking.washer_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned washer can complete this job.';
  END IF;

  IF v_booking.status != 'washing' THEN
    RAISE EXCEPTION 'Job can only be completed when wash is in progress (current status: %).', v_booking.status;
  END IF;

  -- Verify all 4 required after-photos exist: front, rear, left, right
  SELECT COUNT(DISTINCT position) INTO v_after_photo_count
  FROM public.photos
  WHERE booking_id = p_booking_id 
    AND kind = 'after' 
    AND position IN ('front', 'rear', 'left', 'right');

  IF v_after_photo_count < 4 THEN
    RAISE EXCEPTION 'Cannot complete job: all 4 after-wash photos (front, rear, left, right) must be uploaded first.';
  END IF;

  UPDATE public.bookings
  SET status = 'awaiting_payment'
  WHERE id = p_booking_id;

  SELECT row_to_json(b)::jsonb INTO v_result 
  FROM public.bookings b 
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

-- e) record_cash_payment
CREATE OR REPLACE FUNCTION public.record_cash_payment(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_caller_role TEXT;
  v_caller_station TEXT;
  v_payment_id UUID;
  v_result JSONB;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  v_caller_role := public.my_role();
  v_caller_station := public.my_station();

  -- Allowed: assigned washer OR station head of the station
  IF NOT (
    (v_caller_role = 'washer' AND v_booking.washer_id = auth.uid()) OR
    (v_caller_role = 'station_head' AND v_booking.station_id = v_caller_station)
  ) THEN
    RAISE EXCEPTION 'Unauthorized to record cash payment for this booking.';
  END IF;

  IF v_booking.status != 'awaiting_payment' THEN
    RAISE EXCEPTION 'Cash payment can only be recorded for bookings awaiting payment (current: %).', v_booking.status;
  END IF;

  -- Record confirmed cash payment
  INSERT INTO public.payments (
    booking_id, method, amount_inr, status, confirmed_at
  ) VALUES (
    p_booking_id, 'cash', v_booking.total_inr, 'confirmed', timezone('utc', now())
  ) RETURNING id INTO v_payment_id;

  -- Update booking status to paid
  UPDATE public.bookings
  SET status = 'paid'
  WHERE id = p_booking_id;

  SELECT row_to_json(b)::jsonb INTO v_result 
  FROM public.bookings b 
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

-- f) cancel_booking
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_caller_role TEXT;
  v_caller_station TEXT;
  v_uid UUID;
  v_result JSONB;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized.';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  v_caller_role := public.my_role();
  v_caller_station := public.my_station();

  -- Customer rule
  IF v_booking.customer_id = v_uid THEN
    IF v_booking.status NOT IN ('pending', 'assigned') THEN
      RAISE EXCEPTION 'Customers cannot cancel a booking once washing has started.';
    END IF;
  -- Station head rule
  ELSIF v_caller_role = 'station_head' AND v_booking.station_id = v_caller_station THEN
    IF v_booking.status IN ('paid', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot cancel a booking that is %.', v_booking.status;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized to cancel this booking.';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancelled_at = timezone('utc', now())
  WHERE id = p_booking_id;

  SELECT row_to_json(b)::jsonb INTO v_result 
  FROM public.bookings b 
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

-- g) submit_review
CREATE OR REPLACE FUNCTION public.submit_review(
  p_booking_id TEXT,
  p_rating INTEGER,
  p_tags TEXT[] DEFAULT '{}'::TEXT[],
  p_tip_inr INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_uid UUID;
  v_review RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized.';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id;
  END IF;

  IF v_booking.customer_id != v_uid THEN
    RAISE EXCEPTION 'Only the booking owner can submit a review.';
  END IF;

  IF v_booking.status != 'paid' THEN
    RAISE EXCEPTION 'Reviews can only be submitted for completed and paid bookings.';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5.';
  END IF;

  IF p_tip_inr < 0 THEN
    RAISE EXCEPTION 'Tip amount cannot be negative.';
  END IF;

  INSERT INTO public.reviews (
    booking_id, customer_id, rating, tags, tip_inr
  ) VALUES (
    p_booking_id, v_uid, p_rating, COALESCE(p_tags, '{}'::TEXT[]), p_tip_inr
  ) RETURNING * INTO v_review;

  RETURN row_to_json(v_review)::jsonb;
END;
$$;

-- h) settle_platform_fee
CREATE OR REPLACE FUNCTION public.settle_platform_fee(
  p_station_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_station TEXT;
  v_total_paid INTEGER := 0;
  v_fee_due INTEGER := 0;
  v_already_settled INTEGER := 0;
  v_to_settle INTEGER := 0;
  v_settlement RECORD;
BEGIN
  v_caller_role := public.my_role();
  v_caller_station := public.my_station();

  IF v_caller_role != 'station_head' OR v_caller_station != p_station_id THEN
    RAISE EXCEPTION 'Only the station head of % can settle platform fees.', p_station_id;
  END IF;

  -- 20% platform fee on all paid bookings
  SELECT COALESCE(SUM(total_inr), 0) INTO v_total_paid
  FROM public.bookings
  WHERE station_id = p_station_id AND status = 'paid';

  v_fee_due := floor(v_total_paid * 0.20)::INTEGER;

  SELECT COALESCE(SUM(amount_inr), 0) INTO v_already_settled
  FROM public.settlements
  WHERE station_id = p_station_id;

  v_to_settle := v_fee_due - v_already_settled;

  IF v_to_settle <= 0 THEN
    RETURN jsonb_build_object(
      'status', 'already_settled',
      'station_id', p_station_id,
      'amount_settled', 0,
      'total_fee_due', v_fee_due,
      'total_settled_to_date', v_already_settled
    );
  END IF;

  INSERT INTO public.settlements (
    station_id, amount_inr
  ) VALUES (
    p_station_id, v_to_settle
  ) RETURNING * INTO v_settlement;

  RETURN row_to_json(v_settlement)::jsonb;
END;
$$;

-- 5. Revoke direct UPDATE permissions from client roles on protected tables
REVOKE UPDATE ON public.bookings FROM anon, authenticated;
REVOKE UPDATE ON public.payments FROM anon, authenticated;
REVOKE UPDATE ON public.settlements FROM anon, authenticated;
REVOKE UPDATE ON public.photos FROM anon, authenticated;

-- Grant execution of security definer functions to authenticated
GRANT EXECUTE ON FUNCTION public.my_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.my_station() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(TEXT[], TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_washer(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_wash(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_job(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_cash_payment(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(TEXT, INTEGER, TEXT[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_platform_fee(TEXT) TO authenticated;
