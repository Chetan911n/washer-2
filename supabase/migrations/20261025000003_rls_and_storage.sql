-- Migration 3: Row Level Security (RLS), Storage Setup, Realtime & Auth Triggers
-- AppWasher Platform: Defense-in-depth, bucket isolation, role-based visibility

-- 1. Profile Security & Prevention of Self-Role Escalation
CREATE OR REPLACE FUNCTION public.prevent_profile_role_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.role() = 'authenticated') THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Security violation: Users cannot alter their own role.';
    END IF;
    IF NEW.station_id IS DISTINCT FROM OLD.station_id THEN
      RAISE EXCEPTION 'Security violation: Users cannot alter their station assignment.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_tampering ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_tampering
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_tampering();

-- 2. Auth Trigger: Create Customer Profile on First Sign-in
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_name TEXT;
BEGIN
  v_phone := COALESCE(
    NULLIF(NEW.phone, ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    '+91' || lpad((abs(hashtext(NEW.id::text)) % 10000000000)::text, 10, '0')
  );
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Customer');

  -- If profile already exists by user id, exit
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Default creation: role is customer. Users can never choose their own role.
  INSERT INTO public.profiles (id, role, name, phone, station_id)
  VALUES (
    NEW.id,
    'customer',
    v_name,
    v_phone,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 3. Enable RLS on All Tables (Default Deny)
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 4. Table RLS Policies

-- a) stations: viewable by all authenticated and anon users
DROP POLICY IF EXISTS "Stations viewable by everyone" ON public.stations;
CREATE POLICY "Stations viewable by everyone" 
ON public.stations FOR SELECT 
USING (true);

-- b) profiles:
-- Users can see their own profile, users in the same station (for station heads and washers),
-- or customers/washers linked to their bookings
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" 
ON public.profiles FOR SELECT 
USING (
  id = auth.uid() 
  OR (station_id IS NOT NULL AND station_id = public.my_station())
  OR EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE (b.customer_id = public.profiles.id OR b.washer_id = public.profiles.id)
      AND (b.customer_id = auth.uid() OR b.washer_id = auth.uid() OR b.station_id = public.my_station())
  )
);

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" 
ON public.profiles FOR UPDATE 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

-- c) cars:
-- Customer manages own cars. Washers and station heads can see cars linked to their bookings.
DROP POLICY IF EXISTS "Cars select policy" ON public.cars;
CREATE POLICY "Cars select policy" 
ON public.cars FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.booking_cars bc
    JOIN public.bookings b ON b.id = bc.booking_id
    WHERE bc.car_id = public.cars.id 
      AND (b.washer_id = auth.uid() OR b.station_id = public.my_station())
  )
);

DROP POLICY IF EXISTS "Cars insert policy" ON public.cars;
CREATE POLICY "Cars insert policy" 
ON public.cars FOR INSERT 
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Cars update policy" ON public.cars;
CREATE POLICY "Cars update policy" 
ON public.cars FOR UPDATE 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Cars delete policy" ON public.cars;
CREATE POLICY "Cars delete policy" 
ON public.cars FOR DELETE 
USING (owner_id = auth.uid());

-- d) parking_spots:
-- Customer manages own spots. Washers and station heads can see spot details for assigned bookings.
DROP POLICY IF EXISTS "Spots select policy" ON public.parking_spots;
CREATE POLICY "Spots select policy" 
ON public.parking_spots FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.parking_spot_id = public.parking_spots.id 
      AND (b.washer_id = auth.uid() OR b.station_id = public.my_station())
  )
);

DROP POLICY IF EXISTS "Spots insert policy" ON public.parking_spots;
CREATE POLICY "Spots insert policy" 
ON public.parking_spots FOR INSERT 
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Spots update policy" ON public.parking_spots;
CREATE POLICY "Spots update policy" 
ON public.parking_spots FOR UPDATE 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Spots delete policy" ON public.parking_spots;
CREATE POLICY "Spots delete policy" 
ON public.parking_spots FOR DELETE 
USING (owner_id = auth.uid());

-- e) packages & package_prices & settings:
-- Publicly readable by authenticated and anon; modified only by migrations / admin
DROP POLICY IF EXISTS "Packages viewable by all" ON public.packages;
CREATE POLICY "Packages viewable by all" 
ON public.packages FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Package prices viewable by all" ON public.package_prices;
CREATE POLICY "Package prices viewable by all" 
ON public.package_prices FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Settings viewable by all" ON public.settings;
CREATE POLICY "Settings viewable by all" 
ON public.settings FOR SELECT 
USING (true);

