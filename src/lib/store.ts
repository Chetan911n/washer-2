"use client";

import { useState, useEffect } from "react";
import {
  Booking,
  Car,
  Address,
  User,
  UserRole,
  InspectionPhoto,
  StationWorker,
} from "./types";
import {
  DEFAULT_CUSTOMER,
  DEFAULT_WASHER,
  DEFAULT_STATION_HEAD,
  INITIAL_BOOKINGS,
  CAR_PRICING,
  STATION_CREW,
} from "./defaultData";

const STORAGE_KEYS = {
  USER: "app_washer_user",
  BOOKINGS: "app_washer_bookings",
  ACTIVE_ROLE: "app_washer_role",
};

export class WasherStore {
  private static listeners: Set<() => void> = new Set();

  static getUser(): User | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (!stored) return null;
    try {
      const user = JSON.parse(stored);
      if (!user.isLoggedIn) return null;
      return user;
    } catch {
      return null;
    }
  }

  static setUser(user: User | null) {
    if (typeof window === "undefined") return;
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } else {
      localStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify({ ...user, isLoggedIn: true })
      );
    }
    this.notify();
  }

  static logout() {
    this.setUser(null);
  }

  static loginDemo(role: UserRole = "customer") {
    if (role === "station_head") {
      this.setUser({ ...DEFAULT_STATION_HEAD, isLoggedIn: true });
      this.setRole("station_head");
    } else if (role === "washer") {
      this.setUser({
        ...DEFAULT_CUSTOMER,
        name: DEFAULT_WASHER.name,
        username: DEFAULT_WASHER.username,
        role: "washer",
        phone: DEFAULT_WASHER.phone,
        isLoggedIn: true,
      });
      this.setRole("washer");
    } else {
      this.setUser({ ...DEFAULT_CUSTOMER, isLoggedIn: true });
      this.setRole("customer");
    }
  }

  static getRole(): UserRole {
    if (typeof window === "undefined") return "customer";
    return (localStorage.getItem(STORAGE_KEYS.ACTIVE_ROLE) as UserRole) || "customer";
  }

  static setRole(role: UserRole) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, role);
    this.notify();
  }

  static getBookings(): Booking[] {
    if (typeof window === "undefined") return INITIAL_BOOKINGS;
    const stored = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_BOOKINGS;
    }
  }

  static setBookings(bookings: Booking[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    this.notify();
  }

  static addCarToGarage(car: Omit<Car, "id">): Car {
    const user = this.getUser() || { ...DEFAULT_CUSTOMER, isLoggedIn: true, garage: [], addresses: [] };
    const newCar: Car = {
      ...car,
      id: "car-" + Date.now(),
    };
    user.garage.push(newCar);
    this.setUser(user);
    return newCar;
  }

  static addAddressToUser(address: Omit<Address, "id">): Address {
    const user = this.getUser() || { ...DEFAULT_CUSTOMER, isLoggedIn: true, garage: [], addresses: [] };
    const newAddr: Address = {
      ...address,
      id: "addr-" + Date.now(),
    };
    user.addresses = [...(user.addresses || []), newAddr];
    this.setUser(user);
    return newAddr;
  }

  static createBooking(data: {
    cars: Car[];
    address: Address;
    date: string;
    timeSlot: string;
    washType: Booking["washType"];
  }): Booking {
    const user = this.getUser() || DEFAULT_CUSTOMER;
    const totalAmount = data.cars.reduce(
      (sum, car) => sum + (CAR_PRICING[car.type] || 399),
      0
    );

    const newBooking: Booking = {
      id: "book-" + Date.now(),
      bookingCode: "CW-" + Math.floor(1000 + Math.random() * 9000),
      customerId: user.id,
      customerName: user.name,
      customerPhone: user.phone,
      address: data.address,
      date: data.date,
      timeSlot: data.timeSlot,
      cars: data.cars,
      washType: data.washType,
      totalAmount,
      status: "ASSIGNED_TO_STATION", // Goes directly to Station Head for dispatch!
      stationId: "station-01",
      stationName: "SpeedShine Central Hub",
      beforePhotos: [],
      afterPhotos: [],
      createdAt: new Date().toISOString(),
    };

    const bookings = [newBooking, ...this.getBookings()];
    this.setBookings(bookings);
    return newBooking;
  }

  // Station Head assigns job to a specific crew member/technician
  static assignBookingToWorker(bookingId: string, worker: StationWorker) {
    const bookings = this.getBookings().map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          assignedWorker: worker,
          washer: {
            id: worker.id,
            name: worker.name,
            phone: worker.phone,
            rating: 4.92,
            avatarUrl: worker.avatarUrl || DEFAULT_WASHER.avatarUrl,
          },
          status: "ASSIGNED_TO_WORKER" as const,
        };
      }
      return b;
    });
    this.setBookings(bookings);
  }

  static addBeforePhotos(bookingId: string, photos: InspectionPhoto[]) {
    const bookings = this.getBookings().map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          beforePhotos: [...b.beforePhotos, ...photos],
          status: "WASH_IN_PROGRESS" as const,
        };
      }
      return b;
    });
    this.setBookings(bookings);
  }

  static updateAfterPhotos(bookingId: string, photos: InspectionPhoto[]) {
    const bookings = this.getBookings().map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          afterPhotos: photos,
        };
      }
      return b;
    });
    this.setBookings(bookings);
  }

  static completeJob(bookingId: string, afterPhotos: InspectionPhoto[]): Booking | undefined {
    let completedBooking: Booking | undefined;
    const bookings = this.getBookings().map((b) => {
      if (b.id === bookingId) {
        completedBooking = {
          ...b,
          afterPhotos,
          status: "PAYMENT_PENDING" as const,
          whatsappSentAt: new Date().toISOString(),
          payment: {
            amount: b.totalAmount,
            method: "UPI" as const,
            upiId: "washerpay@okhdfcbank",
            status: "PENDING" as const,
          },
        };
        return completedBooking;
      }
      return b;
    });
    this.setBookings(bookings);
    return completedBooking;
  }

  static markPaymentPaid(
    bookingId: string,
    method: "UPI" | "CASH" = "UPI",
    transactionRef?: string
  ) {
    const bookings = this.getBookings().map((b) => {
      if (b.id === bookingId) {
        const platformShare = Math.round(b.totalAmount * 0.2); // 20% App platform fee
        const stationShare = b.totalAmount - platformShare; // 80% Station Head & Washer earnings

        return {
          ...b,
          status: "PAID" as const,
          payment: {
            amount: b.totalAmount,
            method,
            transactionRef:
              transactionRef || (method === "CASH" ? "CASH-REC-" : "UPI-") + Date.now().toString().slice(-6),
            upiId: method === "UPI" ? "washerpay@okhdfcbank" : undefined,
            paidAt: new Date().toISOString(),
            status: "SUCCESS" as const,
          },
          settlement: {
            totalCollected: b.totalAmount,
            stationShare,
            platformShare,
            paymentMethod: method,
            isSettledOnline: method === "UPI", // If customer paid online, already settled; if cash, station head settles online
          },
        };
      }
      return b;
    });
    this.setBookings(bookings);
  }

  // Station Head settles the online payment to the app owner
  static settlePlatformShareOnline(bookingId: string, transferRef?: string) {
    const bookings = this.getBookings().map((b) => {
      if (b.id === bookingId && b.settlement) {
        return {
          ...b,
          settlement: {
            ...b.settlement,
            isSettledOnline: true,
            settledAt: new Date().toISOString(),
            onlineTransferRef:
              transferRef || "NEFT-APP-" + Date.now().toString().slice(-6),
          },
        };
      }
      return b;
    });
    this.setBookings(bookings);
  }

  static submitReview(
    bookingId: string,
    review: {
      rating: number;
      tags: string[];
      comment: string;
      tipAmount?: number;
    }
  ) {
    const bookings = this.getBookings().map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: "REVIEWED" as const,
          review: {
            ...review,
            createdAt: new Date().toISOString(),
          },
        };
      }
      return b;
    });
    this.setBookings(bookings);
  }

  static subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify() {
    this.listeners.forEach((fn) => fn());
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("app_washer_sync"));
    }
  }
}

