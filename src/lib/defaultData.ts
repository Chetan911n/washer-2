import { Car, Address, Booking, User, StationWorker } from "./types";

export const CAR_PRICING: Record<string, number> = {
  Hatchback: 299,
  "Compact SUV": 399,
  Sedan: 449,
  SUV: 549,
  Luxury: 799,
};

export const INITIAL_CARS: Car[] = [
  {
    id: "car-1",
    name: "Hyundai Creta SX",
    type: "SUV",
    carNumber: "KA 05 MN 4589",
    color: "Polar White",
  },
  {
    id: "car-2",
    name: "Honda City V",
    type: "Sedan",
    carNumber: "KA 01 EK 9021",
    color: "Golden Brown",
  },
  {
    id: "car-3",
    name: "Maruti Swift ZXi",
    type: "Hatchback",
    carNumber: "KA 03 HQ 1122",
    color: "Fire Red",
  },
];

export const INITIAL_ADDRESSES: Address[] = [
  {
    id: "addr-1",
    label: "Home",
    street: "Prestige Ferns Residency, Tower 4",
    apartmentName: "Flat 802",
    parkingSpot: "Basement 2, Pillar #45 (Covered Bay)",
    city: "Bangalore",
  },
  {
    id: "addr-2",
    label: "Office",
    street: "EcoWorld Business Park, Block 3",
    apartmentName: "Ground Floor Visitor Parking",
    parkingSpot: "Slot V-18",
    city: "Bangalore",
  },
];

export const DEFAULT_CUSTOMER: User = {
  id: "cust-01",
  name: "Chetan Sharma",
  username: "chetan",
  password: "password123",
  phone: "+91 98765 43210",
  email: "chetan@example.com",
  role: "customer",
  garage: INITIAL_CARS,
  addresses: INITIAL_ADDRESSES,
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

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "book-101",
    bookingCode: "CW-8421",
    customerId: "cust-01",
    customerName: "Chetan Sharma",
    customerPhone: "+91 98765 43210",
    address: INITIAL_ADDRESSES[0],
    date: "2026-10-24",
    timeSlot: "07:30 AM - 09:00 AM",
    cars: [INITIAL_CARS[0], INITIAL_CARS[1]],
    washType: "Exterior Foam Wash",
    totalAmount: 998,
    status: "ASSIGNED_TO_STATION", // Station Head needs to assign to a worker under them!
    stationId: "station-01",
    stationName: "SpeedShine Central Hub",
    washer: DEFAULT_WASHER,
    beforePhotos: [],
    afterPhotos: [],
    createdAt: new Date().toISOString(),
  },
];
