"use client";

import { useState, useEffect } from "react";
import { Booking, Car, Address, User, UserRole, InspectionPhoto } from "./types";
import { DEFAULT_CUSTOMER, DEFAULT_WASHER, INITIAL_BOOKINGS, CAR_PRICING } from "./defaultData";

const STORAGE_KEYS = {
  USER: "app_washer_user",
  BOOKINGS: "app_washer_bookings",
  ACTIVE_ROLE: "app_washer_role",
};

export class WasherStore {
  private static listeners: Set<() => void> = new Set();

  static getUser(): User {
    if (typeof window === "undefined") return DEFAULT_CUSTOMER;
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_CUSTOMER));
      return DEFAULT_CUSTOMER;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_CUSTOMER;
    }
  }

  static setUser(user: User) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    this.notify();
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
    const user = this.getUser();
    const newCar: Car = {
      ...car,
      id: "car-" + Date.now(),
    };
    user.garage.push(newCar);
    this.setUser(user);
    return newCar;
  }

  static createBooking(data: {
    cars: Car[];
    address: Address;
    date: string;
    timeSlot: string;
    washType: Booking["washType"];
  }): Booking {
    const user = this.getUser();
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
      status: "WASHER_ASSIGNED",
      washer: DEFAULT_WASHER,
      beforePhotos: [],
      afterPhotos: [],
      createdAt: new Date().toISOString(),
    };

    const bookings = [newBooking, ...this.getBookings()];
    this.setBookings(bookings);
    return newBooking;
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

  static markPaymentPaid(bookingId: string, transactionRef?: string) {
    const bookings = this.getBookings().map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: "PAID" as const,
          payment: {
            amount: b.totalAmount,
            method: "UPI" as const,
            transactionRef: transactionRef || "UPI" + Date.now().toString().slice(-8),
            upiId: "washerpay@okhdfcbank",
            paidAt: new Date().toISOString(),
            status: "SUCCESS" as const,
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
  const [user, setUser] = useState<User>(DEFAULT_CUSTOMER);
  const [role, setRole] = useState<UserRole>("customer");
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);

  useEffect(() => {
    const sync = () => {
      setUser(WasherStore.getUser());
      setRole(WasherStore.getRole());
      setBookings(WasherStore.getBookings());
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
    role,
    bookings,
    setRole: (r: UserRole) => WasherStore.setRole(r),
    setUser: (u: User) => WasherStore.setUser(u),
    addCarToGarage: (c: Omit<Car, "id">) => WasherStore.addCarToGarage(c),
    createBooking: (d: Parameters<typeof WasherStore.createBooking>[0]) =>
      WasherStore.createBooking(d),
    addBeforePhotos: (id: string, p: InspectionPhoto[]) =>
      WasherStore.addBeforePhotos(id, p),
    updateAfterPhotos: (id: string, p: InspectionPhoto[]) =>
      WasherStore.updateAfterPhotos(id, p),
    completeJob: (id: string, p: InspectionPhoto[]) => WasherStore.completeJob(id, p),
    markPaymentPaid: (id: string, ref?: string) => WasherStore.markPaymentPaid(id, ref),
    submitReview: (id: string, r: Parameters<typeof WasherStore.submitReview>[1]) =>
      WasherStore.submitReview(id, r),
  };
}
