import { createClient } from "@supabase/supabase-js";

export const PROD_REF = "jgekymuphznmfsbdexaw";

export const STAGING_USERS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "chetan@appwasher.test",
    phone: "+910000000001",
    name: "Chetan Sharma",
    role: "customer",
    station_id: null,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "station@appwasher.test",
    phone: "+910000000002",
    name: "Station Head (Vikram)",
    role: "station_head",
    station_id: "green_valley",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "rajesh@appwasher.test",
    phone: "+910000000003",
    name: "Rajesh Kumar",
    role: "washer",
    station_id: "green_valley",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    email: "suresh@appwasher.test",
    phone: "+910000000004",
    name: "Suresh Verma",
    role: "washer",
    station_id: "green_valley",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    email: "imran@appwasher.test",
    phone: "+910000000005",
    name: "Imran Khan",
    role: "washer",
    station_id: "green_valley",
  },
];

export async function runStagingSeed(targetUrl?: string, targetServiceKey?: string) {
  const supabaseUrl = targetUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceKey = targetServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY to seed staging.");
  }

  // HARD REFUSAL: Refuse production URL
  if (supabaseUrl.toLowerCase().includes(PROD_REF)) {
    throw new Error(`[CRITICAL SAFETY REFUSAL] Refusing to seed staging users against production project ${PROD_REF}!`);
  }

  const urlObj = new URL(supabaseUrl);
  console.log(`[STAGING_SEED] Target Host: ${urlObj.host}`);
  console.log(`[STAGING_SEED] Seeding 5 test users into staging auth and profiles...`);

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const created: { id: string; name: string; phone: string; role: string; station: string }[] = [];

  for (const u of STAGING_USERS) {
    // 1. Check or create in auth.users
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(u.id);

    if (!existingUser?.user) {
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        id: u.id,
        email: u.email,
        phone: u.phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { name: u.name, phone: u.phone, role: u.role },
      });
      if (createError) {
        console.warn(`User creation note for ${u.phone}:`, createError.message);
      }
    }

    // 2. Upsert profile with correct role and station
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: u.id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        station_id: u.station_id,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.warn(`Profile upsert error for ${u.phone}:`, profileError.message);
    } else {
      created.push({ id: u.id, name: u.name, phone: u.phone, role: u.role, station: u.station_id || "none" });
    }
  }

  console.log(`[STAGING_SEED] Successfully verified/seeded ${created.length} test accounts.`);
  return created;
}

if (require.main === module) {
  runStagingSeed()
    .then((users) => {
      console.log("Seeded accounts summary:");
      users.forEach((u) => console.log(`  - ${u.name} (${u.phone}): role=${u.role}, station=${u.station}`));
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
