import { DevOtpProvider } from "../src/lib/auth/providers/devOtpProvider";
import { LiveWhatsAppOtpProvider } from "../src/lib/auth/providers/liveWhatsAppOtpProvider";
import { otpRateLimiter } from "../src/lib/auth/rateLimiter";
import { getOtpMode } from "../src/lib/auth/otpManager";
import { SEEDED_DEV_USERS } from "../src/lib/auth/constants";

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

async function runAuthTests() {
  console.log("\n========================================================");
  console.log("TEST SUITE 1: WhatsApp OTP & Security Auth Architecture");
  console.log("========================================================\n");

  const devProvider = new DevOtpProvider();
  const seededPhone = "+910000000001"; // Chetan
  const fakeRealPhone = "+919876543210"; // Non-seeded phone
  const testIp = "192.168.1.100";

  // Test 1: Dev code works only for seeded test numbers
  console.log("Test 1: Dev code works only for seeded test numbers");
  otpRateLimiter.resetAll();

  const sendResultSeeded = await devProvider.sendOtp(seededPhone, testIp);
  assert(sendResultSeeded.success === true, "Seeded phone (+910000000001) receives OTP successfully in dev mode");
  assert(sendResultSeeded.devCode === "123456", "Dev code is 123456 for seeded user");

  const verifyResultSeeded = await devProvider.verifyOtp(seededPhone, "123456", testIp);
  assert(verifyResultSeeded.success === true, "Verification with code 123456 succeeds for seeded user");
  assert(verifyResultSeeded.user?.name === "Chetan Sharma", "Returns correct seeded user profile");

  const sendResultNonSeeded = await devProvider.sendOtp(fakeRealPhone, testIp);
  assert(sendResultNonSeeded.success === false, "Non-seeded phone (+919876543210) is rejected in dev mode");
  assert(
    sendResultNonSeeded.message?.includes("only seeded test numbers"),
    "Rejection message explicitly states only seeded numbers permitted"
  );

  const verifyNonSeeded = await devProvider.verifyOtp(fakeRealPhone, "123456", testIp);
  assert(verifyNonSeeded.success === false, "Verification rejected for non-seeded number in dev mode");

  // Test 2: In Live mode, seeded test numbers must NOT be usable for real accounts
  console.log("\nTest 2: Live adapter rejects seeded test numbers and protects production accounts");
  const liveProvider = new LiveWhatsAppOtpProvider();
  const liveSendSeeded = await liveProvider.sendOtp(seededPhone, testIp);
  assert(liveSendSeeded.success === false, "Live adapter refuses to send OTP to seeded test numbers");
  const liveVerifySeeded = await liveProvider.verifyOtp(seededPhone, "123456", testIp);
  assert(liveVerifySeeded.success === false, "Live adapter refuses fixed code / seeded number verification");

  // Test 3: Startup security refusal when OTP_MODE != live in production
  console.log("\nTest 3: Production startup refusal if OTP_MODE is not 'live'");
  const origNodeEnv = process.env.NODE_ENV;
  const origOtpMode = process.env.OTP_MODE;

  try {
    (process.env as any).NODE_ENV = "production";
    process.env.OTP_MODE = "dev";
    let threw = false;
    try {
      getOtpMode();
    } catch (err: any) {
      threw = true;
      assert(
        err.message.includes("CRITICAL SECURITY REFUSAL"),
        "Startup throws critical security refusal when OTP_MODE=dev in production"
      );
    }
    assert(threw, "getOtpMode() threw in production when OTP_MODE=dev");

    // Missing OTP_MODE in production
    process.env.OTP_MODE = "";
    threw = false;
    try {
      getOtpMode();
    } catch (err: any) {
      threw = true;
      assert(
        err.message.includes("CRITICAL SECURITY REFUSAL"),
        "Startup throws critical security refusal when OTP_MODE is missing in production"
      );
    }
    assert(threw, "getOtpMode() threw in production when OTP_MODE is missing");

    // Valid live mode in production
    process.env.OTP_MODE = "live";
    const mode = getOtpMode();
    assert(mode === "live", "Startup succeeds cleanly in production when OTP_MODE=live");
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
    process.env.OTP_MODE = origOtpMode;
  }

  // Test 4: Rate limits and Lockout
  console.log("\nTest 4: Rate limits (cooldown, hourly limits) and 15-minute lockout");
  otpRateLimiter.resetAll();
  const phoneTest = "+910000000002"; // Station head

  // First send: should succeed
  const r1 = await devProvider.sendOtp(phoneTest, testIp);
  assert(r1.success === true, "1st OTP request succeeds");

  // Immediate 2nd send within 30s: cooldown rejection
  const r2 = await devProvider.sendOtp(phoneTest, testIp);
  assert(r2.success === false, "2nd immediate request rejected due to 30s cooldown");
  assert(
    typeof r2.cooldownSeconds === "number" && r2.cooldownSeconds > 0,
    "Returns cooldown retry-after seconds"
  );

  // Lockout after 5 wrong codes
  console.log("\n  Sub-test: Lockout after 5 wrong codes");
  otpRateLimiter.resetAll();
  await devProvider.sendOtp(phoneTest, testIp);

  for (let i = 1; i <= 4; i++) {
    const wrongAttempt = await devProvider.verifyOtp(phoneTest, "000000", testIp);
    assert(wrongAttempt.success === false, `Wrong attempt #${i} rejected with attempts remaining`);
  }

  // 5th wrong attempt triggers lockout
  const fifthAttempt = await devProvider.verifyOtp(phoneTest, "000000", testIp);
  assert(fifthAttempt.success === false, "5th wrong attempt fails");
  assert(
    fifthAttempt.error?.includes("locked for 15 minutes"),
    "5th failure triggers 15-minute lockout message"
  );

  // 6th attempt even with correct code must be rejected due to lockout
  const sixthAttemptWithCorrectCode = await devProvider.verifyOtp(phoneTest, "123456", testIp);
  assert(sixthAttemptWithCorrectCode.success === false, "Locked account rejects verification even with correct code");
  assert(
    sixthAttemptWithCorrectCode.error?.includes("Account locked"),
    "Returns account locked error message"
  );

  console.log("\n--------------------------------------------------------");
  console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
  console.log("--------------------------------------------------------\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error("Unhandled test error:", err);
  process.exit(1);
});
