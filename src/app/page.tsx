"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  fetchUserBookings,
  fetchUserCars,
  addUserCar,
  deleteUserCar,
  fetchUserParkingSpot,
  saveUserParkingSpot,
  createBookingRpc,
  assignWasherRpc,
  startWashRpc,
  completeJobRpc,
  recordCashPaymentRpc,
  cancelBookingRpc,
  submitReviewRpc,
  settlePlatformFeeRpc,
  uploadBookingPhoto,
  subscribeToRealtimeBookings,
  migrateLegacyLocalData,
  DBBooking,
} from "@/lib/dataService";
import { SEEDED_DEV_USERS } from "@/lib/auth/constants";

const K = "appwasher_v2";

interface CarItem {
  id: string | number;
  name: string;
  type: string;
  plate: string;
}

interface BookingItem {
  id: string;
  cars: CarItem[];
  pkg: string;
  d: string;
  sl: string;
  addr: string;
  spot: string;
  total: number;
  st: "Pending" | "Assigned" | "Washing" | "Awaiting Payment" | "Paid" | "Cancelled";
  w: string | null;
  bf: number[]; // 5 items
  af: number[]; // 4 items
  pay: "Cash" | "UPI" | null;
  rv: { r: number; tags: string[]; tip: number } | null;
}

interface AppState {
  role: "customer" | "station" | "washer" | null;
  cars: CarItem[];
  addr: string;
  spot: string;
  spotId?: string;
  bk: BookingItem[];
  n: number;
  settled: number;
  name: string;
  phone?: string;
  userId?: string;
}

const PK = [
  { id: "ext", n: "Exterior Foam Wash", p: 499, d: "Foam wash, wheel clean, glass shine" },
  { id: "deep", n: "Deep Wash & Polish", p: 799, d: "Foam wash, tyre dressing, wax polish" },
  { id: "prem", n: "Premium Detail", p: 1199, d: "Deep wash plus interior vacuum and dashboard care" },
];

const WS = ["Rajesh Kumar", "Suresh Verma", "Imran Khan"];
const SL = ["06:30 AM", "08:30 AM", "03:00 PM", "05:00 PM"];

const SLOT_MAP: Record<string, string> = {
  "06:30 AM": "06:30",
  "08:30 AM": "08:30",
  "03:00 PM": "15:00",
  "05:00 PM": "17:00",
  "06:30": "06:30",
  "08:30": "08:30",
  "15:00": "15:00",
  "17:00": "17:00",
};

const SLOT_DISPLAY_MAP: Record<string, string> = {
  "06:30": "06:30 AM",
  "08:30": "08:30 AM",
  "15:00": "03:00 PM",
  "17:00": "05:00 PM",
};

const WASHER_ID_MAP: Record<string, string> = {
  "Rajesh Kumar": "00000000-0000-0000-0000-000000000003",
  "Suresh Verma": "00000000-0000-0000-0000-000000000004",
  "Imran Khan": "00000000-0000-0000-0000-000000000005",
};

const WASHER_NAME_MAP: Record<string, string> = {
  "00000000-0000-0000-0000-000000000003": "Rajesh Kumar",
  "00000000-0000-0000-0000-000000000004": "Suresh Verma",
  "00000000-0000-0000-0000-000000000005": "Imran Khan",
};

const BEFORE_POSITIONS: ("front" | "rear" | "left" | "right" | "existing_damage")[] = [
  "front",
  "rear",
  "left",
  "right",
  "existing_damage",
];

const AFTER_POSITIONS: ("front" | "rear" | "left" | "right")[] = [
  "front",
  "rear",
  "left",
  "right",
];

const RN: Record<string, string> = {
  customer: "Customer",
  station: "Station Head",
  washer: "Field Washer",
};

const CAR_TYPES = ["Hatchback", "Sedan", "SUV"];

const seed: AppState = {
  role: null,
  cars: [
    { id: "car_chetan_sedan", name: "Honda City", type: "Sedan", plate: "MH 12 AB 1234" },
    { id: "car_chetan_suv", name: "Hyundai Creta", type: "SUV", plate: "MH 12 CD 5678" },
  ],
  addr: "Blue Ridge Tower B, Hinjewadi Phase 1, Pune",
  spot: "Basement B2, Spot #42",
  spotId: "spot_chetan_home",
  bk: [],
  n: 1,
  settled: 0,
  name: "Chetan Sharma",
};

const dn: Record<string, number> = {
  Pending: 0,
  Assigned: 1,
  Washing: 2,
  "Awaiting Payment": 3,
  Paid: 4,
};

const R = (n: number) => "₹" + n.toLocaleString("en-IN");

const carSvg = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <path d="M5 17v2m14-2v2M3 13l2-6a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 6v4H3zM7 14h.01M17 14h.01" />
  </svg>
);

const dropSvg = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[var(--g)]">
    <path d="M12 2.5c3.6 4.2 6 7.2 6 10.4a6 6 0 0 1-12 0c0-3.200 2.400-6.200 6-10.400z" />
  </svg>
);

function QrSvg() {
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const f = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const isFilled = f
        ? !(
            (x % 6 && y % 6 && x % 6 !== 5 && y % 6 !== 5) ||
            (x % 6 > 1 && x % 6 < 5 && y % 6 > 1 && y % 6 < 5)
          )
        : (x * 7 + y * 13 + x * y) % 5 < 2;

      if (isFilled) {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
      }
    }
  }
  return (
    <svg
      viewBox="0 0 21 21"
      width="150"
      height="150"
      fill="currentColor"
      style={{ display: "block", margin: "0 auto" }}
    >
      {rects}
    </svg>
  );
}

