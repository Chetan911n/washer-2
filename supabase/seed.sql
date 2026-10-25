-- Reference Data Seed File
-- AppWasher Platform
-- ONLY reference data: stations, packages, package_prices, settings.
-- No auth users, no bookings, no phone numbers, no passwords.

-- 1. Stations
INSERT INTO public.stations (id, name, area)
VALUES ('green_valley', 'Green Valley Station', 'Hinjewadi, Pune')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, area = EXCLUDED.area;

-- 2. Packages
INSERT INTO public.packages (id, name, description)
VALUES 
  ('ext', 'Exterior Foam Wash', 'Foam wash, wheel clean, glass shine'),
  ('deep', 'Deep Wash & Polish', 'Foam wash, tyre dressing, wax polish'),
  ('prem', 'Premium Detail', 'Deep wash plus interior vacuum and dashboard care')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3. Package Prices (flat rates across all car types: ext 499, deep 799, prem 1199)
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

-- 4. Settings
INSERT INTO public.settings (key, value)
VALUES ('washer_slot_capacity', '2'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
