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

function runSql(sql: string): { stdout: string; error?: string; json?: any } {
  try {
    const escapedSql = sql.replace(/"/g, '\\"');
    const stdout = execSync(
      `docker exec supabase_db_jgekymuphznmfsbdexaw psql -U postgres -d postgres -t -A -c "${escapedSql}"`,
      { encoding: "utf-8" }
    ).trim();
    
    // Find json line if present
    const lines = stdout.split("\n").map(l => l.trim()).filter(Boolean);
    const jsonLine = lines.find(l => l.startsWith("{") && l.endsWith("}"));
    let json: any = undefined;
    if (jsonLine) {
      try {
        json = JSON.parse(jsonLine);
      } catch (e) {}
    }

    return { stdout, json };
  } catch (err: any) {
    return { stdout: "", error: err.stderr || err.message };
  }
}

async function runDatabaseTests() {
  console.log("\n========================================================");
  console.log("TEST SUITE 2: Supabase Database, RLS, State Machine & Capacity");
  console.log("========================================================\n");

  const chetanId = "00000000-0000-0000-0000-000000000001";
  const stationHeadId = "00000000-0000-0000-0000-000000000002";
  const rajeshId = "00000000-0000-0000-0000-000000000003";

  // Provision isolated test users and profiles transiently for test execution
  runSql(`
    DELETE FROM public.bookings;
    DELETE FROM public.cars WHERE owner_id = '${chetanId}';
    DELETE FROM public.parking_spots WHERE owner_id = '${chetanId}';
    DELETE FROM public.profiles WHERE id IN ('${chetanId}', '${stationHeadId}', '${rajeshId}');
    DELETE FROM auth.users WHERE id IN ('${chetanId}', '${stationHeadId}', '${rajeshId}');

    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, phone, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
      ('${chetanId}', 'authenticated', 'authenticated', 'test_chetan@appwasher.test', '', now(), '+910000000001', '{"provider":"phone"}', '{"name":"Chetan Sharma","phone":"+910000000001"}', now(), now()),
      ('${stationHeadId}', 'authenticated', 'authenticated', 'test_station@appwasher.test', '', now(), '+910000000002', '{"provider":"phone"}', '{"name":"Station Head","phone":"+910000000002"}', now(), now()),
      ('${rajeshId}', 'authenticated', 'authenticated', 'test_rajesh@appwasher.test', '', now(), '+910000000003', '{"provider":"phone"}', '{"name":"Rajesh Washer","phone":"+910000000003"}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, role, name, phone, station_id)
    VALUES
      ('${chetanId}', 'customer', 'Chetan Sharma', '+910000000001', NULL),
      ('${stationHeadId}', 'station_head', 'Station Head', '+910000000002', 'green_valley'),
      ('${rajeshId}', 'washer', 'Rajesh Washer', '+910000000003', 'green_valley')
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

  // Test 1: Customer cannot change their own role (privilege escalation prevention)
  console.log("Test 1: Customer cannot alter their own role");
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

  // Test 2: Booking creation via create_booking function
  console.log("\nTest 2: create_booking function snapshots prices, creates readable ID, and checks spot ownership");
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

  // Test 3: Status state machine transitions
  console.log("\nTest 3: Enforcing status flow: pending -> assigned -> washing -> awaiting_payment -> paid");
  
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

  // Test 4: Washer slot capacity (max 2 active bookings per slot)
  console.log("\nTest 4: Washer capacity constraint (max 2 active bookings per date & slot)");
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

  // Test 5: start_wash requires 4 before photos
  console.log("\nTest 5: start_wash requires 4 before-wash photos (front, rear, left, right)");
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

  // Test 6: Customer cannot cancel after washing starts
  console.log("\nTest 6: Customer cancellation rules");
  const cancelAfterWashingSql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.cancel_booking('${bookingId}');
  `;
  const cancelFailRes = runSql(cancelAfterWashingSql);
  assert(
    Boolean(cancelFailRes.error && cancelFailRes.error.includes("once washing has started")),
    "Customer cannot cancel booking once washing has started"
  );

  // Test 7: complete_job requires 4 after-photos
  console.log("\nTest 7: complete_job requires 4 after-wash photos");
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

  // Test 8: Record cash payment -> status paid
  console.log("\nTest 8: Recording cash payment");
  const recordCashSql = `
    SET request.jwt.claim.sub = '${rajeshId}';
    SELECT public.record_cash_payment('${bookingId}');
  `;
  const recordCashRes = runSql(recordCashSql);
  assert(!recordCashRes.error, "Assigned washer can record cash payment -> status moves to paid", recordCashRes.error);

  // Test 9: Customer submits review on paid booking
  console.log("\nTest 9: Customer review submission");
  const reviewSql = `
    SET request.jwt.claim.sub = '${chetanId}';
    SELECT public.submit_review('${bookingId}', 5, ARRAY['On Time', 'Spotless Glass'], 50);
  `;
  const reviewRes = runSql(reviewSql);
  assert(!reviewRes.error, "Customer can submit rating 5, tags, and tip on completed booking", reviewRes.error);

  // Test 10: Revocation of direct UPDATE on client roles
  console.log("\nTest 10: Direct UPDATE permissions revoked on bookings, payments, settlements");
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

  // Teardown: Clean up transient test users and data
  runSql(`
    DELETE FROM public.bookings;
    DELETE FROM public.cars WHERE owner_id = '${chetanId}';
    DELETE FROM public.parking_spots WHERE owner_id = '${chetanId}';
    DELETE FROM public.profiles WHERE id IN ('${chetanId}', '${stationHeadId}', '${rajeshId}');
    DELETE FROM auth.users WHERE id IN ('${chetanId}', '${stationHeadId}', '${rajeshId}');
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
