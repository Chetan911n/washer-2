-- ==============================================================================
-- AppWasher Admin Helper: Create or Assign Staff (Station Head / Field Washer)
-- ==============================================================================
-- Run this in the Supabase Dashboard SQL Editor (or psql) as postgres / service_role.
-- It safely sets up or updates a staff member's role and assigned station.

CREATE OR REPLACE FUNCTION public.admin_set_staff_role(
  p_phone TEXT,
  p_name TEXT,
  p_role TEXT,        -- 'station_head' or 'washer'
  p_station_id TEXT   -- e.g. 'green_valley'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_station_exists BOOLEAN;
BEGIN
  -- Validate role
  IF p_role NOT IN ('station_head', 'washer') THEN
    RAISE EXCEPTION 'Invalid staff role: %. Must be either station_head or washer.', p_role;
  END IF;

  -- Validate station
  SELECT EXISTS(SELECT 1 FROM public.stations WHERE id = p_station_id) INTO v_station_exists;
  IF NOT v_station_exists THEN
    RAISE EXCEPTION 'Station % does not exist.', p_station_id;
  END IF;

  -- Look up user by phone in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE phone = p_phone LIMIT 1;

  IF v_user_id IS NULL THEN
    -- If user has not signed up yet, instruct or create auth placeholder
    RAISE NOTICE 'User with phone % has not signed up yet. Ask the user to sign in once with WhatsApp OTP, then re-run this function, or create the auth user first.', p_phone;
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found in auth.users. They must log in once with their phone number first, or be created via admin API.'
    );
  END IF;

  -- Update profile with staff role and station
  UPDATE public.profiles
  SET 
    role = p_role,
    station_id = p_station_id,
    name = COALESCE(NULLIF(p_name, ''), name),
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'phone', p_phone,
    'role', p_role,
    'station_id', p_station_id,
    'message', format('Staff profile updated: %s assigned as %s for station %s', p_phone, p_role, p_station_id)
  );
END;
$$;

-- Grant execution only to service_role / postgres
REVOKE EXECUTE ON FUNCTION public.admin_set_staff_role(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_role(TEXT, TEXT, TEXT, TEXT) TO service_role, postgres;

-- -----------------------------------------------------------------------------
-- Example Usage:
-- -----------------------------------------------------------------------------
-- 1. Assign a Station Head:
-- SELECT public.admin_set_staff_role('+919876543210', 'Vikram Singh', 'station_head', 'green_valley');
--
-- 2. Assign a Field Washer:
-- SELECT public.admin_set_staff_role('+919876543211', 'Rajesh Kumar', 'washer', 'green_valley');
