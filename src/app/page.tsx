"use client";

import React, { useState, useEffect } from "react";

const K = "appwasher_v2";

interface CarItem {
  id: number;
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
  st: "Pending" | "Assigned" | "Washing" | "Awaiting Payment" | "Paid";
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
  bk: BookingItem[];
  n: number;
  settled: number;
  name: string;
}

const PK = [
  { id: "ext", n: "Exterior Foam Wash", p: 499, d: "Foam wash, wheel clean, glass shine" },
  { id: "deep", n: "Deep Wash & Polish", p: 799, d: "Foam wash, tyre dressing, wax polish" },
  { id: "prem", n: "Premium Detail", p: 1199, d: "Deep wash plus interior vacuum and dashboard care" },
];

const WS = ["Rajesh Kumar", "Suresh Verma", "Imran Khan"];
const SL = ["06:30 AM", "08:30 AM", "03:00 PM", "05:00 PM"];

const CR: Record<string, [string, string]> = {
  customer: ["chetan", "demo123"],
  station: ["station", "station123"],
  washer: ["rajesh", "washer123"],
};

const RN: Record<string, string> = {
  customer: "Customer",
  station: "Station Head",
  washer: "Field Washer",
};

const CAR_TYPES = ["Hatchback", "Sedan", "SUV"];

