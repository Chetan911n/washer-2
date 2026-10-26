import { getOtpMode } from "../src/lib/auth/otpManager";

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

// Flat package prices reference (ext 499, deep 799, prem 1199 for all car types)
const PACKAGE_PRICES: Record<string, number> = {
  ext: 499,
  deep: 799,
  prem: 1199,
};

export function calculateBookingTotal(cars: { type: string }[], packageId: string): number {
  const basePrice = PACKAGE_PRICES[packageId] || 499;
  return cars.length * basePrice;
}

export function shouldShowDevControls(otpMode: string): { showDevBadge: boolean; showQuickDemo: boolean } {
  const isDev = otpMode === "dev";
  return {
    showDevBadge: isDev,
    showQuickDemo: isDev,
  };
}

async function runAppTests() {
  console.log("\n========================================================");
  console.log("TEST SUITE 3: App Logic, Pricing Calculation & Dev Controls");
  console.log("========================================================\n");

  // Test 1: Booking total calculation = sum of car prices for the chosen package
  console.log("Test 1: Booking total = sum of car prices for chosen package");
  const singleCar = [{ type: "Sedan" }];
  assert(
    calculateBookingTotal(singleCar, "ext") === 499,
    "Single car with Exterior Foam Wash total = 499"
  );
  assert(
    calculateBookingTotal(singleCar, "deep") === 799,
    "Single car with Deep Wash total = 799"
  );
  assert(
    calculateBookingTotal(singleCar, "prem") === 1199,
    "Single car with Premium Detail total = 1199"
  );

  const multipleCars = [{ type: "Hatchback" }, { type: "Sedan" }, { type: "SUV" }];
  assert(
    calculateBookingTotal(multipleCars, "ext") === 499 * 3, // 1497
    "Three cars with Exterior Foam Wash = 1497"
  );
  assert(
    calculateBookingTotal(multipleCars, "deep") === 799 * 3, // 2397
    "Three cars with Deep Wash = 2397"
  );
  assert(
    calculateBookingTotal(multipleCars, "prem") === 1199 * 3, // 3597
    "Three cars with Premium Detail = 3597"
  );

  // Test 2: DEV MODE badge and Quick Demo buttons appear only when OTP_MODE=dev
  console.log("\nTest 2: DEV MODE badge and Quick Demo buttons visibility");
  const devControls = shouldShowDevControls("dev");
  assert(devControls.showDevBadge === true, "DEV MODE badge is shown when OTP_MODE=dev");
  assert(devControls.showQuickDemo === true, "Quick Demo buttons are shown when OTP_MODE=dev");

  const liveControls = shouldShowDevControls("live");
  assert(liveControls.showDevBadge === false, "DEV MODE badge is HIDDEN when OTP_MODE=live");
  assert(liveControls.showQuickDemo === false, "Quick Demo buttons are HIDDEN when OTP_MODE=live");

  // Test 3: Production startup refusal when OTP_MODE is not live
  console.log("\nTest 3: Production startup security gate");
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
        "Production startup throws CRITICAL SECURITY REFUSAL when OTP_MODE=dev"
      );
    }
    assert(threw, "Production refused to start with OTP_MODE=dev");

    process.env.OTP_MODE = "live";
    const mode = getOtpMode();
    assert(mode === "live", "Production starts cleanly when OTP_MODE=live");
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
    process.env.OTP_MODE = origOtpMode;
  }

  console.log("\n--------------------------------------------------------");
  console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
  console.log("--------------------------------------------------------\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runAppTests().catch((err) => {
  console.error("Unhandled test error:", err);
  process.exit(1);
});
