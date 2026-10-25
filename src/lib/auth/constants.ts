// Seeded development test users with clearly fake test numbers
// Do not use real numbers in migrations or seed files.
export interface SeededUser {
  id: string;
  name: string;
  phone: string;
  role: "customer" | "station_head" | "washer";
  stationId?: string;
  stationName?: string;
}

export const SEEDED_DEV_USERS: SeededUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Chetan Sharma",
    phone: "+910000000001",
    role: "customer",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Station Head (Vikram)",
    phone: "+910000000002",
    role: "station_head",
    stationId: "green_valley",
    stationName: "Green Valley Station",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Rajesh Kumar",
    phone: "+910000000003",
    role: "washer",
    stationId: "green_valley",
    stationName: "Green Valley Station",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "Suresh Verma",
    phone: "+910000000004",
    role: "washer",
    stationId: "green_valley",
    stationName: "Green Valley Station",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    name: "Imran Khan",
    phone: "+910000000005",
    role: "washer",
    stationId: "green_valley",
    stationName: "Green Valley Station",
  },
];

export const DEV_FIXED_OTP = "123456";

export const OTP_CONFIG = {
  EXPIRY_SECONDS: 300, // 5 minutes
  COOLDOWN_SECONDS: 30, // 30 seconds
  MAX_REQUESTS_PER_PHONE_HOUR: 5,
  MAX_REQUESTS_PER_IP_HOUR: 20,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_SECONDS: 900, // 15 minutes
} as const;