const seed: AppState = {
  role: null,
  cars: [
    { id: 1, name: "Hyundai Creta", type: "SUV", plate: "MH12AB1234" },
    { id: 2, name: "Maruti Swift", type: "Hatchback", plate: "MH12CD5678" },
  ],
  addr: "Skyline Society, Hinjewadi Phase 1, Pune",
  spot: "Basement 2, Pillar 45",
  bk: [],
  n: 1,
  settled: 0,
  name: "Chetan",
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

export default function Home() {
  const [S, setS] = useState<AppState>(seed);
  const [mounted, setMounted] = useState(false);

  // Auth UI state
  const [authRole, setAuthRole] = useState<"customer" | "station" | "washer">("customer");
  const [authReg, setAuthReg] = useState(false);
  const [authU, setAuthU] = useState("chetan");
  const [authP, setAuthP] = useState("demo123");
  const [authCarName, setAuthCarName] = useState("");
  const [authCarType, setAuthCarType] = useState("Hatchback");
  const [authPlate, setAuthPlate] = useState("");
  const [authSpot, setAuthSpot] = useState("");
  const [authErr, setAuthErr] = useState("");

  // Washer tab
  const [washerTab, setWasherTab] = useState<"today" | "done">("today");

  // New car inputs in customer portal
  const [newCarName, setNewCarName] = useState("");
  const [newCarType, setNewCarType] = useState("Hatchback");
  const [newCarPlate, setNewCarPlate] = useState("");

  // Modal State
  const [M, setM] = useState<{
    type?: "book" | "pay" | "rv" | "done";
    // booking modal
    s?: number; // 1 to 5
    cars?: number[];
    pkg?: string;
    d?: string;
    ds?: string[];
    sl?: string;
    addr?: string;
    spot?: string;
    // pay modal
    payId?: string;
    // review modal
    rvId?: string;
    r?: number;
    tags?: string[];
    tip?: number;
  } | null>(null);

  // Initialize and listen to storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(K);
      if (stored) {
        setS(JSON.parse(stored));
      } else {
        localStorage.setItem(K, JSON.stringify(seed));
      }
    } catch {
      // fallback
    }
    setMounted(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === K && e.newValue) {
        try {
          setS(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateState = (updater: (prev: AppState) => AppState) => {
    setS((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(K, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Auth handlers
  const handleRoleTabChange = (r: "customer" | "station" | "washer") => {
    setAuthRole(r);
    setAuthErr("");
    const c = CR[r];
    setAuthU(authReg && r === "customer" ? "" : c[0]);
    setAuthP(authReg && r === "customer" ? "" : c[1]);
  };

  const handleRegToggle = (reg: boolean) => {
    setAuthReg(reg);
    setAuthErr("");
    const c = CR["customer"];
    setAuthU(reg ? "" : c[0]);
    setAuthP(reg ? "" : c[1]);
  };

  const handleLogin = (demo: boolean) => {
    const r = authRole;
    const c = CR[r];
    let u = authU.trim().toLowerCase();
    let p = authP;

    if (demo) {
      u = c[0];
      p = c[1];
    }

    if (authReg && r === "customer" && !demo) {
      if (!u || !p) {
        setAuthErr("Enter a username and password");
        return;
      }
      updateState((prev) => {
        const nextCars = [...prev.cars];
        if (authCarName.trim()) {
          nextCars.push({
            id: Date.now(),
            name: authCarName.trim(),
            type: authCarType,
            plate: authPlate.trim() || "-",
          });
        }
        return {
          ...prev,
          role: r,
          cars: nextCars,
          spot: authSpot.trim() || prev.spot,
          name: u.charAt(0).toUpperCase() + u.slice(1),
        };
      });
      return;
    }

    if (u !== c[0] || p !== c[1]) {
      setAuthErr("Incorrect credentials. Use the demo button.");
      return;
    }

    updateState((prev) => ({
      ...prev,
      role: r,
    }));
  };

  const handleLogout = () => {
    updateState((prev) => ({
      ...prev,
      role: null,
    }));
  };

  // Car management
  const handleAddCar = () => {
    if (!newCarName.trim()) return;
    updateState((prev) => ({
      ...prev,
      cars: [
        ...prev.cars,
        {
          id: Date.now(),
          name: newCarName.trim(),
          type: newCarType,
          plate: newCarPlate.trim() || "-",
        },
      ],
    }));
    setNewCarName("");
    setNewCarPlate("");
  };

  const handleDeleteCar = (id: number) => {
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
      cars: [],
      pkg: "ext",
      d: dates[0],
      ds: dates,
      sl: SL[1],
      addr: S.addr,
      spot: S.spot,
    });
  };

  const toggleModalCar = (carId: number) => {
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

  const confirmBooking = () => {
    if (!M || !M.cars) return;
    const t = getBookingTotal();
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

    setM(null);
  };

  // Station Head Actions
  const assignWasher = (bookingId: string, washer: string) => {
    if (!washer) return;
    updateState((prev) => ({
      ...prev,
      bk: prev.bk.map((b) => (b.id === bookingId ? { ...b, w: washer, st: "Assigned" } : b)),
    }));
  };

  const paidBookings = S.bk.filter((b) => b.st === "Paid");
  const totalRevenue = paidBookings.reduce((acc, b) => acc + b.total, 0);
  const platformFee = Math.round(totalRevenue * 0.2);
  const pendingPlatformFee = platformFee - S.settled;

  const settlePlatformFee = () => {
    updateState((prev) => ({
      ...prev,
      settled: platformFee,
    }));
  };

  // Field Washer Actions
  const togglePhoto = (bookingId: string, key: "bf" | "af", index: number) => {
    updateState((prev) => ({
      ...prev,
      bk: prev.bk.map((b) => {
        if (b.id !== bookingId) return b;
        const arr = [...b[key]];
        arr[index] = arr[index] ? 0 : 1;
        return { ...b, [key]: arr };
      }),
    }));
  };

  const updateBookingStatus = (bookingId: string, st: BookingItem["st"]) => {
    updateState((prev) => ({
      ...prev,
      bk: prev.bk.map((b) => (b.id === bookingId ? { ...b, st } : b)),
    }));
  };

  const markCashPaid = (bookingId: string) => {
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

  const submitReview = () => {
    if (!M || !M.rvId) return;
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
      {/* 1. AUTH SCREEN */}
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
            <div className="cd">
              <h1 style={{ fontSize: "24px" }}>Welcome back</h1>
              <p className="mu">Choose your portal to continue</p>

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

              {authRole === "customer" && (
                <div className="tabs" style={{ marginTop: "12px" }}>
                  <button
                    className={!authReg ? "on" : ""}
                    onClick={() => handleRegToggle(false)}
                  >
                    Sign in
                  </button>
                  <button
                    className={authReg ? "on" : ""}
                    onClick={() => handleRegToggle(true)}
                  >
                    Register
                  </button>
                </div>
              )}

              <label>Username</label>
              <input
                value={authU}
                onChange={(e) => setAuthU(e.target.value)}
                placeholder="Enter username"
              />

              <label>Password</label>
              <input
                type="password"
                value={authP}
                onChange={(e) => setAuthP(e.target.value)}
                placeholder="Enter password"
              />

              {authReg && authRole === "customer" && (
                <>
                  <label>Your car</label>
                  <input
                    value={authCarName}
                    onChange={(e) => setAuthCarName(e.target.value)}
                    placeholder="e.g. Honda City"
                  />

                  <label>Car type</label>
                  <select
                    value={authCarType}
                    onChange={(e) => setAuthCarType(e.target.value)}
                  >
                    {CAR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  <label>Plate number</label>
                  <input
                    value={authPlate}
                    onChange={(e) => setAuthPlate(e.target.value)}
                    placeholder="MH12XY0000"
                  />

                  <label>Parking spot</label>
                  <input
                    value={authSpot}
                    onChange={(e) => setAuthSpot(e.target.value)}
                    placeholder="Basement 2, Pillar 45"
                  />
                </>
              )}

              <div
                id="er"
                className="sm"
                style={{ color: "var(--rd)", minHeight: "18px", marginTop: "8px" }}
              >
                {authErr}
              </div>

              <button className="btn w" onClick={() => handleLogin(false)}>
                {authReg && authRole === "customer" ? "Create account" : "Sign in"}
              </button>

              <button
                className="btn o w"
                style={{ marginTop: "8px" }}
                onClick={() => handleLogin(true)}
              >
                Quick demo ({CR[authRole][0]})
              </button>
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

          {/* 4. FIELD WASHER PORTAL */}
          {S.role === "washer" && (
            <div className="wrap ph">
              <h1 style={{ fontSize: "24px" }}>My jobs</h1>
              <div className="tabs" style={{ margin: "14px 0" }}>
                {(["today", "done"] as const).map((t) => {
                  const all = S.bk.filter((b) => b.w === "Rajesh Kumar");
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
                const all = S.bk.filter((b) => b.w === "Rajesh Kumar");
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
                              <div
                                key={label}
                                className={`pb ${b.bf[idx] ? "on" : ""}`}
                                onClick={() => togglePhoto(b.id, "bf", idx)}
                              >
                                {b.bf[idx] ? "✓ " + label : "📷 " + label}
                              </div>
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
                                <div
                                  key={label}
                                  className={`pb ${b.af[idx] ? "on" : ""}`}
                                  onClick={() => togglePhoto(b.id, "af", idx)}
                                >
                                  {b.af[idx] ? "✓ " + label : "📷 " + label}
                                </div>
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
                          <p className="mu sm" style={{ textAlign: "center" }}>
                            Or the customer pays by UPI from their app.
                          </p>
                        </>
                      )}

                      {b.st === "Paid" && (
                        <div className="mu sm">
                          Paid by {b.pay}. Photos sent to the customer.
                        </div>
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
                  "Review",
                ];
                const total = getBookingTotal();
                const ok =
                  s === 1
                    ? (M.cars || []).length > 0
                    : s === 4
                    ? Boolean(M.addr?.trim() && M.spot?.trim())
                    : true;

                return (
                  <div>
                    <div className="stp">
                      {T.map((_, i) => (
                        <i key={i} className={i < s ? "on" : ""} />
                      ))}
                    </div>

                    <div className="row">
                      <h2>{T[s - 1]}</h2>
                      <span className="mu sm">Step {s} of 5</span>
                    </div>

                    {/* Step 1: Cars */}
                    {s === 1 && (
                      <div>
                        {S.cars.length ? (
                          S.cars.map((c) => {
                            const isSelected = (M.cars || []).includes(c.id);
                            return (
                              <div
                                key={c.id}
                                className={`sel ${isSelected ? "on" : ""}`}
                                onClick={() => toggleModalCar(c.id)}
                              >
                                <div className="row" style={{ gap: "12px" }}>
                                  <div className="ci">{carSvg}</div>
                                  <div>
                                    <b>{c.name}</b>
                                    <div className="mu sm">
                                      {c.type} · {c.plate}
                                    </div>
                                  </div>
                                </div>
                                <span>{isSelected ? "✓" : ""}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="em">Add a car in My garage first.</div>
                        )}
                      </div>
                    )}

                    {/* Step 2: Package */}
                    {s === 2 && (
                      <div>
                        {PK.map((x) => (
                          <div
                            key={x.id}
                            className={`sel ${M.pkg === x.id ? "on" : ""}`}
                            onClick={() => setM({ ...M, pkg: x.id })}
                          >
                            <div>
                              <b>{x.n}</b>
                              <div className="mu sm">{x.d}</div>
                            </div>
                            <b>
                              {R(x.p)}
                              <span className="mu sm">/car</span>
                            </b>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step 3: Date and time */}
                    {s === 3 && (
                      <div>
                        <label>Date</label>
                        <div className="chips">
                          {(M.ds || []).map((d) => (
                            <span
                              key={d}
                              className={`chip ${M.d === d ? "on" : ""}`}
                              onClick={() => setM({ ...M, d })}
                            >
                              {d}
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
                      </div>
                    )}

                    {/* Step 4: Location */}
                    {s === 4 && (
                      <div>
                        <label>Service address</label>
                        <input
                          value={M.addr || ""}
                          onChange={(e) => setM({ ...M, addr: e.target.value })}
                        />

                        <label>Exact parking spot</label>
                        <input
                          value={M.spot || ""}
                          onChange={(e) => setM({ ...M, spot: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Step 5: Review & Confirm */}
                    {s === 5 && (
                      <div>
                        <div className="cd" style={{ boxShadow: "none" }}>
                          <div className="row">
                            <span className="mu">
                              {(M.cars || []).length} car
                              {(M.cars || []).length > 1 ? "s" : ""} · {pkgItem.n}
                            </span>
                            <span>
                              {R(pkgItem.p)} × {(M.cars || []).length}
                            </span>
                          </div>
                          <div className="mu sm" style={{ margin: "6px 0" }}>
                            {M.d}, {M.sl}
                            <br />
                            {M.spot}, {M.addr}
                          </div>
                          <hr style={{ border: 0, borderTop: "1px solid var(--ln)" }} />
                          <div className="row">
                            <b>Total amount</b>
                            <span className="mt">{R(total)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Modal navigation buttons */}
                    <div className="row" style={{ marginTop: "18px" }}>
                      {s > 1 ? (
                        <button
                          className="btn o"
                          onClick={() => setM({ ...M, s: s - 1 })}
                        >
                          Back
                        </button>
                      ) : (
                        <button className="btn o" onClick={() => setM(null)}>
                          Cancel
                        </button>
                      )}

                      {s < 5 ? (
                        <button
                          className="btn"
                          disabled={!ok}
                          onClick={() => setM({ ...M, s: s + 1 })}
                        >
                          Next
                        </button>
                      ) : (
                        <button className="btn" onClick={confirmBooking}>
                          Confirm and book · {R(total)}
                        </button>
                      )}
                    </div>
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