export function useAppWasherStore() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [role, setRole] = useState<UserRole>("customer");
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);

  useEffect(() => {
    const sync = () => {
      setUser(WasherStore.getUser());
      setRole(WasherStore.getRole());
      setBookings(WasherStore.getBookings());
      setIsLoaded(true);
    };

    sync();

    const unsub = WasherStore.subscribe(sync);
    const handleStorage = (e: StorageEvent) => {
      if (Object.values(STORAGE_KEYS).includes(e.key || "")) {
        sync();
      }
    };
    const handleCustomSync = () => sync();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("app_washer_sync", handleCustomSync);

    return () => {
      unsub();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("app_washer_sync", handleCustomSync);
    };
  }, []);

  return {
    user,
    isLoaded,
    role,
    bookings,
    stationCrew: STATION_CREW,
    setRole: (r: UserRole) => WasherStore.setRole(r),
    setUser: (u: User | null) => WasherStore.setUser(u),
    logout: () => WasherStore.logout(),
    loginDemo: (r: UserRole = "customer") => WasherStore.loginDemo(r),
    addCarToGarage: (c: Omit<Car, "id">) => WasherStore.addCarToGarage(c),
    addAddressToUser: (a: Omit<Address, "id">) => WasherStore.addAddressToUser(a),
    createBooking: (d: Parameters<typeof WasherStore.createBooking>[0]) =>
      WasherStore.createBooking(d),
    assignBookingToWorker: (bookingId: string, worker: StationWorker) =>
      WasherStore.assignBookingToWorker(bookingId, worker),
    addBeforePhotos: (id: string, p: InspectionPhoto[]) =>
      WasherStore.addBeforePhotos(id, p),
    updateAfterPhotos: (id: string, p: InspectionPhoto[]) =>
      WasherStore.updateAfterPhotos(id, p),
    completeJob: (id: string, p: InspectionPhoto[]) => WasherStore.completeJob(id, p),
    markPaymentPaid: (id: string, method?: "UPI" | "CASH", ref?: string) =>
      WasherStore.markPaymentPaid(id, method, ref),
    settlePlatformShareOnline: (id: string, ref?: string) =>
      WasherStore.settlePlatformShareOnline(id, ref),
    submitReview: (id: string, r: Parameters<typeof WasherStore.submitReview>[1]) =>
      WasherStore.submitReview(id, r),
  };
}
