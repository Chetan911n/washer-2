"use client";

import React, { useState } from "react";
import { User, CarType, UserRole } from "@/lib/types";
import { DEFAULT_CUSTOMER, DEFAULT_WASHER } from "@/lib/defaultData";
import {
  Sparkles,
  Phone,
  Mail,
  User as UserIcon,
  Lock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Car as CarIcon,
  KeyRound,
} from "lucide-react";

interface LoginPageProps {
  onLogin: (user: User, role?: UserRole) => void;
  onDemoLogin: () => void;
  onWasherLogin: () => void;
}

const CAR_TYPES: { type: CarType; desc: string; icon: string }[] = [
  { type: "Hatchback", desc: "Swift, i20, Tiago, Polo", icon: "🚗" },
  { type: "Compact SUV", desc: "Brezza, Venue, Nexon, Sonet", icon: "🚙" },
  { type: "Sedan", desc: "City, Verna, Ciaz, Slavia", icon: "🚘" },
  { type: "SUV", desc: "Creta, Harrier, Scorpio, XUV700", icon: "🚙" },
  { type: "Luxury", desc: "BMW, Audi, Mercedes, Fortuner", icon: "✨" },
];

export function LoginPage({
  onLogin,
  onDemoLogin,
  onWasherLogin,
}: LoginPageProps) {
  // Mode: Customer vs Washer Partner
  const [authRole, setAuthRole] = useState<"customer" | "washer">("customer");

  // Customer sub-method: "username" | "phone" | "email"
  const [customerMethod, setCustomerMethod] = useState<
    "username" | "phone" | "email"
  >("username");

  // Customer form inputs
  const [username, setUsername] = useState("chetan");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("Chetan Sharma");
  const [phone, setPhone] = useState("9876543210");
  const [email, setEmail] = useState("chetan@example.com");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Washer form inputs
  const [washerUsername, setWasherUsername] = useState("rajesh");
  const [washerPassword, setWasherPassword] = useState("washer123");

  // Onboarding step (for new customer)
  const [step, setStep] = useState<"auth" | "onboarding">("auth");
  const [carType, setCarType] = useState<CarType>("SUV");
  const [carName, setCarName] = useState("Hyundai Creta SX");
  const [carNumber, setCarNumber] = useState("KA 05 MN 4589");
  const [carColor, setCarColor] = useState("Polar White");
  const [streetAddress, setStreetAddress] = useState(
    "Prestige Ferns Residency, Tower 4, Flat 802"
  );
  const [parkingSpot, setParkingSpot] = useState(
    "Basement 2, Pillar #45 (Covered Bay)"
  );
  const [city, setCity] = useState("Bangalore");
  const [authenticatedUser, setAuthenticatedUser] = useState<Partial<User>>({});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Customer Username + Password Login
  const handleCustomerUsernameLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Accept valid demo credentials or any non-empty username/password
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter both username and password");
      return;
    }

    if (username.toLowerCase() === "chetan" && password === "password123") {
      onLogin({ ...DEFAULT_CUSTOMER, isLoggedIn: true }, "customer");
    } else {
      // New user registration flow with onboarding
      setAuthenticatedUser({
        id: "user-" + Date.now(),
        username: username.trim(),
        name: name || username.trim(),
        phone: "+91 98765 43210",
        email: `${username.trim()}@appwasher.com`,
        role: "customer",
      });
      setStep("onboarding");
    }
  };

  // Washer Username + Password Login
  const handleWasherLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!washerUsername.trim() || !washerPassword.trim()) {
      setErrorMsg("Please enter washer partner username and password");
      return;
    }

    // Default washer account: rajesh / washer123
    onWasherLogin();
  };

  // Customer Phone + OTP Login
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    setOtpSent(true);
    setOtp("123456");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const userBase: Partial<User> = {
      id: "user-" + Date.now(),
      name: name || "Customer",
      phone: phone.startsWith("+91") ? phone : `+91 ${phone}`,
      email: `${phone}@appwasher.com`,
      role: "customer",
    };
    setAuthenticatedUser(userBase);
    setStep("onboarding");
  };

  // Customer Google Login
  const handleGoogleLogin = () => {
    onLogin({ ...DEFAULT_CUSTOMER, isLoggedIn: true }, "customer");
  };

  // Finish Onboarding
  const handleCompleteOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUser: User = {
      id: authenticatedUser.id || "user-" + Date.now(),
      name: authenticatedUser.name || name || "Customer",
      username: authenticatedUser.username || username || "customer",
      password: authenticatedUser.password || password || "password123",
      phone: authenticatedUser.phone || "+91 98765 43210",
      email: authenticatedUser.email || "customer@example.com",
      role: "customer",
      isLoggedIn: true,
      garage: [
        {
          id: "car-1",
          name: carName.trim(),
          type: carType,
          carNumber: carNumber.toUpperCase().trim(),
          color: carColor.trim(),
        },
      ],
      addresses: [
        {
          id: "addr-1",
          label: "Home",
          street: streetAddress.trim(),
          parkingSpot: parkingSpot.trim(),
          city: city.trim(),
        },
      ],
    };
    onLogin(finalUser, "customer");
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Role Toggle: Customer vs Washer */}
        <div className="bg-slate-900 text-white p-3 flex items-center justify-between text-xs font-bold">
          <span className="text-slate-400">Account Type:</span>
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => {
                setAuthRole("customer");
                setErrorMsg(null);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                authRole === "customer"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CarIcon className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthRole("washer");
                setErrorMsg(null);
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                authRole === "washer"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Washer Partner</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <div
          className={`p-6 text-center text-white ${
            authRole === "customer"
              ? "bg-gradient-to-br from-blue-600 to-indigo-800"
              : "bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md mx-auto mb-2.5 flex items-center justify-center text-white shadow-inner">
            {authRole === "customer" ? (
              <Sparkles className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            {step === "onboarding"
              ? "Setup Your Car & Address"
              : authRole === "customer"
              ? "Customer Sign In"
              : "Washer Partner Portal"}
          </h1>
          <p className="text-xs text-blue-100 mt-1">
            {authRole === "customer"
              ? "Book doorstep washes with verified photo protection & UPI"
              : "Manage doorstep assignments, before-after photos & payouts"}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
              {errorMsg}
            </div>
          )}

          {step === "auth" ? (
            authRole === "customer" ? (
              /* Customer Login Form */
              <div className="space-y-4">
                {/* Method Tabs */}
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCustomerMethod("username")}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                      customerMethod === "username"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Username
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMethod("phone")}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                      customerMethod === "phone"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Phone OTP
                  </button>
                </div>

                {customerMethod === "username" ? (
                  /* Username + Password form */
                  <form
                    onSubmit={handleCustomerUsernameLogin}
                    className="space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Username
                        </label>
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                          demo: chetan
                        </span>
                      </div>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. chetan"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Password
                        </label>
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                          password123
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Sign In as Customer</span>
                    </button>
                  </form>
                ) : !otpSent ? (
                  /* Phone + OTP */
                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Chetan Sharma"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mobile Number
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-sm text-slate-500 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={phone}
                          onChange={(e) =>
                            setPhone(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="98765 43210"
                          className="w-full px-3 py-2 text-sm rounded-r-xl border border-slate-300"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>Send OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                      OTP sent to <strong>+91 {phone}</strong>. Auto-filled code:{" "}
                      <strong>123456</strong>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Enter OTP
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full px-3 py-2 text-center text-lg font-bold tracking-widest rounded-xl border border-slate-300"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors"
                    >
                      Verify & Continue
                    </button>
                  </form>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    or
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Google Sign-In */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2 px-3 border border-slate-300 hover:bg-slate-50 font-semibold rounded-xl text-xs text-slate-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* 1-Tap Demo Account */}
                <button
                  type="button"
                  onClick={onDemoLogin}
                  className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>1-Tap Customer Demo Login (Chetan)</span>
                </button>
              </div>
            ) : (
              /* Washer Partner Login Form (Username + Password) */
              <div className="space-y-4">
                <form onSubmit={handleWasherLoginSubmit} className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                    <p className="font-bold">Doorstep Partner Authentication</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Login using your assigned washer partner username and password.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Washer Username
                      </label>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                        rajesh
                      </span>
                    </div>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={washerUsername}
                        onChange={(e) => setWasherUsername(e.target.value)}
                        placeholder="rajesh"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Washer Password
                      </label>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                        washer123
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={washerPassword}
                        onChange={(e) => setWasherPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Sign In to Washer Portal</span>
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onWasherLogin}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>1-Tap Demo Washer Login (Rajesh Kumar)</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Onboarding Step: Add Vehicle & Address */
            <form onSubmit={handleCompleteOnboarding} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                Hi <strong>{authenticatedUser.name}</strong>, please add your vehicle and parking address to finish setup!
              </div>

              {/* Car Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Select Car Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CAR_TYPES.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setCarType(item.type)}
                      className={`p-2 rounded-xl border text-left flex items-start gap-2 transition-all ${
                        carType === item.type
                          ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 block">
                          {item.type}
                        </span>
                        <p className="text-[9px] text-slate-400 truncate">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Car Name & Model */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Car Brand & Model
                </label>
                <input
                  type="text"
                  required
                  value={carName}
                  onChange={(e) => setCarName(e.target.value)}
                  placeholder="e.g. Hyundai Creta SX"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                />
              </div>

              {/* Car Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={carNumber}
                  onChange={(e) => setCarNumber(e.target.value)}
                  placeholder="e.g. KA 05 MN 4589"
                  className="w-full px-3 py-2 text-sm uppercase font-mono tracking-wider rounded-xl border border-slate-300"
                />
              </div>

              {/* Address & Parking Spot */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  4. Service Address & Parking Spot
                </label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Building / Apartment address"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
                <input
                  type="text"
                  required
                  value={parkingSpot}
                  onChange={(e) => setParkingSpot(e.target.value)}
                  placeholder="Parking Spot: e.g. Basement 2, Pillar #45"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-blue-400 bg-blue-50/50 font-semibold text-blue-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Save & Enter Dashboard</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
