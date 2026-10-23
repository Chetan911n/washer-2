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
  USERS: "app_washer_registered_users",
};

export const INITIAL_REGISTERED_USERS: User[] = [
  { ...DEFAULT_CUSTOMER, isLoggedIn: true },
  { ...DEFAULT_STATION_HEAD, isLoggedIn: true },
  {
    id: DEFAULT_WASHER.id,
    name: DEFAULT_WASHER.name,
    username: DEFAULT_WASHER.username,
    password: DEFAULT_WASHER.password,
    phone: DEFAULT_WASHER.phone,
    email: "rajesh.washer@appwasher.com",
    role: "washer",
    garage: [],
    addresses: [],
    isLoggedIn: true,
  },
  {
    id: "wash-02",
    name: "Suresh Verma",
    username: "suresh",
    password: "washer123",
    phone: "+91 92345 67890",
    email: "suresh.washer@appwasher.com",
    role: "washer",
    garage: [],
    addresses: [],
    isLoggedIn: true,
  },
];

export class WasherStore {
  private static listeners: Set<() => void> = new Set();

  static getRegisteredUsers(): User[] {
    if (typeof window === "undefined") return INITIAL_REGISTERED_USERS;
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!stored) {
      localStorage.setItem(
        STORAGE_KEYS.USERS,
        JSON.stringify(INITIAL_REGISTERED_USERS)
      );
      return INITIAL_REGISTERED_USERS;
    }
    try {
      const users: User[] = JSON.parse(stored);
      if (!localStorage.getItem("app_washer_users_cars_reset") || !localStorage.getItem("app_washer_users_addresses_reset")) {
        localStorage.setItem("app_washer_users_cars_reset", "true");
        localStorage.setItem("app_washer_users_addresses_reset", "true");
        const cleaned = users.map((u) => ({ ...u, garage: [], addresses: [] }));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleaned));
        return cleaned;
      }
      return users;
    } catch {
      return INITIAL_REGISTERED_USERS;
    }
  }

  static registerUser(newUser: User): User {
    const users = this.getRegisteredUsers();
    const existingIndex = users.findIndex(
      (u) =>
        (u.username &&
          u.username.toLowerCase() === newUser.username?.toLowerCase()) ||
        u.phone === newUser.phone ||
        u.email === newUser.email
    );
    let updatedUsers: User[];
    if (existingIndex >= 0) {
      updatedUsers = users.map((u, i) =>
        i === existingIndex ? { ...u, ...newUser, isLoggedIn: true } : u
      );
    } else {
      updatedUsers = [...users, { ...newUser, isLoggedIn: true }];
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    }
    this.setUser({ ...newUser, isLoggedIn: true });
    if (newUser.role) {
      this.setRole(newUser.role);
    }
    return newUser;
  }

  static authenticateUser(params: {
    identifier: string;
    password?: string;
    role?: UserRole;
  }): { success: boolean; user?: User; error?: string } {
    const users = this.getRegisteredUsers();
    const trimmed = params.identifier.trim().toLowerCase();
    const cleanPhone = params.identifier.replace(/\D/g, "");

    const matched = users.find((u) => {
      const matchUsername = u.username?.toLowerCase() === trimmed;
      const matchEmail = u.email?.toLowerCase() === trimmed;
      const matchPhone =
        cleanPhone.length >= 10 &&
        u.phone.replace(/\D/g, "").includes(cleanPhone);
      return matchUsername || matchEmail || matchPhone;
    });

    if (!matched) {
      return {
        success: false,
        error: `Account "${params.identifier}" not found. For testing, use demo account: chetan / password123`,
      };
    }

    if (
      params.password !== undefined &&
      matched.password &&
      matched.password !== params.password
    ) {
      return {
        success: false,
        error: `Incorrect password for ${matched.name}. Demo password is "${matched.password}".`,
      };
    }

    const finalRole = params.role || matched.role || "customer";
    const loggedInUser: User = { ...matched, role: finalRole, isLoggedIn: true };
    this.setUser(loggedInUser);
    this.setRole(finalRole);
    return { success: true, user: loggedInUser };
  }

  static getUser(): User | null {
    if (typeof window === "undefined") return null;
    if (!localStorage.getItem("app_washer_cars_reset_done") || !localStorage.getItem("app_washer_addresses_reset_done")) {
      localStorage.setItem("app_washer_cars_reset_done", "true");
      localStorage.setItem("app_washer_addresses_reset_done", "true");
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.garage = [];
          parsed.addresses = [];
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(parsed));
          return parsed.isLoggedIn ? parsed : null;
        } catch {}
      }
      return null;
    }
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
      if (!localStorage.getItem("app_washer_bookings_reset")) {
        localStorage.setItem("app_washer_bookings_reset", "true");
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
        return [];
      }
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
    user.garage = [...(user.garage || []), newCar];
    this.setUser(user);
    // Also update in registered users
    const users = this.getRegisteredUsers().map((u) =>
      u.id === user.id ? { ...u, garage: user.garage } : u
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    return newCar;
  }

  static removeCarFromGarage(carId: string) {
    const user = this.getUser();
    if (!user) return;
    user.garage = (user.garage || []).filter((c) => c.id !== carId);
    this.setUser(user);
    const users = this.getRegisteredUsers().map((u) =>
      u.id === user.id ? { ...u, garage: user.garage } : u
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  static removeAllCarsFromGarage() {
    const user = this.getUser();
    if (!user) return;
    user.garage = [];
    this.setUser(user);
    const users = this.getRegisteredUsers().map((u) =>
      u.id === user.id ? { ...u, garage: [] } : u
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  static addAddressToUser(address: Omit<Address, "id">): Address {
    const user = this.getUser() || { ...DEFAULT_CUSTOMER, isLoggedIn: true, garage: [], addresses: [] };
    const newAddr: Address = {
      ...address,
      id: "addr-" + Date.now(),
    };
    user.addresses = [...(user.addresses || []), newAddr];
    this.setUser(user);
    const users = this.getRegisteredUsers().map((u) =>
      u.id === user.id ? { ...u, addresses: user.addresses } : u
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    return newAddr;
  }

  static removeAddressFromUser(addressId: string) {
    const user = this.getUser();
    if (!user) return;
    user.addresses = (user.addresses || []).filter((a) => a.id !== addressId);
    this.setUser(user);
    const users = this.getRegisteredUsers().map((u) =>
      u.id === user.id ? { ...u, addresses: user.addresses } : u
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  static removeAllAddressesFromUser() {
    const user = this.getUser();
    if (!user) return;
    user.addresses = [];
    this.setUser(user);
    const users = this.getRegisteredUsers().map((u) =>
      u.id === user.id ? { ...u, addresses: [] } : u
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
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
    registerUser: (u: User) => WasherStore.registerUser(u),
    authenticateUser: (params: Parameters<typeof WasherStore.authenticateUser>[0]) =>
      WasherStore.authenticateUser(params),
    logout: () => WasherStore.logout(),
    loginDemo: (r: UserRole = "customer") => WasherStore.loginDemo(r),
    addCarToGarage: (c: Omit<Car, "id">) => WasherStore.addCarToGarage(c),
    removeCarFromGarage: (id: string) => WasherStore.removeCarFromGarage(id),
    removeAllCarsFromGarage: () => WasherStore.removeAllCarsFromGarage(),
    addAddressToUser: (a: Omit<Address, "id">) => WasherStore.addAddressToUser(a),
    removeAddressFromUser: (id: string) => WasherStore.removeAddressFromUser(id),
    removeAllAddressesFromUser: () => WasherStore.removeAllAddressesFromUser(),
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
