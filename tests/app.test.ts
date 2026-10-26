import { getOtpMode, PROD_PROJECT_REF } from "../src/lib/auth/otpManager";
import { runStagingSeed } from "../scripts/seed-staging";

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

export function shouldShowDevControls(otpMode: string, supabaseUrl: string = ""): {
  showDevBadge: boolean;
  showQuickDemo: boolean;
  showStagingBanner: boolean;
} {
  const isProdDb = supabaseUrl.toLowerCase().includes(PROD_PROJECT_REF);
  const isDev = otpMode === "dev" && !isProdDb;
  return {
    showDevBadge: isDev,
    showQuickDemo: isDev,
    showStagingBanner: isDev,
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

  // Test 2: DEV MODE badge, STAGING banner, and Quick Demo buttons visibility
  console.log("\nTest 2: DEV MODE badge, STAGING banner, and Quick Demo buttons visibility");
  const devControls = shouldShowDevControls("dev", "https://appwasher-staging.supabase.co");
  assert(devControls.showDevBadge === true, "DEV MODE badge is shown on staging when OTP_MODE=dev");
  assert(devControls.showQuickDemo === true, "Quick Demo buttons are shown on staging when OTP_MODE=dev");
  assert(devControls.showStagingBanner === true, "STAGING · DEV MODE banner is shown on staging when OTP_MODE=dev");

  const liveControls = shouldShowDevControls("live", `https://${PROD_PROJECT_REF}.supabase.co`);
  assert(liveControls.showDevBadge === false, "DEV MODE badge is HIDDEN on production when OTP_MODE=live");
  assert(liveControls.showQuickDemo === false, "Quick Demo buttons are HIDDEN on production when OTP_MODE=live");
  assert(liveControls.showStagingBanner === false, "STAGING · DEV MODE banner is HIDDEN on production when OTP_MODE=live");

  const devOnProdControls = shouldShowDevControls("dev", `https://${PROD_PROJECT_REF}.supabase.co`);
  assert(devOnProdControls.showQuickDemo === false, "Quick Demo buttons are strictly HIDDEN if URL targets production even if OTP_MODE=dev");
  assert(devOnProdControls.showDevBadge === false, "DEV MODE badge is strictly HIDDEN if URL targets production even if OTP_MODE=dev");

  // Test 3: Production startup security gate
  console.log("\nTest 3: Production startup security gate");
  const origNodeEnv = process.env.NODE_ENV;
  const origOtpMode = process.env.OTP_MODE;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  try {
    (process.env as any).NODE_ENV = "production";
    process.env.OTP_MODE = "dev";
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${PROD_PROJECT_REF}.supabase.co`;
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
    assert(mode === "live", "Production starts cleanly when OTP_MODE=live and targeting production");
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
    process.env.OTP_MODE = origOtpMode;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  }

  // Test 4: Cross-environment safety guards
  console.log("\nTest 4: Cross-environment safety guards");
  try {
    (process.env as any).NODE_ENV = "development";

    // 4.1 Dev OTP against production URL refused
    process.env.OTP_MODE = "dev";
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${PROD_PROJECT_REF}.supabase.co`;
    let threwDevProd = false;
    try {
      getOtpMode();
    } catch (err: any) {
      threwDevProd = true;
      assert(
        err.message.includes("Dev OTP is not allowed against the production database."),
        "Dev OTP against production URL is strictly refused"
      );
    }
    assert(threwDevProd, "Refused execution when OTP_MODE=dev targets production URL");

    // 4.2 Live WhatsApp OTP against staging URL refused
    process.env.OTP_MODE = "live";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://appwasher-staging.supabase.co";
    let threwLiveStaging = false;
    try {
      getOtpMode();
    } catch (err: any) {
      threwLiveStaging = true;
      assert(
        err.message.includes("Live WhatsApp OTP is not allowed against a staging database."),
        "Live WhatsApp OTP against staging URL is strictly refused"
      );
    }
    assert(threwLiveStaging, "Refused execution when OTP_MODE=live targets staging URL");

    // 4.3 Staging seed script hard refusal on production URL
    let threwSeedProd = false;
    try {
      await runStagingSeed(`https://${PROD_PROJECT_REF}.supabase.co`, "test-service-key");
    } catch (err: any) {
      threwSeedProd = true;
      assert(
        err.message.includes("Refusing to seed staging users against production project"),
        "Staging seed script strictly refuses execution against production project URL"
      );
    }
    assert(threwSeedProd, "Staging seed script refused production URL target");
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
    process.env.OTP_MODE = origOtpMode;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
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