-- f) bookings:
-- Customer sees own bookings; Station Head sees bookings for their station; Washer sees assigned bookings
DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
CREATE POLICY "Bookings select policy" 
ON public.bookings FOR SELECT 
USING (
  customer_id = auth.uid() 
  OR (public.my_role() = 'station_head' AND station_id = public.my_station())
  OR (public.my_role() = 'washer' AND washer_id = auth.uid())
);

DROP POLICY IF EXISTS "Bookings insert policy" ON public.bookings;
CREATE POLICY "Bookings insert policy" 
ON public.bookings FOR INSERT 
WITH CHECK (customer_id = auth.uid());

-- g) booking_cars:
DROP POLICY IF EXISTS "Booking cars select policy" ON public.booking_cars;
CREATE POLICY "Booking cars select policy" 
ON public.booking_cars FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = public.booking_cars.booking_id 
      AND (
        b.customer_id = auth.uid() 
        OR (public.my_role() = 'station_head' AND b.station_id = public.my_station())
        OR (public.my_role() = 'washer' AND b.washer_id = auth.uid())
      )
  )
);

-- h) photos:
DROP POLICY IF EXISTS "Photos select policy" ON public.photos;
CREATE POLICY "Photos select policy" 
ON public.photos FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = public.photos.booking_id 
      AND (
        b.customer_id = auth.uid() 
        OR (public.my_role() = 'station_head' AND b.station_id = public.my_station())
        OR (public.my_role() = 'washer' AND b.washer_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Photos insert policy" ON public.photos;
CREATE POLICY "Photos insert policy" 
ON public.photos FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() 
  AND public.my_role() = 'washer'
  AND EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = public.photos.booking_id 
      AND b.washer_id = auth.uid() 
      AND b.status IN ('assigned', 'washing')
  )
);

-- Retake replaces photo (delete / re-upload)
DROP POLICY IF EXISTS "Photos delete policy" ON public.photos;
CREATE POLICY "Photos delete policy" 
ON public.photos FOR DELETE 
USING (
  uploaded_by = auth.uid() 
  AND public.my_role() = 'washer'
  AND EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = public.photos.booking_id 
      AND b.washer_id = auth.uid() 
      AND b.status IN ('assigned', 'washing')
  )
);

-- i) payments:
DROP POLICY IF EXISTS "Payments select policy" ON public.payments;
CREATE POLICY "Payments select policy" 
ON public.payments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = public.payments.booking_id 
      AND (
        b.customer_id = auth.uid() 
        OR (public.my_role() = 'station_head' AND b.station_id = public.my_station())
        OR (public.my_role() = 'washer' AND b.washer_id = auth.uid())
      )
  )
);

-- j) reviews:
DROP POLICY IF EXISTS "Reviews select policy" ON public.reviews;
CREATE POLICY "Reviews select policy" 
ON public.reviews FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = public.reviews.booking_id 
      AND (
        b.customer_id = auth.uid() 
        OR (public.my_role() = 'station_head' AND b.station_id = public.my_station())
        OR (public.my_role() = 'washer' AND b.washer_id = auth.uid())
      )
  )
);

-- k) settlements:
DROP POLICY IF EXISTS "Settlements select policy" ON public.settlements;
CREATE POLICY "Settlements select policy" 
ON public.settlements FOR SELECT 
USING (
  public.my_role() = 'station_head' 
  AND station_id = public.my_station()
);

-- 5. Storage Bucket Configuration
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-photos', 'booking-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage policies for booking-photos bucket
DROP POLICY IF EXISTS "Washers can upload booking photos" ON storage.objects;
CREATE POLICY "Washers can upload booking photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'booking-photos'
  AND public.my_role() = 'washer'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = (storage.foldername(name))[1]
      AND b.washer_id = auth.uid()
      AND b.status IN ('assigned', 'washing')
  )
);

DROP POLICY IF EXISTS "Washers can update booking photos" ON storage.objects;
CREATE POLICY "Washers can update booking photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'booking-photos'
  AND public.my_role() = 'washer'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = (storage.foldername(name))[1]
      AND b.washer_id = auth.uid()
      AND b.status IN ('assigned', 'washing')
  )
);

DROP POLICY IF EXISTS "Authorized users can read booking photos" ON storage.objects;
CREATE POLICY "Authorized users can read booking photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'booking-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = (storage.foldername(name))[1]
        AND (
          b.customer_id = auth.uid()
          OR (public.my_role() = 'station_head' AND b.station_id = public.my_station())
          OR (public.my_role() = 'washer' AND b.washer_id = auth.uid())
        )
    )
  )
);

-- 6. Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'photos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
  END IF;
END $$;
