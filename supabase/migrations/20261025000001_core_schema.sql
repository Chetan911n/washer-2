-- Migration 1: Core Schema & Constraints
-- AppWasher Platform: profiles, stations, cars, parking_spots, packages, package_prices, bookings, booking_cars, photos, payments, reviews, settlements, settings

-- 1. Stations table
CREATE TABLE IF NOT EXISTS public.stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Seed Green Valley Station
INSERT INTO public.stations (id, name, area)
VALUES ('green_valley', 'Green Valley Station', 'Hinjewadi, Pune')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, area = EXCLUDED.area;

-- 2. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'station_head', 'washer')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  station_id TEXT REFERENCES public.stations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_station_id ON public.profiles(station_id);

-- 3. Cars table
CREATE TABLE IF NOT EXISTS public.cars (
  id TEXT PRIMARY KEY DEFAULT ('car_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  car_type TEXT NOT NULL CHECK (car_type IN ('hatchback', 'sedan', 'suv')),
  plate TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_cars_owner_id ON public.cars(owner_id);

-- 4. Parking Spots table
CREATE TABLE IF NOT EXISTS public.parking_spots (
  id TEXT PRIMARY KEY DEFAULT ('spot_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  spot_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_parking_spots_owner_id ON public.parking_spots(owner_id);

-- 5. Packages table
CREATE TABLE IF NOT EXISTS public.packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Seed packages exactly as in the app
INSERT INTO public.packages (id, name, description)
VALUES 
  ('ext', 'Exterior Foam Wash', 'Foam wash, wheel clean, glass shine'),
  ('deep', 'Deep Wash & Polish', 'Foam wash, tyre dressing, wax polish'),
  ('prem', 'Premium Detail', 'Deep wash plus interior vacuum and dashboard care')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 6. Package Prices table
CREATE TABLE IF NOT EXISTS public.package_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id TEXT NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  car_type TEXT NOT NULL CHECK (car_type IN ('hatchback', 'sedan', 'suv')),
  price_inr INTEGER NOT NULL CHECK (price_inr > 0),
  UNIQUE (package_id, car_type)
);

-- Seed package flat prices for all three car types: ext 499, deep 799, prem 1199
INSERT INTO public.package_prices (package_id, car_type, price_inr)
VALUES
  ('ext', 'hatchback', 499),
  ('ext', 'sedan', 499),
  ('ext', 'suv', 499),
  ('deep', 'hatchback', 799),
  ('deep', 'sedan', 799),
  ('deep', 'suv', 799),
  ('prem', 'hatchback', 1199),
  ('prem', 'sedan', 1199),
  ('prem', 'suv', 1199)
ON CONFLICT (package_id, car_type) DO UPDATE SET price_inr = EXCLUDED.price_inr;

-- 7. Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY, -- Readable code like AW5246
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  station_id TEXT NOT NULL REFERENCES public.stations(id),
  washer_id UUID REFERENCES public.profiles(id),
  parking_spot_id TEXT NOT NULL REFERENCES public.parking_spots(id),
  package_id TEXT NOT NULL REFERENCES public.packages(id),
  scheduled_date DATE NOT NULL CHECK (scheduled_date >= CURRENT_DATE),
  slot_start TEXT NOT NULL CHECK (slot_start IN ('06:30', '08:30', '15:00', '17:00')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'assigned', 'washing', 'awaiting_payment', 'paid', 'cancelled')) DEFAULT 'pending',
  total_inr INTEGER NOT NULL CHECK (total_inr >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  cancelled_at TIMESTAMPTZ
);

-- Partial unique index: no double bookings for same parking spot at same date & slot unless cancelled
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_spot_booking 
ON public.bookings (parking_spot_id, scheduled_date, slot_start) 
WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_station_id ON public.bookings(station_id);
CREATE INDEX IF NOT EXISTS idx_bookings_washer_id ON public.bookings(washer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_slot ON public.bookings(scheduled_date, slot_start);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- 8. Booking Cars (snapshots of car type & price)
CREATE TABLE IF NOT EXISTS public.booking_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  car_id TEXT NOT NULL REFERENCES public.cars(id),
  car_type_snapshot TEXT NOT NULL CHECK (car_type_snapshot IN ('hatchback', 'sedan', 'suv')),
  price_inr_snapshot INTEGER NOT NULL CHECK (price_inr_snapshot > 0)
);

CREATE INDEX IF NOT EXISTS idx_booking_cars_booking_id ON public.booking_cars(booking_id);

-- 9. Photos table
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('before', 'after')),
  position TEXT NOT NULL CHECK (position IN ('front', 'rear', 'left', 'right', 'existing_damage')),
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  -- Exactly one current photo per booking, kind, and position. A retake replaces it.
  UNIQUE (booking_id, kind, position)
);

CREATE INDEX IF NOT EXISTS idx_photos_booking_id ON public.photos(booking_id);

-- 10. Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'upi')),
  amount_inr INTEGER NOT NULL CHECK (amount_inr >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed')) DEFAULT 'pending',
  provider_reference TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- One confirmed payment per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_payment_per_booking
ON public.payments (booking_id) 
WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);

-- 11. Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}'::TEXT[],
  tip_inr INTEGER NOT NULL DEFAULT 0 CHECK (tip_inr >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);

-- 12. Settlements table
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT NOT NULL REFERENCES public.stations(id),
  amount_inr INTEGER NOT NULL CHECK (amount_inr >= 0),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_settlements_station_id ON public.settlements(station_id);

-- 13. Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Seed washer_slot_capacity = 2
INSERT INTO public.settings (key, value)
VALUES ('washer_slot_capacity', '2'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
