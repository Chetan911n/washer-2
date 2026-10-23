export type UserRole = "customer" | "station_head" | "washer";

export type CarType = "Hatchback" | "Sedan" | "SUV" | "Compact SUV" | "Luxury";

export interface Car {
  id: string;
  name: string; // e.g. "Hyundai Creta"
  type: CarType;
  carNumber: string; // e.g. "MH 12 AB 1234"
  color?: string;
}

export interface Address {
  id: string;
  label: string; // e.g. "Home", "Office"
  street: string;
  apartmentName?: string;
  parkingSpot: string; // e.g. "Basement 2, Slot #45"
  city: string;
}

export interface InspectionPhoto {
  id: string;
  carId: string;
  carNumber: string;
  carName: string;
  type: "before" | "after";
  angle: "Front" | "Rear" | "Left Side" | "Right Side" | "Scratches / Pre-existing";
  imageUrl: string;
  timestamp: string;
  notes?: string;
}

export interface StationWorker {
  id: string;
  name: string;
  phone: string;
  completedJobs: number;
  avatarUrl?: string;
}

export interface SettlementRecord {
  totalCollected: number;
  stationShare: number; // Commission kept by station head/washers
  platformShare: number; // Online fee transferred to app platform
  paymentMethod: "CASH" | "UPI";
  isSettledOnline: boolean;
  settledAt?: string;
  onlineTransferRef?: string;
}

export type BookingStatus =
  | "PENDING"
  | "ASSIGNED_TO_STATION" // Job assigned to Station Head
  | "ASSIGNED_TO_WORKER"  // Station Head delegated to on-site washer
  | "WASHER_ASSIGNED"
  | "INSPECTION_PENDING"
  | "WASH_IN_PROGRESS"
  | "JOB_COMPLETED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "REVIEWED";

export interface Booking {
  id: string;
  bookingCode: string; // e.g. "CW-9021"
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: Address;
  date: string; // e.g. "2026-10-24"
  timeSlot: string; // e.g. "08:00 AM - 10:00 AM"
  cars: Car[];
  washType: "Exterior Foam Wash" | "Deep Wash & Polish" | "Interior + Exterior";
  totalAmount: number;
  status: BookingStatus;
  stationId?: string;
  stationName?: string;
  assignedWorker?: StationWorker;
  washer?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    avatarUrl: string;
  };
  beforePhotos: InspectionPhoto[];
  afterPhotos: InspectionPhoto[];
  whatsappSentAt?: string;
  payment?: {
    amount: number;
    method: "UPI" | "CASH";
    transactionRef?: string;
    upiId?: string;
    paidAt?: string;
    status: "PENDING" | "SUCCESS";
  };
  settlement?: SettlementRecord;
  review?: {
    rating: number;
    tags: string[];
    comment: string;
    tipAmount?: number;
    createdAt: string;
  };
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  password?: string;
  phone: string;
  email: string;
  role: UserRole;
  stationName?: string;
  stationCrew?: StationWorker[];
  garage: Car[];
  addresses: Address[];
  isLoggedIn?: boolean;
}
