-- Development Seed File
-- AppWasher Platform
-- Seeded test users: chetan (customer), station (station head), rajesh, suresh, imran (washers)
-- Clearly fake test numbers +910000000001 through +910000000005

-- 1. Stations (guaranteed present)
INSERT INTO public.stations (id, name, area)
VALUES ('green_valley', 'Green Valley Station', 'Hinjewadi, Pune')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, area = EXCLUDED.area;

-- 2. Auth Users (deterministic test user accounts for local dev)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'chetan@dev.appwasher.local', '', now(), '+910000000001', now(), '{"provider":"phone","providers":["phone"]}', '{"name":"Chetan Sharma","phone":"+910000000001"}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'station@dev.appwasher.local', '', now(), '+910000000002', now(), '{"provider":"phone","providers":["phone"]}', '{"name":"Station Head (Vikram)","phone":"+910000000002"}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'rajesh@dev.appwasher.local', '', now(), '+910000000003', now(), '{"provider":"phone","providers":["phone"]}', '{"name":"Rajesh Kumar","phone":"+910000000003"}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'suresh@dev.appwasher.local', '', now(), '+910000000004', now(), '{"provider":"phone","providers":["phone"]}', '{"name":"Suresh Verma","phone":"+910000000004"}', now(), now(), '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'imran@dev.appwasher.local', '', now(), '+910000000005', now(), '{"provider":"phone","providers":["phone"]}', '{"name":"Imran Khan","phone":"+910000000005"}', now(), now(), '', '')
ON CONFLICT (id) DO NOTHING;

-- 3. Profiles (Explicitly assigned roles by administrator)
INSERT INTO public.profiles (id, role, name, phone, station_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'customer', 'Chetan Sharma', '+910000000001', NULL),
  ('00000000-0000-0000-0000-000000000002', 'station_head', 'Station Head (Vikram)', '+910000000002', 'green_valley'),
  ('00000000-0000-0000-0000-000000000003', 'washer', 'Rajesh Kumar', '+910000000003', 'green_valley'),
  ('00000000-0000-0000-0000-000000000004', 'washer', 'Suresh Verma', '+910000000004', 'green_valley'),
  ('00000000-0000-0000-0000-000000000005', 'washer', 'Imran Khan', '+910000000005', 'green_valley')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  station_id = EXCLUDED.station_id;

-- 4. Initial customer cars for Chetan
INSERT INTO public.cars (id, owner_id, name, car_type, plate)
VALUES
  ('car_chetan_sedan', '00000000-0000-0000-0000-000000000001', 'Honda City', 'sedan', 'MH 12 AB 1234'),
  ('car_chetan_suv', '00000000-0000-0000-0000-000000000001', 'Hyundai Creta', 'suv', 'MH 12 CD 5678')
ON CONFLICT (id) DO NOTHING;

-- 5. Initial customer parking spot for Chetan
INSERT INTO public.parking_spots (id, owner_id, address, spot_label)
VALUES
  ('spot_chetan_home', '00000000-0000-0000-0000-000000000001', 'Blue Ridge Tower B, Hinjewadi Phase 1, Pune', 'Basement B2, Spot #42')
ON CONFLICT (id) DO NOTHING;