function toIsoDate(dStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const d = new Date(dStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  return tom.toISOString().split("T")[0];
}

export default function Home() {
  const [S, setS] = useState<AppState>(seed);
  const [mounted, setMounted] = useState(false);

  // Auth & OTP state
  const [authRole, setAuthRole] = useState<"customer" | "station" | "washer">("customer");
  const [authPhone, setAuthPhone] = useState("+910000000001");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "code">("phone");
  const [authErr, setAuthErr] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [expiryRemaining, setExpiryRemaining] = useState(300);
  const [maskedPhoneDisplay, setMaskedPhoneDisplay] = useState("");
  const [devModeActive, setDevModeActive] = useState(true);
  const [devCodeAvailable, setDevCodeAvailable] = useState<string | undefined>("123456");

  // Washer tab
  const [washerTab, setWasherTab] = useState<"today" | "done">("today");

  // New car inputs in customer portal
  const [newCarName, setNewCarName] = useState("");
  const [newCarType, setNewCarType] = useState("Hatchback");
  const [newCarPlate, setNewCarPlate] = useState("");

  // Modal State
  const [M, setM] = useState<{
    type?: "book" | "pay" | "rv" | "done";
    s?: number; // 1 to 5
    cars?: (string | number)[];
    pkg?: string;
    d?: string;
    ds?: string[];
    sl?: string;
    addr?: string;
    spot?: string;
    payId?: string;
    rvId?: string;
    r?: number;
    tags?: string[];
    tip?: number;
  } | null>(null);

  // Fetch auth config on mount
  useEffect(() => {
    fetch("/api/auth/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDevModeActive(Boolean(data.devMode));
        }
      })
      .catch(() => {});
  }, []);

  // Cooldown & Expiry Timers
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (otpStep !== "code" || expiryRemaining <= 0) return;
    const interval = setInterval(() => {
      setExpiryRemaining((prev) => {
        if (prev <= 1) {
          setAuthErr("OTP has expired. Please request a new code.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep, expiryRemaining]);

  // Map DB Booking to Client Booking
  const mapDbBookingToClient = (b: DBBooking): BookingItem => {
    const stMap: Record<string, BookingItem["st"]> = {
      pending: "Pending",
      assigned: "Assigned",
      washing: "Washing",
      awaiting_payment: "Awaiting Payment",
      paid: "Paid",
      cancelled: "Cancelled",
    };

    // Calculate before photos [front, rear, left, right, damage]
    const bf = [0, 0, 0, 0, 0];
    const af = [0, 0, 0, 0];

    (b.photos || []).forEach((p) => {
      if (p.kind === "before") {
        const idx = BEFORE_POSITIONS.indexOf(p.position as any);
        if (idx >= 0) bf[idx] = 1;
      } else if (p.kind === "after") {
        const idx = AFTER_POSITIONS.indexOf(p.position as any);
        if (idx >= 0) af[idx] = 1;
      }
    });

    return {
      id: b.id,
      cars: (b.cars || []).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type.charAt(0).toUpperCase() + c.type.slice(1),
        plate: c.plate,
      })),
      pkg: b.package_id,
      d: b.scheduled_date,
      sl: SLOT_DISPLAY_MAP[b.slot_start] || b.slot_start,
      addr: b.address || "Hinjewadi, Pune",
      spot: b.spot_label || "Spot #1",
      total: b.total_inr,
      st: stMap[b.status] || "Pending",
      w: b.washer_id ? WASHER_NAME_MAP[b.washer_id] || "Assigned Washer" : null,
      bf,
      af,
      pay: b.payment_method ? (b.payment_method === "cash" ? "Cash" : "UPI") : null,
      rv: null,
    };
  };

  // Sync state from Supabase
  const refreshFromSupabase = async (userId: string, role: string, stationId?: string | null) => {
    try {
      const [dbCars, dbSpot, dbBookings] = await Promise.all([
        fetchUserCars(userId),
        fetchUserParkingSpot(userId),
        fetchUserBookings(userId, role === "station" ? "station_head" : role, stationId || "green_valley"),
      ]);

      setS((prev) => ({
        ...prev,
        cars: dbCars.length ? dbCars : prev.cars,
        addr: dbSpot?.address || prev.addr,
        spot: dbSpot?.spot_label || prev.spot,
        spotId: dbSpot?.id || prev.spotId,
        bk: dbBookings.map(mapDbBookingToClient),
      }));
    } catch (e) {
      console.warn("refreshFromSupabase error:", e);
    }
  };

  // Initialize state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(K);
      if (stored) {
        setS(JSON.parse(stored));
      }
    } catch {}
    setMounted(true);
  }, []);

  // Realtime subscription when user is authenticated
  useEffect(() => {
    if (!S.userId || !S.role) return;
    const unsub = subscribeToRealtimeBookings(() => {
      refreshFromSupabase(S.userId!, S.role!, "green_valley");
    });
    return () => unsub();
  }, [S.userId, S.role]);

  const updateState = (updater: (prev: AppState) => AppState) => {
    setS((prev) => updater(prev));
  };

  // Role Tab Switching
  const handleRoleTabChange = (r: "customer" | "station" | "washer") => {
    setAuthRole(r);
    setAuthErr("");
    setAuthSuccessMsg("");
    setOtpStep("phone");
    if (r === "customer") setAuthPhone("+910000000001");
    else if (r === "station") setAuthPhone("+910000000002");
    else if (r === "washer") setAuthPhone("+910000000003");
  };

  // Send OTP
  const handleSendOtp = async (targetPhone?: string) => {
    const phoneToSend = (targetPhone || authPhone).trim();
    if (!phoneToSend) {
      setAuthErr("Please enter a phone number.");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthErr("");
    setAuthSuccessMsg("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneToSend }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthErr(data.message || "Failed to send OTP.");
        setIsSubmittingAuth(false);
        return;
      }

      setMaskedPhoneDisplay(data.maskedPhone || phoneToSend);
      setCooldownRemaining(data.cooldownSeconds || 30);
      setExpiryRemaining(300);
      setDevCodeAvailable(data.devCode);
      setOtpStep("code");
      setAuthSuccessMsg(data.message || `Code sent to ${data.maskedPhone}`);
    } catch (err: any) {
      setAuthErr("Network error sending OTP. Please try again.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Verify OTP & Sign In
  const handleVerifyOtp = async (customCode?: string) => {
    const codeToVerify = (customCode || otpCode).trim();
    if (!codeToVerify) {
      setAuthErr("Please enter the 6-digit OTP code.");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthErr("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: authPhone.trim(), code: codeToVerify }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAuthErr(data.error || "Incorrect code. Please try again.");
        setIsSubmittingAuth(false);
        return;
      }

      const user = data.user;
      const roleMapped =
        user.role === "station_head" ? "station" : (user.role as "customer" | "station" | "washer");

      updateState((prev) => ({
        ...prev,
        role: roleMapped,
        userId: user.id,
        name: user.name,
        phone: user.phone,
      }));

      // Fetch fresh data from Supabase and migrate legacy local data if present
      try {
        const stored = localStorage.getItem(K);
        if (stored && localStorage.getItem("appwasher_v2_migrated") !== "true") {
          const parsed = JSON.parse(stored);
          migrateLegacyLocalData(user.id, parsed).then((migrated) => {
            if (migrated) {
              localStorage.setItem("appwasher_v2_migrated", "true");
              refreshFromSupabase(user.id, roleMapped, user.stationId);
            }
          });
        }
      } catch {}

      refreshFromSupabase(user.id, roleMapped, user.stationId);
    } catch (err: any) {
      setAuthErr("Network error verifying code. Please try again.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Quick Demo One-Click Handler (Dev Mode Only)
  const handleQuickDemo = async (role: "customer" | "station" | "washer") => {
    if (!devModeActive) return;
    const phoneMap = {
      customer: "+910000000001",
      station: "+910000000002",
      washer: "+910000000003",
    };
    const targetPhone = phoneMap[role];
    setAuthRole(role);
    setAuthPhone(targetPhone);
    setAuthErr("");

    // Send dev OTP and immediately auto-verify with 123456
    setIsSubmittingAuth(true);
    try {
      await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: targetPhone }),
      });

      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: targetPhone, code: "123456" }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        const u = data.user;
        const roleMapped =
          u.role === "station_head" ? "station" : (u.role as "customer" | "station" | "washer");

        updateState((prev) => ({
          ...prev,
          role: roleMapped,
          userId: u.id,
          name: u.name,
          phone: u.phone,
        }));

        try {
          const stored = localStorage.getItem(K);
          if (stored && localStorage.getItem("appwasher_v2_migrated") !== "true") {
            const parsed = JSON.parse(stored);
            migrateLegacyLocalData(u.id, parsed).then((migrated) => {
              if (migrated) {
                localStorage.setItem("appwasher_v2_migrated", "true");
                refreshFromSupabase(u.id, roleMapped, u.stationId);
              }
            });
          }
        } catch {}

        refreshFromSupabase(u.id, roleMapped, u.stationId);
      } else {
        setAuthErr(data.error || "Demo login failed.");
      }
    } catch {
      setAuthErr("Demo sign-in encountered an error.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = () => {
    updateState((prev) => ({
      ...prev,
      role: null,
      userId: undefined,
    }));
    setOtpStep("phone");
    setOtpCode("");
    setAuthErr("");
    setAuthSuccessMsg("");
  };

  // Car management
  const handleAddCar = async () => {
    if (!newCarName.trim()) return;
    const typeLower = (newCarType.toLowerCase() || "sedan") as "hatchback" | "sedan" | "suv";
    const plateUpper = (newCarPlate.trim() || "MH 12 AB 1234").toUpperCase();

    if (S.userId) {
      try {
        const created = await addUserCar(S.userId, newCarName.trim(), typeLower, plateUpper);
        updateState((prev) => ({
          ...prev,
          cars: [...prev.cars, created],
        }));
        setNewCarName("");
        setNewCarPlate("");
        return;
      } catch (err: any) {
        alert(err.message || "Failed to add car to database.");
        return;
      }
    }

    const newCar = {
      id: "car_" + Date.now(),
      name: newCarName.trim(),
      type: newCarType,
      plate: plateUpper,
    };

    updateState((prev) => ({
      ...prev,
      cars: [...prev.cars, newCar],
    }));
    setNewCarName("");
    setNewCarPlate("");
  };

  const handleDeleteCar = async (id: string | number) => {
    if (S.userId && typeof id === "string" && !id.startsWith("car_")) {
      try {
        await deleteUserCar(S.userId, id);
      } catch (err: any) {
        alert(err.message || "Failed to delete car from database.");
        return;
      }
    }

    updateState((prev) => ({
      ...prev,
      cars: prev.cars.filter((c) => c.id !== id),
    }));
  };

  // Booking Modal
  const openBookingModal = () => {
    const dates = [...Array(7)].map((_, i) => {
      const x = new Date();
      x.setDate(x.getDate() + i + 1);
      return x.toDateString().slice(0, 10);
    });

    setM({
      type: "book",
      s: 1,
      cars: S.cars.length ? [S.cars[0].id] : [],
      pkg: "ext",
      d: dates[0],
      ds: dates,
      sl: SL[1],
      addr: S.addr,
      spot: S.spot,
    });
  };

  const toggleModalCar = (carId: string | number) => {
    if (!M || !M.cars) return;
    const a = [...M.cars];
    const idx = a.indexOf(carId);
    if (idx < 0) a.push(carId);
    else a.splice(idx, 1);
    setM({ ...M, cars: a });
  };

  const getBookingTotal = () => {
    if (!M || !M.cars || !M.pkg) return 0;
    const pkgItem = PK.find((p) => p.id === M.pkg);
    return M.cars.length * (pkgItem?.p || 499);
  };

  const confirmBooking = async () => {
    if (!M || !M.cars || !M.cars.length) return;
    const t = getBookingTotal();
    const pkgItem = PK.find((p) => p.id === M.pkg) || PK[0];
    const scheduledDateIso = toIsoDate(M.d || "");
    const slotStartRaw = SLOT_MAP[M.sl || "08:30 AM"] || "08:30";

    if (S.userId) {
      try {
        let spotId = S.spotId;
        if (!spotId) {
          const spot = await saveUserParkingSpot(S.userId, M.addr || S.addr, M.spot || S.spot);
          spotId = spot.id;
        }

        await createBookingRpc({
          carIds: M.cars.map(String),
          packageId: pkgItem.id,
          scheduledDate: scheduledDateIso,
          slotStart: slotStartRaw,
          parkingSpotId: spotId,
          stationId: "green_valley",
        });

        await refreshFromSupabase(S.userId, S.role || "customer", "green_valley");
        setM(null);
        return;
      } catch (e: any) {
        alert(e.message || "Failed to create booking.");
        return;
      }
    }

    // Update client state & refresh
    const newBooking: BookingItem = {
      id: "AW" + (5245 + S.n),
      cars: M.cars.map((id) => S.cars.find((c) => c.id === id)!).filter(Boolean),
      pkg: M.pkg || "ext",
      d: M.d || "",
      sl: M.sl || "",
      addr: M.addr || S.addr,
      spot: M.spot || S.spot,
      total: t,
      st: "Pending",
      w: null,
      bf: [0, 0, 0, 0, 0],
      af: [0, 0, 0, 0],
      pay: null,
      rv: null,
    };

    updateState((prev) => ({
      ...prev,
      bk: [...prev.bk, newBooking],
      n: prev.n + 1,
      addr: M.addr || prev.addr,
      spot: M.spot || prev.spot,
    }));

    if (S.userId) {
      refreshFromSupabase(S.userId, S.role || "customer", "green_valley");
    }

    setM(null);
  };

  // Station Head Actions
  const assignWasher = async (bookingId: string, washerName: string) => {
    if (!washerName) return;
    const washerId = WASHER_ID_MAP[washerName];

    try {
      if (washerId) {
        await assignWasherRpc(bookingId, washerId);
      }
    } catch (err: any) {
      alert(err.message || "Failed to assign washer in database.");
      return;
    }

    updateState((prev) => ({
      ...prev,
      bk: prev.bk.map((b) => (b.id === bookingId ? { ...b, w: washerName, st: "Assigned" } : b)),
    }));
  };

  // Completed & Revenue Math
  const paidBookings = S.bk.filter((b) => b.st === "Paid");
  const totalRevenue = paidBookings.reduce((a, b) => a + b.total, 0);
  const platformFee = Math.round(totalRevenue * 0.2);
  const pendingPlatformFee = platformFee - S.settled;

  const settlePlatformFee = async () => {
    try {
      await settlePlatformFeeRpc("green_valley");
    } catch (e: any) {
      console.warn("settlePlatformFeeRpc error:", e);
    }

    updateState((prev) => ({
      ...prev,
      settled: platformFee,
    }));
  };

  // Photo Capture & Upload (Camera Support)
  const handlePhotoUpload = async (
    bookingId: string,
    key: "bf" | "af",
    index: number,
    file?: File
  ) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Invalid file: Please upload an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image exceeds 5MB size limit. Please upload a smaller photo.");
      return;
    }

    // 1. Update UI slot immediately
    updateState((prev) => ({
      ...prev,
      bk: prev.bk.map((b) => {
        if (b.id !== bookingId) return b;
        const arr = [...b[key]];
        arr[index] = 1;
        return { ...b, [key]: arr };
      }),
    }));

    // 2. If photo file is selected from camera, upload to Supabase Storage & database
    if (S.userId) {
      try {
        const kind = key === "bf" ? "before" : "after";
        const position =
          key === "bf" ? BEFORE_POSITIONS[index] : AFTER_POSITIONS[index];
        await uploadBookingPhoto(bookingId, kind, position, file, S.userId);
        refreshFromSupabase(S.userId, S.role || "washer", "green_valley");
      } catch (err: any) {
        alert(err.message || "Photo upload failed.");
      }
    }
  };

  const updateBookingStatus = async (bookingId: string, st: BookingItem["st"]) => {
    try {
      if (st === "Washing") {
        await startWashRpc(bookingId);
      } else if (st === "Awaiting Payment") {
        await completeJobRpc(bookingId);
      }
    } catch (err: any) {
      alert(err.message || `Failed to transition booking status to ${st}`);
      return;
    }

    updateState((prev) => ({
      ...prev,
      bk: prev.bk.map((b) => (b.id === bookingId ? { ...b, st } : b)),
    }));
  };

  const markCashPaid = async (bookingId: string) => {
    try {
      await recordCashPaymentRpc(bookingId);
    } catch (err: any) {
      console.warn("recordCashPaymentRpc notice:", err.message);
    }

    updateState((prev) => ({
      ...prev,
      bk: prev.bk.map((b) => (b.id === bookingId ? { ...b, st: "Paid", pay: "Cash" } : b)),
    }));
  };

  const markUpiPaid = (bookingId: string) => {
    updateState((prev) => ({
      ...prev,
      bk: prev.bk.map((b) => (b.id === bookingId ? { ...b, st: "Paid", pay: "UPI" } : b)),
    }));
    setM(null);
  };

  const submitReview = async () => {
    if (!M || !M.rvId) return;

    try {
      await submitReviewRpc(M.rvId, M.r || 5, M.tags || [], M.tip || 0);
    } catch (e: any) {
      console.warn("submitReviewRpc notice:", e.message);
    }

    updateState((prev) => ({
      ...prev,
      bk: prev.bk.map((b) =>
        b.id === M.rvId
          ? {
              ...b,
              rv: {
                r: M.r || 5,
                tags: M.tags || [],
                tip: M.tip || 0,
              },
            }
          : b
      ),
    }));
    setM({ type: "done" });
  };

  const toggleReviewTag = (t: string) => {
    if (!M || !M.tags) return;
    const a = [...M.tags];
    const idx = a.indexOf(t);
    if (idx < 0) a.push(t);
    else a.splice(idx, 1);
    setM({ ...M, tags: a });
  };

  if (!mounted) {
    return (
      <div className="auth">
        <div className="hero">
          <div className="logo" style={{ fontSize: "20px" }}>
            {dropSvg}
            <b>AppWasher</b>
          </div>
          <div>
            <h1>Clean cars.<br />Happy journeys.</h1>
            <p style={{ opacity: 0.85, maxWidth: "340px" }}>
              Professional doorstep car wash, with photo proof at every step.
            </p>
          </div>
          <span className="sm" style={{ opacity: 0.6 }}>
            Customer · Station Head · Field Washer
          </span>
        </div>
      </div>
    );
  }

  // Active in-flight wash for customer
  const activeBooking = [...S.bk].reverse().find((b) => b.st !== "Paid");
  const nm = (b: BookingItem) => b.cars.map((c) => c.name).join(" + ");

  const renderBadge = (status: BookingItem["st"]) => {
    const cls = status === "Pending" ? "a" : status === "Paid" ? "" : "b";
    return <span className={`bd ${cls}`}>{status}</span>;
  };

  const renderTracker = (b: BookingItem) => {
    const cur = dn[b.st];
    const steps = ["Dispatched", "Inspection", "Washing", "Payment"];
    return (
      <div className="trk">
        {steps.map((label, i) => {
          const cls = i < cur ? "d" : i === cur ? "c" : "";
          return (
            <div key={label} className={cls}>
              <i />
              {label}
            </div>
          );
        })}
      </div>
    );
  };

  // Nav component
  const navBar = (
    <header className="nav">
      <div className="logo">
        {dropSvg}
        <b>AppWasher</b>
      </div>
      <div className="r">
        {devModeActive && (
          <span
            style={{
              background: "#FEF3C7",
              color: "#92400E",
              padding: "2px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              border: "1px solid #FDE68A",
            }}
          >
            DEV MODE
          </span>
        )}
        <span className="bd">{RN[S.role || "customer"]}</span>
        <span className="av">
          {S.role === "customer" ? S.name[0] : S.role === "station" ? "V" : "R"}
        </span>
        <button className="btn o s" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );

  return (
    <>
      {/* 1. AUTH SCREEN (WHATSAPP OTP FLOW) */}
      {!S.role ? (
        <div className="auth">
          <div className="hero">
            <div className="logo" style={{ fontSize: "20px" }}>
              {dropSvg}
              <b>AppWasher</b>
            </div>
            <div>
              <h1>
                Clean cars.
                <br />
                Happy journeys.
              </h1>
              <p style={{ opacity: 0.85, maxWidth: "340px" }}>
                Professional doorstep car wash, with photo proof at every step.
              </p>
              <ul style={{ padding: 0 }}>
                <li>✓ Trained, verified technicians</li>
                <li>✓ Before and after photo inspection</li>
                <li>✓ Pay by UPI or cash after the wash</li>
              </ul>
            </div>
            <span className="sm" style={{ opacity: 0.6 }}>
              Customer · Station Head · Field Washer
            </span>
          </div>

          <div className="form">
            <div className="cd" style={{ position: "relative" }}>
              <div className="row" style={{ alignItems: "center", marginBottom: "4px" }}>
                <h1 style={{ fontSize: "24px", margin: 0 }}>Welcome</h1>
                {devModeActive && (
                  <span
                    style={{
                      background: "#FEF3C7",
                      color: "#92400E",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      border: "1px solid #FDE68A",
                      letterSpacing: "0.02em",
                    }}
                  >
                    DEV MODE
                  </span>
                )}
              </div>
              <p className="mu" style={{ margin: "0 0 16px" }}>
                Sign in securely with WhatsApp OTP
              </p>

              {/* Portal Selector Tabs */}
              <div className="tabs">
                {(["customer", "station", "washer"] as const).map((k) => (
                  <button
                    key={k}
                    className={k === authRole ? "on" : ""}
                    onClick={() => handleRoleTabChange(k)}
                  >
                    {RN[k]}
                  </button>
                ))}
              </div>

              {otpStep === "phone" ? (
                <>
                  <label style={{ marginTop: "14px", display: "block" }}>
                    WhatsApp Phone Number
                  </label>
                  <input
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="+919876543210"
                    disabled={isSubmittingAuth}
                  />

                  {devModeActive && (
                    <div className="mu sm" style={{ margin: "6px 0 12px", fontSize: "12px" }}>
                      Seeded dev phone: <b>{authPhone}</b>
                    </div>
                  )}

                  {authSuccessMsg && (
                    <div
                      className="sm"
                      style={{ color: "var(--g)", marginTop: "6px", fontWeight: 500 }}
                    >
                      {authSuccessMsg}
                    </div>
                  )}

                  {authErr && (
                    <div
                      className="sm"
                      style={{ color: "var(--rd)", minHeight: "18px", marginTop: "8px" }}
                    >
                      {authErr}
                    </div>
                  )}

                  <button
                    className="btn w"
                    style={{ marginTop: "12px" }}
                    disabled={isSubmittingAuth || cooldownRemaining > 0}
                    onClick={() => handleSendOtp()}
                  >
                    {isSubmittingAuth
                      ? "Sending code..."
                      : cooldownRemaining > 0
                      ? `Resend in ${cooldownRemaining}s`
                      : "Send WhatsApp OTP"}
                  </button>

                  {/* Quick Demo Buttons (Available in DEV MODE only) */}
                  {devModeActive && (
                    <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--ln)" }}>
                      <div className="mu sm" style={{ marginBottom: "8px", fontWeight: 600 }}>
                        ⚡ Quick Demo (Dev Mode)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <button
                          className="btn o w s"
                          onClick={() => handleQuickDemo("customer")}
                          disabled={isSubmittingAuth}
                        >
                          Demo as Customer (Chetan)
                        </button>
                        <button
                          className="btn o w s"
                          onClick={() => handleQuickDemo("station")}
                          disabled={isSubmittingAuth}
                        >
                          Demo as Station Head (Vikram)
                        </button>
                        <button
                          className="btn o w s"
                          onClick={() => handleQuickDemo("washer")}
                          disabled={isSubmittingAuth}
                        >
                          Demo as Field Washer (Rajesh)
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div
                    style={{
                      margin: "14px 0 10px",
                      padding: "10px",
                      background: "var(--bg)",
                      borderRadius: "10px",
                    }}
                  >
                    <div className="mu sm">Code sent to:</div>
                    <b>{maskedPhoneDisplay}</b>
                    <button
                      className="btn o s"
                      style={{ marginLeft: "8px", padding: "2px 8px", fontSize: "11px" }}
                      onClick={() => {
                        setOtpStep("phone");
                        setAuthErr("");
                      }}
                    >
                      Change
                    </button>
                  </div>

                  <label style={{ display: "block" }}>Enter 6-digit Code</label>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    disabled={isSubmittingAuth}
                    autoFocus
                    style={{ letterSpacing: "4px", fontSize: "18px", fontWeight: 600 }}
                  />

                  <div className="row" style={{ marginTop: "6px", fontSize: "12px" }}>
                    <span className="mu">
                      Expires in: {Math.floor(expiryRemaining / 60)}:
                      {String(expiryRemaining % 60).padStart(2, "0")}
                    </span>
                    {devModeActive && devCodeAvailable && (
                      <button
                        className="btn o s"
                        style={{ padding: "2px 6px", fontSize: "11px" }}
                        onClick={() => {
                          setOtpCode(devCodeAvailable);
                          handleVerifyOtp(devCodeAvailable);
                        }}
                      >
                        Auto-fill ({devCodeAvailable})
                      </button>
                    )}
                  </div>

                  {authErr && (
                    <div
                      className="sm"
                      style={{ color: "var(--rd)", minHeight: "18px", marginTop: "8px" }}
                    >
                      {authErr}
                    </div>
                  )}

                  <button
                    className="btn w"
                    style={{ marginTop: "14px" }}
                    disabled={isSubmittingAuth || !otpCode.trim()}
                    onClick={() => handleVerifyOtp()}
                  >
                    {isSubmittingAuth ? "Verifying..." : "Verify & Sign In"}
                  </button>

                  <button
                    className="btn o w"
                    style={{ marginTop: "8px" }}
                    disabled={isSubmittingAuth || cooldownRemaining > 0}
                    onClick={() => handleSendOtp()}
                  >
                    {cooldownRemaining > 0
                      ? `Resend available in ${cooldownRemaining}s`
                      : "Resend Code"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {navBar}

          {/* 2. CUSTOMER PORTAL */}
          {S.role === "customer" && (
            <div className="wrap">
              <h1>Hello, {S.name}</h1>
              <p className="mu">{S.addr}</p>

              <div className="grid g2" style={{ margin: "20px 0" }}>
                <div className="cd promo">
                  <h2 style={{ fontSize: "22px", marginBottom: "6px" }}>
                    Zero damage guarantee
                  </h2>
                  <p style={{ opacity: 0.85, margin: "0 0 16px" }}>
                    Photo inspection before and after every wash.
                  </p>
                  <button className="btn" onClick={openBookingModal}>
                    Book a car wash
                  </button>
                </div>

                <div className="cd">
                  <h2>Active booking</h2>
                  {activeBooking ? (
                    <>
                      <div className="row">
                        <b>{nm(activeBooking)}</b>
                        {renderBadge(activeBooking.st)}
                      </div>
                      <div className="mu sm">
                        #{activeBooking.id} · {activeBooking.d}, {activeBooking.sl}
                        {activeBooking.w ? " · " + activeBooking.w : ""}
                      </div>
                      {renderTracker(activeBooking)}
                      {activeBooking.st === "Awaiting Payment" && (
                        <button
                          className="btn w"
                          style={{ marginTop: "12px" }}
                          onClick={() => setM({ type: "pay", payId: activeBooking.id })}
                        >
                          Pay {R(activeBooking.total)} via UPI
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="em">No active wash. Book one in under a minute.</div>
                  )}
                </div>
              </div>

              <div className="row">
                <h2>My garage</h2>
              </div>
              <div className="grid g3">
                {S.cars.map((c) => (
                  <div key={c.id} className="cd row">
                    <div className="row" style={{ gap: "12px" }}>
                      <div className="ci">{carSvg}</div>
                      <div>
                        <b>{c.name}</b>
                        <div className="mu sm">
                          {c.type} · {c.plate}
                        </div>
                      </div>
                    </div>
                    <button className="btn o s" onClick={() => handleDeleteCar(c.id)}>
                      Remove
                    </button>
                  </div>
                ))}

                <div className="cd">
                  <input
                    value={newCarName}
                    onChange={(e) => setNewCarName(e.target.value)}
                    placeholder="Car name, e.g. Honda City"
                    style={{ marginBottom: "8px" }}
                  />
                  <select
                    value={newCarType}
                    onChange={(e) => setNewCarType(e.target.value)}
                    style={{ marginBottom: "8px" }}
                  >
                    {CAR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="row">
                    <input
                      value={newCarPlate}
                      onChange={(e) => setNewCarPlate(e.target.value)}
                      placeholder="Plate"
                    />
                    <button className="btn s" onClick={handleAddCar}>
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <h2 style={{ marginTop: "28px" }}>Bookings</h2>
              <div className="cd">
                {S.bk.length ? (
                  [...S.bk].reverse().map((b) => (
                    <div
                      key={b.id}
                      className="row"
                      style={{
                        padding: "12px 0",
                        borderBottom: "1px solid var(--ln)",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <b>{nm(b)}</b>
                        <div className="mu sm">
                          #{b.id} · {b.d}, {b.sl} · {R(b.total)}
                          {b.pay ? " · " + b.pay : ""}
                        </div>
                      </div>
                      <div className="r">
                        {renderBadge(b.st)}
                        {b.st === "Paid" && !b.rv && (
                          <button
                            className="btn o s"
                            onClick={() =>
                              setM({
                                type: "rv",
                                rvId: b.id,
                                r: 5,
                                tags: [],
                                tip: 0,
                              })
                            }
                          >
                            Review
                          </button>
                        )}
                        {b.rv && <span className="mu sm">{"★".repeat(b.rv.r)}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="em">Your bookings will appear here.</div>
                )}
              </div>
            </div>
          )}

          {/* 3. STATION HEAD PORTAL */}
          {S.role === "station" && (
            <div className="wrap">
              <h1>Station hub</h1>
              <p className="mu">Green Valley Station</p>

              <div className="grid g4" style={{ margin: "20px 0" }}>
                <div className="cd">
                  <div className="mu sm">Total bookings</div>
                  <div className="mt">{S.bk.length}</div>
                  <div className="sm mu">
                    {S.bk.filter((b) => b.st === "Pending").length} awaiting dispatch
                  </div>
                </div>

                <div className="cd">
                  <div className="mu sm">Cash collected</div>
                  <div className="mt">
                    {R(
                      paidBookings
                        .filter((b) => b.pay === "Cash")
                        .reduce((a, b) => a + b.total, 0)
                    )}
                  </div>
                  <div className="sm mu">to remit</div>
                </div>

                <div className="cd">
                  <div className="mu sm">Station and crew</div>
                  <div className="mt">{R(totalRevenue - platformFee)}</div>
                  <div className="sm mu">80% of paid jobs</div>
                </div>

                <div className="cd">
                  <div className="mu sm">Platform fee</div>
                  <div className="mt">{R(platformFee)}</div>
                  <div className="sm mu">
                    {pendingPlatformFee > 0
                      ? R(pendingPlatformFee) + " pending transfer"
                      : "settled"}
                  </div>
                </div>
              </div>

              <div className="cd">
                <div className="row">
                  <h2>Dispatch queue</h2>
                  <button
                    className="btn s"
                    disabled={pendingPlatformFee <= 0}
                    onClick={settlePlatformFee}
                  >
                    Settle platform fee
                  </button>
                </div>
                <div className="ov">
                  <table>
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Vehicles</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Washer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {S.bk.length ? (
                        [...S.bk].reverse().map((b) => (
                          <tr key={b.id}>
                            <td>
                              <b>{b.id}</b>
                              <div className="mu sm">
                                {b.d}, {b.sl}
                              </div>
                            </td>
                            <td>{nm(b)}</td>
                            <td>{b.spot}</td>
                            <td>{renderBadge(b.st)}</td>
                            <td>
                              {b.w ? (
                                b.w
                              ) : (
                                <select
                                  defaultValue=""
                                  onChange={(e) => assignWasher(b.id, e.target.value)}
                                  style={{ minWidth: "140px" }}
                                >
                                  <option value="">Assign…</option>
                                  {WS.map((w) => (
                                    <option key={w} value={w}>
                                      {w}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="em">
                            No bookings yet. Book one from the Customer portal.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cd" style={{ marginTop: "16px" }}>
                <h2>Completed-wash ledger</h2>
                {paidBookings.length ? (
                  paidBookings.map((b) => (
                    <div
                      key={b.id}
                      className="row"
                      style={{ padding: "8px 0", borderBottom: "1px solid var(--ln)" }}
                    >
                      <span>
                        {b.id} · {nm(b)}
                      </span>
                      <span>
                        {R(b.total)} · {b.pay}
                        {b.rv ? " · " + "★".repeat(b.rv.r) : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="em">Completed jobs will be listed here.</div>
                )}
              </div>
            </div>
          )}

          {/* 4. FIELD WASHER PORTAL (WITH CAMERA PHOTO CAPTURE) */}
          {S.role === "washer" && (
            <div className="wrap ph">
              <h1 style={{ fontSize: "24px" }}>My jobs</h1>
              <div className="tabs" style={{ margin: "14px 0" }}>
                {(["today", "done"] as const).map((t) => {
                  const all = S.bk.filter((b) => b.w === "Rajesh Kumar" || !b.w);
                  const count =
                    t === "today"
                      ? all.filter((b) => b.st !== "Paid").length
                      : all.filter((b) => b.st === "Paid").length;
                  return (
                    <button
                      key={t}
                      className={washerTab === t ? "on" : ""}
                      onClick={() => setWasherTab(t)}
                    >
                      {t === "today" ? `Today (${count})` : `Completed (${count})`}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const all = S.bk.filter((b) => b.w === "Rajesh Kumar" || !b.w);
                const list = all.filter((b) =>
                  washerTab === "today" ? b.st !== "Paid" : b.st === "Paid"
                );

                if (!list.length) {
                  return (
                    <div className="cd em">
                      {washerTab === "today"
                        ? "No jobs assigned yet. The Station Head assigns jobs from the dispatch queue."
                        : "No completed jobs yet."}
                    </div>
                  );
                }

                return list.map((b) => {
                  const bfReady = b.bf.slice(0, 4).every(Boolean);
                  const afReady = b.af.every(Boolean);
                  const pkgItem = PK.find((p) => p.id === b.pkg) || PK[0];

                  return (
                    <div key={b.id} className="cd" style={{ marginBottom: "14px" }}>
                      <div className="row">
                        <b>{nm(b)}</b>
                        {renderBadge(b.st)}
                      </div>
                      <div className="mu sm">
                        #{b.id} · {b.sl} · {pkgItem.n}
                      </div>

                      <div
                        style={{
                          margin: "10px 0",
                          padding: "10px",
                          background: "var(--bg)",
                          borderRadius: "12px",
                        }}
                      >
                        📍 {b.spot}
                        <div className="mu sm">{b.addr}</div>
                      </div>

                      {b.st === "Assigned" && (
                        <>
                          <h2 className="sm">Before photos (required)</h2>
                          <div className="ph4">
                            {[
                              "Front",
                              "Rear",
                              "Left side",
                              "Right side",
                              "Existing damage",
                            ].map((label, idx) => (
                              <label
                                key={label}
                                className={`pb ${b.bf[idx] ? "on" : ""}`}
                                style={{ cursor: "pointer" }}
                              >
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    handlePhotoUpload(b.id, "bf", idx, file);
                                  }}
                                />
                                {b.bf[idx] ? "✓ " + label : "📷 " + label}
                              </label>
                            ))}
                          </div>
                          <button
                            className="btn w"
                            style={{ marginTop: "12px" }}
                            disabled={!bfReady}
                            onClick={() => updateBookingStatus(b.id, "Washing")}
                          >
                            Start wash
                          </button>
                        </>
                      )}

                      {b.st === "Washing" && (
                        <>
                          <h2 className="sm">After photos</h2>
                          <div className="ph4">
                            {["Front", "Rear", "Left side", "Right side"].map(
                              (label, idx) => (
                                <label
                                  key={label}
                                  className={`pb ${b.af[idx] ? "on" : ""}`}
                                  style={{ cursor: "pointer" }}
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      handlePhotoUpload(b.id, "af", idx, file);
                                    }}
                                  />
                                  {b.af[idx] ? "✓ " + label : "📷 " + label}
                                </label>
                              )
                            )}
                          </div>
                          <button
                            className="btn w"
                            style={{ marginTop: "12px" }}
                            disabled={!afReady}
                            onClick={() => updateBookingStatus(b.id, "Awaiting Payment")}
                          >
                            Complete job · {R(b.total)}
                          </button>
                          <button
                            className="btn o w"
                            style={{ marginTop: "8px" }}
                            onClick={() => updateBookingStatus(b.id, "Assigned")}
                          >
                            Retake before photos
                          </button>
                        </>
                      )}

                      {b.st === "Awaiting Payment" && (
                        <>
                          <h2 className="sm">Collect payment · {R(b.total)}</h2>
                          <button className="btn w" onClick={() => markCashPaid(b.id)}>
                            Cash collected
                          </button>
                        </>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </>
      )}

      {/* 5. MODAL SYSTEM */}
      {M && (
        <div
          className="m"
          onClick={(e) => {
            if (e.target === e.currentTarget) setM(null);
          }}
        >
          <div className="cd">
            {/* A. UPI PAYMENT MODAL */}
            {M.type === "pay" && M.payId && (
              (() => {
                const b = S.bk.find((x) => x.id === M.payId);
                if (!b) return null;
                return (
                  <div>
                    <div className="row">
                      <h2>Payment</h2>
                      <button className="btn o s" onClick={() => setM(null)}>
                        Close
                      </button>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div className="mu sm">Amount due</div>
                      <div className="mt">{R(b.total)}</div>
                      <div style={{ margin: "16px 0" }}>
                        <QrSvg />
                      </div>
                      <p className="mu sm">Scan with any UPI app</p>
                      <div
                        className="chips"
                        style={{ justifyContent: "center", marginBottom: "16px" }}
                      >
                        <span className="chip">GPay</span>
                        <span className="chip">PhonePe</span>
                        <span className="chip">Paytm</span>
                      </div>
                      <button className="btn w" onClick={() => markUpiPaid(b.id)}>
                        Simulate instant payment
                      </button>
                    </div>
                  </div>
                );
              })()
            )}

            {/* B. REVIEW MODAL */}
            {M.type === "rv" && (
              <div>
                <div className="row">
                  <h2>Rate your experience</h2>
                  <button className="btn o s" onClick={() => setM(null)}>
                    Close
                  </button>
                </div>
                <div style={{ textAlign: "center" }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      className={`star ${(M.r || 5) >= i ? "on" : ""}`}
                      onClick={() => setM({ ...M, r: i })}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <label>What did you like?</label>
                <div className="chips">
                  {[
                    "Super clean",
                    "On time",
                    "Polite technician",
                    "Zero scratches",
                  ].map((t) => (
                    <span
                      key={t}
                      className={`chip ${(M.tags || []).includes(t) ? "on" : ""}`}
                      onClick={() => toggleReviewTag(t)}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <label>Add a tip</label>
                <div className="chips">
                  {[0, 30, 50, 100].map((tipVal) => (
                    <span
                      key={tipVal}
                      className={`chip ${M.tip === tipVal ? "on" : ""}`}
                      onClick={() => setM({ ...M, tip: tipVal })}
                    >
                      {tipVal ? R(tipVal) : "No tip"}
                    </span>
                  ))}
                </div>

                <button
                  className="btn w"
                  style={{ marginTop: "20px" }}
                  onClick={submitReview}
                >
                  Submit review
                </button>
              </div>
            )}

            {/* C. REVIEW DONE MODAL */}
            {M.type === "done" && (
              <div className="em">
                <div style={{ fontSize: "40px" }}>✓</div>
                <h2>Thank you</h2>
                <p>Your review has been submitted.</p>
                <button className="btn" onClick={() => setM(null)}>
                  Done
                </button>
              </div>
            )}

            {/* D. 5-STEP BOOKING MODAL */}
            {M.type === "book" && (
              (() => {
                const s = M.s || 1;
                const pkgItem = PK.find((x) => x.id === M.pkg) || PK[0];
                const T = [
                  "Cars",
                  "Package",
                  "Date and time",
                  "Location",
                  "Review and pay",
                ];

                return (
                  <div>
                    <div className="row">
                      <h2>
                        Step {s} of 5 · {T[s - 1]}
                      </h2>
                      <button className="btn o s" onClick={() => setM(null)}>
                        Cancel
                      </button>
                    </div>

                    {/* Step 1: Cars */}
                    {s === 1 && (
                      <div>
                        <p className="mu">Select vehicles for this wash</p>
                        {S.cars.map((c) => {
                          const isSel = (M.cars || []).includes(c.id);
                          return (
                            <div
                              key={c.id}
                              className={`cd row ${isSel ? "promo" : ""}`}
                              style={{
                                cursor: "pointer",
                                margin: "8px 0",
                                border: isSel ? "1.5px solid var(--g)" : undefined,
                              }}
                              onClick={() => toggleModalCar(c.id)}
                            >
                              <div className="row" style={{ gap: "10px" }}>
                                <input
                                  type="checkbox"
                                  checked={isSel}
                                  readOnly
                                  style={{ width: "18px", height: "18px" }}
                                />
                                <div>
                                  <b>{c.name}</b>
                                  <div className="mu sm">
                                    {c.type} · {c.plate}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          className="btn w"
                          style={{ marginTop: "14px" }}
                          disabled={!M.cars || !M.cars.length}
                          onClick={() => setM({ ...M, s: 2 })}
                        >
                          Next: Choose package
                        </button>
                      </div>
                    )}

                    {/* Step 2: Package */}
                    {s === 2 && (
                      <div>
                        <p className="mu">Choose a service package</p>
                        {PK.map((p) => {
                          const isSel = M.pkg === p.id;
                          return (
                            <div
                              key={p.id}
                              className={`cd ${isSel ? "promo" : ""}`}
                              style={{
                                cursor: "pointer",
                                margin: "10px 0",
                                border: isSel ? "1.5px solid var(--g)" : undefined,
                              }}
                              onClick={() => setM({ ...M, pkg: p.id })}
                            >
                              <div className="row">
                                <b>{p.n}</b>
                                <b>{R(p.p)}</b>
                              </div>
                              <p className="mu sm" style={{ margin: "4px 0 0" }}>
                                {p.d}
                              </p>
                            </div>
                          );
                        })}
                        <div className="row" style={{ marginTop: "14px" }}>
                          <button className="btn o" onClick={() => setM({ ...M, s: 1 })}>
                            Back
                          </button>
                          <button className="btn" onClick={() => setM({ ...M, s: 3 })}>
                            Next: Date & time
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Date & Time */}
                    {s === 3 && (
                      <div>
                        <label>Date</label>
                        <div className="chips">
                          {(M.ds || []).map((date) => (
                            <span
                              key={date}
                              className={`chip ${M.d === date ? "on" : ""}`}
                              onClick={() => setM({ ...M, d: date })}
                            >
                              {date}
                            </span>
                          ))}
                        </div>

                        <label>Time slot</label>
                        <div className="chips">
                          {SL.map((slot) => (
                            <span
                              key={slot}
                              className={`chip ${M.sl === slot ? "on" : ""}`}
                              onClick={() => setM({ ...M, sl: slot })}
                            >
                              {slot}
                            </span>
                          ))}
                        </div>

                        <div className="row" style={{ marginTop: "16px" }}>
                          <button className="btn o" onClick={() => setM({ ...M, s: 2 })}>
                            Back
                          </button>
                          <button className="btn" onClick={() => setM({ ...M, s: 4 })}>
                            Next: Location
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Location */}
                    {s === 4 && (
                      <div>
                        <label>Society or Building address</label>
                        <input
                          value={M.addr || ""}
                          onChange={(e) => setM({ ...M, addr: e.target.value })}
                          placeholder="e.g. Skyline Society, Hinjewadi Phase 1, Pune"
                        />

                        <label>Exact parking spot</label>
                        <input
                          value={M.spot || ""}
                          onChange={(e) => setM({ ...M, spot: e.target.value })}
                          placeholder="e.g. Basement 2, Pillar 45"
                        />

                        <div className="row" style={{ marginTop: "16px" }}>
                          <button className="btn o" onClick={() => setM({ ...M, s: 3 })}>
                            Back
                          </button>
                          <button
                            className="btn"
                            disabled={!M.addr?.trim() || !M.spot?.trim()}
                            onClick={() => setM({ ...M, s: 5 })}
                          >
                            Next: Review
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Review & Confirm */}
                    {s === 5 && (
                      <div>
                        <div
                          style={{
                            background: "var(--bg)",
                            padding: "14px",
                            borderRadius: "14px",
                            margin: "10px 0 16px",
                          }}
                        >
                          <div className="row">
                            <span className="mu">Package</span>
                            <b>{pkgItem.n}</b>
                          </div>
                          <div className="row" style={{ margin: "8px 0" }}>
                            <span className="mu">Vehicles</span>
                            <b>
                              {(M.cars || [])
                                .map((id) => S.cars.find((c) => c.id === id)?.name)
                                .filter(Boolean)
                                .join(", ")}
                            </b>
                          </div>
                          <div className="row" style={{ margin: "8px 0" }}>
                            <span className="mu">Slot</span>
                            <b>
                              {M.d}, {M.sl}
                            </b>
                          </div>
                          <div className="row" style={{ margin: "8px 0" }}>
                            <span className="mu">Location</span>
                            <b>{M.spot}</b>
                          </div>
                          <div
                            className="row"
                            style={{
                              borderTop: "1px solid var(--ln)",
                              paddingTop: "8px",
                              marginTop: "8px",
                            }}
                          >
                            <b>Total price</b>
                            <b style={{ fontSize: "18px", color: "var(--g)" }}>
                              {R(getBookingTotal())}
                            </b>
                          </div>
                        </div>

                        <p className="mu sm">
                          Pay by cash or UPI after the wash is completed and photo verified.
                        </p>

                        <div className="row" style={{ marginTop: "14px" }}>
                          <button className="btn o" onClick={() => setM({ ...M, s: 4 })}>
                            Back
                          </button>
                          <button className="btn" onClick={confirmBooking}>
                            Confirm booking · {R(getBookingTotal())}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </>
  );
}
