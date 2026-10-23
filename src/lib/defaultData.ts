import { Car, Address, Booking, User, StationWorker } from "./types";

export const CAR_PRICING: Record<string, number> = {
  Hatchback: 299,
  "Compact SUV": 399,
  Sedan: 449,
  SUV: 549,
  Luxury: 799,
};

export const INITIAL_CARS: Car[] = [];

export const INITIAL_ADDRESSES: Address[] = [];

export const DEFAULT_CUSTOMER: User = {
  id: "cust-01",
  name: "Chetan Sharma",
  username: "chetan",
  password: "password123",
  phone: "+91 98765 43210",
  email: "chetan@example.com",
  role: "customer",
  garage: [],
  addresses: [],
};

export const STATION_CREW: StationWorker[] = [
  {
    id: "wash-01",
    name: "Rajesh Kumar",
    phone: "+91 91234 56789",
    completedJobs: 348,
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "wash-02",
    name: "Suresh Verma",
    phone: "+91 92345 67890",
    completedJobs: 215,
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "wash-03",
    name: "Imran Khan",
    phone: "+91 93456 78901",
    completedJobs: 178,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  },
];

export const DEFAULT_STATION_HEAD: User = {
  id: "station-01",
  name: "Vikram Singh (Station Head)",
  username: "vikram",
  password: "station123",
  phone: "+91 99887 76655",
  email: "vikram.hub@appwasher.com",
  role: "station_head",
  stationName: "SpeedShine Central Hub - South Bangalore",
  stationCrew: STATION_CREW,
  garage: [],
  addresses: [],
};

export const DEFAULT_WASHER = {
  id: "wash-01",
  name: "Rajesh Kumar",
  username: "rajesh",
  password: "washer123",
  phone: "+91 91234 56789",
  stationId: "station-01",
  stationName: "SpeedShine Central Hub",
  rating: 4.92,
  completedJobs: 348,
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
};

export const INITIAL_BOOKINGS: Booking[] = [];
