import { execSync } from "child_process";

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

const LOCAL_DB_HOST = "127.0.0.1";
const LOCAL_DB_PORT = "54322";
const DEFAULT_TEST_DB_URL = process.env.TEST_DATABASE_URL || `postgresql://postgres:postgres@${LOCAL_DB_HOST}:${LOCAL_DB_PORT}/postgres`;

export function validateLocalConnection(connectionString: string): { host: string; port: string } {
  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname;
    const port = parsed.port || "5432";
    if (host !== LOCAL_DB_HOST || port !== LOCAL_DB_PORT) {
      throw new Error(
        `SAFETY REFUSAL: Database tests are strictly restricted to the local development database (${LOCAL_DB_HOST}:${LOCAL_DB_PORT}). Attempted connection to non-local target: ${host}:${port}. Execution aborted to protect external databases.`
      );
    }
    return { host, port };
  } catch (err: any) {
    if (err.message.startsWith("SAFETY REFUSAL")) {
      throw err;
    }
    throw new Error(`SAFETY REFUSAL: Invalid database connection target '${connectionString}': ${err.message}`);
  }
}

export function runSql(sql: string, connectionString: string = DEFAULT_TEST_DB_URL): { stdout: string; error?: string; json?: any } {
  try {
    // Safety Guard: Refuse execution if connection does not point to local database (127.0.0.1:54322)
    validateLocalConnection(connectionString);

    const escapedSql = sql.replace(/"/g, '\\"');
    const stdout = execSync(
      `docker exec supabase_db_jgekymuphznmfsbdexaw psql -U postgres -d postgres -t -A -c "${escapedSql}"`,
      { encoding: "utf-8" }
    ).trim();
    
    // Find json line if present and strip command tags like SET
    const lines = stdout.split("\n").map(l => l.trim()).filter(l => l && l !== "SET");
    const jsonLine = lines.find(l => l.startsWith("{") && l.endsWith("}"));
    const lastLine = lines[lines.length - 1] || "";
    let json: any = undefined;
    if (jsonLine) {
      try {
        json = JSON.parse(jsonLine);
      } catch (e) {}
    }

    return { stdout, lastLine, json };
  } catch (err: any) {
    return { stdout: "", error: err.stderr || err.message };
  }
}

async function runDatabaseTests() {
  console.log("\n========================================================");
  console.log("TEST SUITE 2: Supabase Database, RLS, State Machine & Capacity");
  console.log("========================================================\n");

  // Test 0: Safety Guard verifies refusal of non-local database targets
  console.log("Test 0: Safety Guard refuses non-local database connections");
  const remoteTargetUrl = "postgresql://postgres:prod-secret@db.jgekymuphznmfsbdexaw.supabase.co:5432/postgres";
  const safetyRes = runSql("SELECT 1;", remoteTargetUrl);
  assert(
    Boolean(safetyRes.error && safetyRes.error.includes("SAFETY REFUSAL") && safetyRes.error.includes("db.jgekymuphznmfsbdexaw.supabase.co")),
    "runSql strictly refuses execution against remote/production host (db.jgekymuphznmfsbdexaw.supabase.co)"
  );

  const wrongPortUrl = "postgresql://postgres:postgres@127.0.0.1:54321/postgres";
  const wrongPortRes = runSql("SELECT 1;", wrongPortUrl);
  assert(
    Boolean(wrongPortRes.error && wrongPortRes.error.includes("SAFETY REFUSAL") && wrongPortRes.error.includes("54321")),
    "runSql strictly refuses execution against non-db port (127.0.0.1:54321)"
  );

  // Test 1: Phone requirement on auth signup (handle_new_user trigger)
  console.log("\nTest 1: handle_new_user trigger requires phone number on signup");
  const noPhoneUserId = "00000000-0000-0000-0000-000000000099";
  const noPhoneSignupSql = `
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('${noPhoneUserId}', 'authenticated', 'authenticated', 'no_phone@test.local', '', now(), '{"provider":"email"}', '{"name":"No Phone"}', now(), now());
  `;
  const noPhoneRes = runSql(noPhoneSignupSql);
  assert(
    Boolean(noPhoneRes.error && noPhoneRes.error.includes("A valid phone number is required to create a profile")),
    "Signup without phone number is rejected with clear error message"
  );

  const validPhoneUserId = "00000000-0000-0000-0000-000000000098";
  const validPhoneSignupSql = `
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, phone, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('${validPhoneUserId}', 'authenticated', 'authenticated', 'valid_phone@test.local', '', now(), '+919876500000', '{"provider":"phone"}', '{"name":"Pooja Patel"}', now(), now());
    SELECT row_to_json(p) FROM public.profiles p WHERE id = '${validPhoneUserId}';
  `;
  const validPhoneRes = runSql(validPhoneSignupSql);
  assert(!validPhoneRes.error, "Signup with valid phone number succeeds", validPhoneRes.error);
  const createdProfile = validPhoneRes.json || {};
  assert(createdProfile.role === "customer", "Created profile role is customer");
  assert(createdProfile.phone === "+919876500000", "Created profile phone matches signed up phone");
  assert(createdProfile.name === "Pooja Patel", "Created profile name matches metadata");

  // Clean up transient test user 98
  runSql(`
    DELETE FROM public.profiles WHERE id = '${validPhoneUserId}';
    DELETE FROM auth.users WHERE id = '${validPhoneUserId}';
  `);

  const chetanId = "00000000-0000-0000-0000-000000000001";
  const stationHeadId = "00000000-0000-0000-0000-000000000002";
  const rajeshId = "00000000-0000-0000-0000-000000000003";
  const sureshId = "00000000-0000-0000-0000-000000000004";

  // Provision isolated test users and profiles transiently for test execution
  runSql(`
    DELETE FROM public.bookings;
    DELETE FROM public.cars WHERE owner_id = '${chetanId}';
    DELETE FROM public.parking_spots WHERE owner_id = '${chetanId}';
    DELETE FROM public.profiles WHERE id IN ('${chetanId}', '${stationHeadId}', '${rajeshId}', '${sureshId}');
    DELETE FROM auth.users WHERE id IN ('${chetanId}', '${stationHeadId}', '${rajeshId}', '${sureshId}');

    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, phone, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
      ('${chetanId}', 'authenticated', 'authenticated', 'test_chetan@appwasher.test', '', now(), '+910000000001', '{"provider":"phone"}', '{"name":"Chetan Sharma","phone":"+910000000001"}', now(), now()),
      ('${stationHeadId}', 'authenticated', 'authenticated', 'test_station@appwasher.test', '', now(), '+910000000002', '{"provider":"phone"}', '{"name":"Station Head","phone":"+910000000002"}', now(), now()),
      ('${rajeshId}', 'authenticated', 'authenticated', 'test_rajesh@appwasher.test', '', now(), '+910000000003', '{"provider":"phone"}', '{"name":"Rajesh Washer","phone":"+910000000003"}', now(), now()),
      ('${sureshId}', 'authenticated', 'authenticated', 'test_suresh@appwasher.test', '', now(), '+910000000004', '{"provider":"phone"}', '{"name":"Suresh Washer","phone":"+910000000004"}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, role, name, phone, station_id)
    VALUES
      ('${chetanId}', 'customer', 'Chetan Sharma', '+910000000001', NULL),
      ('${stationHeadId}', 'station_head', 'Station Head', '+910000000002', 'green_valley'),
      ('${rajeshId}', 'washer', 'Rajesh Washer', '+910000000003', 'green_valley'),
      ('${sureshId}', 'washer', 'Suresh Washer', '+910000000004', 'green_valley')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name, phone = EXCLUDED.phone, station_id = EXCLUDED.station_id;

    INSERT INTO public.cars (id, owner_id, name, car_type, plate)
    VALUES
      ('car_chetan_sedan', '${chetanId}', 'Honda City', 'sedan', 'MH 12 AB 1234'),
      ('car_chetan_suv', '${chetanId}', 'Hyundai Creta', 'suv', 'MH 12 CD 5678')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.parking_spots (id, owner_id, address, spot_label)
    VALUES
      ('spot_chetan_home', '${chetanId}', 'Blue Ridge Tower B, Pune', 'B2 #42')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Test 2: Customer cannot change their own role (privilege escalation prevention)
  console.log("\nTest 2: Customer cannot alter their own role");
  const roleTamperSql = `
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${chetanId}';
    SET request.jwt.claim.role = 'authenticated';
    UPDATE public.profiles SET role = 'station_head' WHERE id = '${chetanId}';
  `;
  const roleTamperRes = runSql(roleTamperSql);
  assert(
    Boolean(roleTamperRes.error && roleTamperRes.error.includes("Users cannot alter their own role")),
    "Customer attempt to update role to 'station_head' is rejected by security trigger"
  );

  // Test 3: Booking creation via create_booking function
  console.log("\nTest 3: create_booking function snapshots prices, creates readable ID, and checks spot ownership");
  const createBookingSql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.create_booking(
      ARRAY['car_chetan_sedan'],
      'ext',
      (CURRENT_DATE + 2)::date,
      '08:30',
      'spot_chetan_home',
      'green_valley'
    );
  `;
  const createBookingRes = runSql(createBookingSql);
  assert(!createBookingRes.error, "create_booking executes cleanly for valid cars and spot", createBookingRes.error);
  
  const createdBooking = createBookingRes.json || {};
  assert(
    createdBooking.id && createdBooking.id.startsWith("AW"),
    `Created booking has human-readable code starting with AW (${createdBooking.id})`
  );
  assert(createdBooking.status === "pending", "Initial booking status is pending");
  assert(createdBooking.total_inr === 499, `Booking total matches flat package price: ext sedan = 499 (got ${createdBooking.total_inr})`);

  const bookingId = createdBooking.id;

  // Test 4: Status state machine transitions
  console.log("\nTest 4: Enforcing status flow: pending -> assigned -> washing -> awaiting_payment -> paid");
  
  // Illegal transition: attempt to jump from pending directly to washing
  const illegalJumpSql = `
    UPDATE public.bookings SET status = 'washing' WHERE id = '${bookingId}';
  `;
  const illegalJumpRes = runSql(illegalJumpSql);
  assert(
    Boolean(illegalJumpRes.error && illegalJumpRes.error.includes("Invalid status transition")),
    "Illegal status transition (pending -> washing) is blocked by state machine"
  );

  // Station head assigns washer
  const assignSql = `
    SET request.jwt.claim.sub = '${stationHeadId}';
    SELECT public.assign_washer('${bookingId}', '${rajeshId}');
  `;
  const assignRes = runSql(assignSql);
  assert(!assignRes.error, "Station head can assign washer", assignRes.error);

  // Customer cannot assign washer
  const illegalAssignSql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.assign_washer('${bookingId}', '${rajeshId}');
  `;
  const illegalAssignRes = runSql(illegalAssignSql);
  assert(
    Boolean(illegalAssignRes.error && illegalAssignRes.error.includes("Only station heads")),
    "Customer cannot assign washer"
  );

  // Test 5: Washer slot capacity (max 2 active bookings per slot)
  console.log("\nTest 5: Washer capacity constraint (max 2 active bookings per date & slot)");
  // Ensure extra spots exist
  runSql(`
    INSERT INTO public.parking_spots (id, owner_id, address, spot_label)
    VALUES 
      ('spot_chetan_office', '${chetanId}', 'Cyber City, Pune', 'B1-12'),
      ('spot_chetan_mall', '${chetanId}', 'Westend Mall, Pune', 'P2-45')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Create a 2nd booking at same date & slot with different spot
  const create2Sql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.create_booking(
      ARRAY['car_chetan_suv'],
      'deep',
      (CURRENT_DATE + 2)::date,
      '08:30',
      'spot_chetan_office',
      'green_valley'
    );
  `;
  const b2Res = runSql(create2Sql);
  const b2Id = (b2Res.json || {}).id;

  // Assign 2nd booking to Rajesh (Rajesh now has 2 active bookings at that slot)
  const assign2Sql = `
    SET request.jwt.claim.sub = '${stationHeadId}';
    SELECT public.assign_washer('${b2Id}', '${rajeshId}');
  `;
  const assign2Res = runSql(assign2Sql);
  assert(!assign2Res.error, "Washer can take 2nd booking for the slot (capacity = 2)", assign2Res.error);

  // Create 3rd booking at same date & slot with 3rd spot
  const create3Sql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.create_booking(
      ARRAY['car_chetan_sedan'],
      'prem',
      (CURRENT_DATE + 2)::date,
      '08:30',
      'spot_chetan_mall',
      'green_valley'
    );
  `;
  const b3Res = runSql(create3Sql);
  const b3Id = (b3Res.json || {}).id;

  // Attempting to assign 3rd booking to Rajesh must fail
  const assign3Sql = `
    SET request.jwt.claim.sub = '${stationHeadId}';
    SELECT public.assign_washer('${b3Id}', '${rajeshId}');
  `;
  const assign3Res = runSql(assign3Sql);
  assert(
    Boolean(assign3Res.error && assign3Res.error.includes("maximum capacity of 2 active bookings")),
    "3rd assignment to same washer at same slot is blocked by capacity trigger"
  );

  // Test 6: start_wash requires 4 before photos
  console.log("\nTest 6: start_wash requires 4 before-wash photos (front, rear, left, right)");
  const startWashWithoutPhotosSql = `
    SET request.jwt.claim.sub = '${rajeshId}';
    SELECT public.start_wash('${bookingId}');
  `;
  const startWashFailRes = runSql(startWashWithoutPhotosSql);
  assert(
    Boolean(startWashFailRes.error && startWashFailRes.error.includes("all 4 before-wash photos")),
    "start_wash blocked when 4 before-photos are missing"
  );

  // Upload 4 before-photos
  const uploadBeforePhotosSql = `
    INSERT INTO public.photos (booking_id, kind, position, storage_path, uploaded_by)
    VALUES
      ('${bookingId}', 'before', 'front', '${bookingId}/before/front.jpg', '${rajeshId}'),
      ('${bookingId}', 'before', 'rear', '${bookingId}/before/rear.jpg', '${rajeshId}'),
      ('${bookingId}', 'before', 'left', '${bookingId}/before/left.jpg', '${rajeshId}'),
      ('${bookingId}', 'before', 'right', '${bookingId}/before/right.jpg', '${rajeshId}')
    ON CONFLICT (booking_id, kind, position) DO NOTHING;
  `;
  const uploadPhotosRes = runSql(uploadBeforePhotosSql);
  assert(!uploadPhotosRes.error, "4 before-photos inserted successfully", uploadPhotosRes.error);

  // Now start_wash succeeds
  const startWashSuccessSql = `
    SET request.jwt.claim.sub = '${rajeshId}';
    SELECT public.start_wash('${bookingId}');
  `;
  const startWashSuccessRes = runSql(startWashSuccessSql);
  assert(!startWashSuccessRes.error, "start_wash succeeds after all 4 before-photos uploaded", startWashSuccessRes.error);

  // Test 7: Customer cannot cancel after washing starts
  console.log("\nTest 7: Customer cancellation rules");
  const cancelAfterWashingSql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.cancel_booking('${bookingId}');
  `;
  const cancelFailRes = runSql(cancelAfterWashingSql);
  assert(
    Boolean(cancelFailRes.error && cancelFailRes.error.includes("once washing has started")),
    "Customer cannot cancel booking once washing has started"
  );

  // Test 8: complete_job requires 4 after-photos
  console.log("\nTest 8: complete_job requires 4 after-wash photos");
  const completeWithoutPhotosSql = `
    SET request.jwt.claim.sub = '${rajeshId}';
    SELECT public.complete_job('${bookingId}');
  `;
  const completeFailRes = runSql(completeWithoutPhotosSql);
  assert(
    Boolean(completeFailRes.error && completeFailRes.error.includes("all 4 after-wash photos")),
    "complete_job blocked when 4 after-photos are missing"
  );

  // Upload 4 after-photos
  const uploadAfterPhotosSql = `
    INSERT INTO public.photos (booking_id, kind, position, storage_path, uploaded_by)
    VALUES
      ('${bookingId}', 'after', 'front', '${bookingId}/after/front.jpg', '${rajeshId}'),
      ('${bookingId}', 'after', 'rear', '${bookingId}/after/rear.jpg', '${rajeshId}'),
      ('${bookingId}', 'after', 'left', '${bookingId}/after/left.jpg', '${rajeshId}'),
      ('${bookingId}', 'after', 'right', '${bookingId}/after/right.jpg', '${rajeshId}')
    ON CONFLICT (booking_id, kind, position) DO NOTHING;
  `;
  runSql(uploadAfterPhotosSql);

  const completeSuccessSql = `
    SET request.jwt.claim.sub = '${rajeshId}';
    SELECT public.complete_job('${bookingId}');
  `;
  const completeSuccessRes = runSql(completeSuccessSql);
  assert(!completeSuccessRes.error, "complete_job succeeds after 4 after-photos uploaded -> status awaiting_payment", completeSuccessRes.error);

  // Test 9: Record cash payment -> status paid
  console.log("\nTest 9: Recording cash payment");
  const recordCashSql = `
    SET request.jwt.claim.sub = '${rajeshId}';
    SELECT public.record_cash_payment('${bookingId}');
  `;
  const recordCashRes = runSql(recordCashSql);
  assert(!recordCashRes.error, "Assigned washer can record cash payment -> status moves to paid", recordCashRes.error);

  // Test 10: Customer submits review on paid booking
  console.log("\nTest 10: Customer review submission");
  const reviewSql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.submit_review('${bookingId}', 5, ARRAY['On Time', 'Spotless Glass'], 50);
  `;
  const reviewRes = runSql(reviewSql);
  assert(!reviewRes.error, "Customer can submit rating 5, tags, and tip on completed booking", reviewRes.error);

  // Test 11: Revocation of direct UPDATE on client roles
  console.log("\nTest 11: Direct UPDATE permissions revoked on bookings, payments, settlements");
  const directUpdateSql = `
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${chetanId}';
    SET request.jwt.claim.role = 'authenticated';
    UPDATE public.bookings SET total_inr = 0 WHERE id = '${bookingId}';
  `;
  const directUpdateRes = runSql(directUpdateSql);
  assert(
    Boolean(directUpdateRes.error && directUpdateRes.error.includes("permission denied")),
    "Direct UPDATE on public.bookings denied to authenticated role"
  );

  // Test 12: RLS Isolation - Customer cannot read another customer's booking
  console.log("\nTest 12: RLS Isolation - Customer cannot read another customer's booking");
  const otherCustomerId = "00000000-0000-0000-0000-000000000077";
  runSql(`
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, created_at, updated_at)
    VALUES ('${otherCustomerId}', 'authenticated', 'authenticated', 'other@test.local', '', now(), '+919876543211', '{"name":"Other Customer"}', now(), now())
    ON CONFLICT (id) DO NOTHING;
  `);
  const crossCustomerSql = `
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${otherCustomerId}';
    SET request.jwt.claim.role = 'authenticated';
    SELECT count(*) FROM public.bookings WHERE id = '${bookingId}';
  `;
  const crossCustomerRes = runSql(crossCustomerSql);
  assert(
    !crossCustomerRes.error && crossCustomerRes.lastLine === "0",
    "Customer cannot read another customer's booking (RLS returns 0 rows)"
  );

  // Test 13: RLS Isolation - Washer cannot read unassigned booking
  console.log("\nTest 13: RLS Isolation - Washer cannot read unassigned booking");
  const unassignedBookingSql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.create_booking(
      ARRAY['car_chetan_sedan'],
      'ext',
      (CURRENT_DATE + 3)::date,
      '06:30',
      'spot_chetan_home',
      'green_valley'
    );
  `;
  const unassignedRes = runSql(unassignedBookingSql);
  const unassignedId = (unassignedRes.json || {}).id;

  const washerReadUnassignedSql = `
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${rajeshId}';
    SET request.jwt.claim.role = 'authenticated';
    SELECT count(*) FROM public.bookings WHERE id = '${unassignedId}';
  `;
  const washerReadRes = runSql(washerReadUnassignedSql);
  assert(
    !washerReadRes.error && washerReadRes.lastLine === "0",
    "Washer cannot read unassigned booking (RLS returns 0 rows)"
  );

  // Test 14: RLS Isolation - Station head cannot see another station's bookings
  console.log("\nTest 14: RLS Isolation - Station head cannot see another station's bookings");
  const otherStationHeadId = "00000000-0000-0000-0000-000000000066";
  runSql(`
    INSERT INTO public.stations (id, name, area) VALUES ('kothrud_station', 'Kothrud Station', 'Kothrud, Pune') ON CONFLICT (id) DO NOTHING;
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, created_at, updated_at)
    VALUES ('${otherStationHeadId}', 'authenticated', 'authenticated', 'other_station@test.local', '', now(), '+919876543222', '{"name":"Kothrud Head"}', now(), now())
    ON CONFLICT (id) DO NOTHING;
    UPDATE public.profiles SET role = 'station_head', station_id = 'kothrud_station' WHERE id = '${otherStationHeadId}';
  `);
  const otherStationReadSql = `
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '${otherStationHeadId}';
    SET request.jwt.claim.role = 'authenticated';
    SELECT count(*) FROM public.bookings WHERE id = '${unassignedId}';
  `;
  const otherStationReadRes = runSql(otherStationReadSql);
  assert(
    !otherStationReadRes.error && otherStationReadRes.lastLine === "0",
    "Station head cannot see bookings from another station (RLS returns 0 rows)"
  );

  // Test 15: Price Snapshot - Changing package_prices table later does NOT alter existing booking total
  console.log("\nTest 15: Price snapshot integrity");
  runSql(`UPDATE public.package_prices SET price_inr = 999 WHERE package_id = 'ext' AND car_type = 'sedan';`);
  const checkSnapshotSql = `SELECT total_inr FROM public.bookings WHERE id = '${unassignedId}';`;
  const snapshotRes = runSql(checkSnapshotSql);
  assert(
    snapshotRes.stdout.trim() === "499",
    `Existing booking total remains 499 after package price table was updated to 999 (got ${snapshotRes.stdout.trim()})`
  );
  runSql(`UPDATE public.package_prices SET price_inr = 499 WHERE package_id = 'ext' AND car_type = 'sedan';`);

  // Test 16: Partial Unique Index - Two active bookings cannot take the same parking spot in the same slot
  console.log("\nTest 16: Partial unique index prevents double booking of spot");
  const duplicateSpotBookingSql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.create_booking(
      ARRAY['car_chetan_suv'],
      'deep',
      (CURRENT_DATE + 3)::date,
      '06:30',
      'spot_chetan_home',
      'green_valley'
    );
  `;
  const dupSpotRes = runSql(duplicateSpotBookingSql);
  assert(
    Boolean(dupSpotRes.error && (dupSpotRes.error.includes("idx_unique_active_spot_booking") || dupSpotRes.error.includes("unique constraint"))),
    "Partial unique index blocks second active booking for the same spot and time slot"
  );

  // Teardown: Clean up transient test users and data
  runSql(`
    DELETE FROM public.bookings;
    DELETE FROM public.cars WHERE owner_id = '${chetanId}';
    DELETE FROM public.parking_spots WHERE owner_id = '${chetanId}';
    DELETE FROM public.profiles WHERE id IN ('${chetanId}', '${stationHeadId}', '${rajeshId}', '${sureshId}', '${otherCustomerId}', '${otherStationHeadId}');
    DELETE FROM auth.users WHERE id IN ('${chetanId}', '${stationHeadId}', '${rajeshId}', '${sureshId}', '${otherCustomerId}', '${otherStationHeadId}');
    DELETE FROM public.stations WHERE id = 'kothrud_station';
  `);

  console.log("\n--------------------------------------------------------");
  console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
  console.log("--------------------------------------------------------\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runDatabaseTests().catch((err) => {
  console.error("Unhandled test error:", err);
  process.exit(1);
});
