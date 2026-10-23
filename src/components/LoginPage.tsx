"use client";

import React, { useState } from "react";
import { User, CarType, UserRole } from "@/lib/types";
import {
  DEFAULT_CUSTOMER,
  DEFAULT_WASHER,
  DEFAULT_STATION_HEAD,
} from "@/lib/defaultData";
import { WasherStore } from "@/lib/store";
import {
  Sparkles,
  Phone,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Car as CarIcon,
  KeyRound,
  Building2,
  AlertCircle,
  Check,
  Zap,
} from "lucide-react";

interface LoginPageProps {
  onLogin: (user: User, role?: UserRole) => void;
  onDemoLogin: (role?: UserRole) => void;
  onWasherLogin: () => void;
  onStationHeadLogin: () => void;
  onRegisterUser?: (user: User) => void;
  onAuthenticate?: (params: {
    identifier: string;
    password?: string;
    role?: UserRole;
  }) => { success: boolean; user?: User; error?: string };
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
  onStationHeadLogin,
  onRegisterUser,
  onAuthenticate,
}: LoginPageProps) {
  // Portal Mode: Customer | Station Head | Washer
  const [authRole, setAuthRole] = useState<UserRole>("customer");

  // Customer Mode: "signin" | "register"
  const [customerMode, setCustomerMode] = useState<"signin" | "register">("signin");

  // Customer Sign-in Sub-method: "username" | "phone" | "google"
  const [customerMethod, setCustomerMethod] = useState<"username" | "phone" | "google">(
    "username"
  );

  // Common UI states
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Customer Sign-in Inputs
  const [username, setUsername] = useState("chetan");
  const [password, setPassword] = useState("password123");

  // Customer Phone OTP Inputs
  const [phone, setPhone] = useState("9876543210");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  // Customer Registration Inputs
  const [regName, setRegName] = useState("Chetan Sharma");
  const [regUsername, setRegUsername] = useState("chetan_new");
  const [regPhone, setRegPhone] = useState("9876543210");
  const [regPassword, setRegPassword] = useState("password123");
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

  // Station Head Inputs
  const [stationUsername, setStationUsername] = useState("vikram");
  const [stationPassword, setStationPassword] = useState("station123");

  // Washer Inputs
  const [washerUsername, setWasherUsername] = useState("rajesh");
  const [washerPassword, setWasherPassword] = useState("washer123");

  // Reset errors when switching tab
  const handleRoleChange = (role: UserRole) => {
    setAuthRole(role);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // 1. Customer Username Login Submit
  const handleCustomerUsernameLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter both username and password.");
      return;
    }

    if (onAuthenticate) {
      const result = onAuthenticate({
        identifier: username,
        password,
        role: "customer",
      });
      if (result.success && result.user) {
        setSuccessMsg(`Welcome back, ${result.user.name}!`);
        onLogin(result.user, "customer");
        return;
      } else {
        setErrorMsg(result.error || "Invalid username or password.");
        return;
      }
    }

    // Direct fallback check
    if (username.toLowerCase() === "chetan" && password === "password123") {
      setSuccessMsg("Welcome back, Chetan!");
      onLogin({ ...DEFAULT_CUSTOMER, isLoggedIn: true }, "customer");
    } else {
      const authResult = WasherStore.authenticateUser({
        identifier: username,
        password,
        role: "customer",
      });
      if (authResult.success && authResult.user) {
        setSuccessMsg(`Welcome back, ${authResult.user.name}!`);
        onLogin(authResult.user, "customer");
      } else {
        setErrorMsg(authResult.error || "Invalid credentials. Demo: chetan / password123");
      }
    }
  };

  // 2. Customer Phone OTP Login
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    setErrorMsg(null);
    setOtpSent(true);
    setOtp("123456"); // Pre-filled for demo ease
    setSuccessMsg("OTP sent: 123456 (auto-filled for testing)");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== "123456" && otp.length < 4) {
      setErrorMsg("Invalid OTP code. Please enter 123456.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const registered = WasherStore.getRegisteredUsers().find(
      (u) => u.phone.replace(/\D/g, "").includes(cleanPhone)
    );

    if (registered) {
      setSuccessMsg(`Phone verified! Welcome back, ${registered.name}!`);
      onLogin({ ...registered, isLoggedIn: true }, "customer");
    } else {
      // New phone user -> log in with default garage & entered phone
      const newUser: User = {
        id: "cust-" + Date.now(),
        name: "Customer (" + cleanPhone.slice(-4) + ")",
        username: "user_" + cleanPhone.slice(-4),
        phone: "+91 " + cleanPhone,
        email: `cust_${cleanPhone}@appwasher.com`,
        role: "customer",
        garage: [],
        addresses: [],
        isLoggedIn: true,
      };
      WasherStore.registerUser(newUser);
      if (onRegisterUser) onRegisterUser(newUser);
      onLogin(newUser, "customer");
    }
  };

  // 3. Google One-Click Login
  const handleGoogleLogin = () => {
    setErrorMsg(null);
    setSuccessMsg("Signing in with verified Google account...");
    const googleUser: User = {
      id: "cust-google-01",
      name: "Chetan Sharma (Google)",
      username: "chetan_google",
      phone: "+91 98765 43210",
      email: "chetan.sharma@gmail.com",
      role: "customer",
      garage: [],
      addresses: [],
      isLoggedIn: true,
    };
    WasherStore.registerUser(googleUser);
    if (onRegisterUser) onRegisterUser(googleUser);
    onLogin(googleUser, "customer");
  };

  // 4. Customer Full Registration (with Car & Address)
  const handleCustomerRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regName.trim() || !regPhone.trim()) {
      setErrorMsg("Please provide your name and phone number.");
      return;
    }

    const newUser: User = {
      id: "cust-" + Date.now(),
      name: regName.trim(),
      username: regUsername.trim() || regName.toLowerCase().replace(/\s+/g, ""),
      password: regPassword || "password123",
      phone: regPhone.startsWith("+91") ? regPhone : `+91 ${regPhone}`,
      email: `${regUsername || "customer"}@appwasher.com`,
      role: "customer",
      isLoggedIn: true,
      garage: [
        {
          id: "car-reg-" + Date.now(),
          name: carName.trim() || "My Car",
          type: carType,
          carNumber: (carNumber.trim() || "KA 01 AA 1234").toUpperCase(),
          color: carColor.trim() || "Polar White",
        },
      ],
      addresses: [
        {
          id: "addr-reg-" + Date.now(),
          label: "Home",
          street: streetAddress.trim() || "Main Street, Apt 101",
          parkingSpot: parkingSpot.trim() || "Covered Bay Slot #12",
          city: city.trim() || "Bangalore",
        },
      ],
    };

    WasherStore.registerUser(newUser);
    if (onRegisterUser) onRegisterUser(newUser);
    setSuccessMsg("Account registered successfully! Entering dashboard...");
    onLogin(newUser, "customer");
  };

  // 5. Station Head Login Submit
  const handleStationHeadLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!stationUsername.trim() || !stationPassword.trim()) {
      setErrorMsg("Please enter Station Head username and password.");
      return;
    }

    if (stationUsername.toLowerCase() === "vikram" && stationPassword === "station123") {
      setSuccessMsg("Welcome, Hub Manager Vikram Singh!");
      onStationHeadLogin();
      return;
    }

    const authResult = WasherStore.authenticateUser({
      identifier: stationUsername,
      password: stationPassword,
      role: "station_head",
    });

    if (authResult.success && authResult.user) {
      setSuccessMsg(`Welcome, ${authResult.user.name}!`);
      onStationHeadLogin();
    } else {
      setErrorMsg(
        authResult.error || "Invalid Station Head credentials. Try: vikram / station123"
      );
    }
  };

  // 6. Washer Login Submit
  const handleWasherLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!washerUsername.trim() || !washerPassword.trim()) {
      setErrorMsg("Please enter Washer username and password.");
      return;
    }

    if (
      (washerUsername.toLowerCase() === "rajesh" || washerUsername.toLowerCase() === "suresh") &&
      washerPassword === "washer123"
    ) {
      setSuccessMsg(`Welcome, Technician ${washerUsername}!`);
      onWasherLogin();
      return;
    }

    const authResult = WasherStore.authenticateUser({
      identifier: washerUsername,
      password: washerPassword,
      role: "washer",
    });

    if (authResult.success && authResult.user) {
      setSuccessMsg(`Welcome, ${authResult.user.name}!`);
      onWasherLogin();
    } else {
      setErrorMsg(
        authResult.error || "Invalid Washer credentials. Try: rajesh / washer123"
      );
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Role Selector Tabs */}
        <div className="bg-slate-900 text-white p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold">
          <span className="text-slate-400">Select Portal:</span>
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleRoleChange("customer")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
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
              onClick={() => handleRoleChange("station_head")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                authRole === "station_head"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Station Head</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange("washer")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                authRole === "washer"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Washer</span>
            </button>
          </div>
        </div>

        {/* Dynamic Header Banner */}
        <div
          className={`p-6 text-center text-white transition-colors duration-300 ${
            authRole === "customer"
              ? "bg-gradient-to-br from-blue-600 to-indigo-800"
              : authRole === "station_head"
              ? "bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900"
              : "bg-gradient-to-br from-slate-900 to-blue-950"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md mx-auto mb-2 flex items-center justify-center text-white shadow-inner">
            {authRole === "customer" ? (
              <Sparkles className="w-6 h-6" />
            ) : authRole === "station_head" ? (
              <Building2 className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            {authRole === "customer"
              ? customerMode === "signin"
                ? "Customer Sign In"
                : "Register New Customer"
              : authRole === "station_head"
              ? "Station Head / Hub Manager"
              : "Field Washer Technician Portal"}
          </h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xs mx-auto">
            {authRole === "customer"
              ? "Doorstep car wash with photo inspection liability protection & UPI"
              : authRole === "station_head"
              ? "Receive area bookings, dispatch staff, and settle 20% platform share"
              : "On-site wash, mandatory Before/After photos with retakes, and cash/UPI collection"}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Notifications */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* CUSTOMER PORTAL */}
          {authRole === "customer" && (
            <div className="space-y-4">
              {/* Sign In vs Register Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode("signin");
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    customerMode === "signin"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode("register");
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    customerMode === "register"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Register / Add Car
                </button>
              </div>

              {customerMode === "signin" ? (
                /* Customer Sign In Options */
                <div className="space-y-4">
                  {/* Sub-method Switcher */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setCustomerMethod("username")}
                      className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                        customerMethod === "username"
                          ? "bg-white text-blue-700 shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <UserIcon className="w-3 h-3" />
                      <span>Username</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerMethod("phone")}
                      className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                        customerMethod === "phone"
                          ? "bg-white text-blue-700 shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>Phone OTP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerMethod("google")}
                      className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                        customerMethod === "google"
                          ? "bg-white text-blue-700 shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span className="font-bold text-[11px] text-red-500">G</span>
                      <span>Google</span>
                    </button>
                  </div>

                  {/* Method 1: Username & Password */}
                  {customerMethod === "username" && (
                    <form onSubmit={handleCustomerUsernameLogin} className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Username or Email
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setUsername("chetan");
                              setPassword("password123");
                            }}
                            className="text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded font-mono font-medium"
                          >
                            fill: chetan
                          </button>
                        </div>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="chetan"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Password
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">
                            demo: password123
                          </span>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>Sign In as Customer</span>
                      </button>
                    </form>
                  )}

                  {/* Method 2: Phone Number + OTP */}
                  {customerMethod === "phone" && (
                    <div className="space-y-3">
                      {!otpSent ? (
                        <form onSubmit={handleSendOtp} className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Mobile Number
                            </label>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 text-sm text-slate-500 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl font-medium">
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
                                className="w-full px-3 py-2 text-sm rounded-r-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
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
                            OTP sent to <strong>+91 {phone}</strong>. Auto-filled:{" "}
                            <strong>123456</strong>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Enter 6-Digit OTP
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={6}
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              className="w-full px-3 py-2 text-center text-lg font-bold tracking-widest rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verify & Enter Dashboard</span>
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Method 3: Google Connected */}
                  {customerMethod === "google" && (
                    <div className="space-y-3 text-center py-2">
                      <p className="text-xs text-slate-500">
                        Sign in instantly with your verified Google account
                      </p>
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-sm border border-slate-300 transition-colors flex items-center justify-center gap-2.5 shadow-sm"
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
                    </div>
                  )}

                  {/* 1-Tap Customer Demo Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onDemoLogin("customer")}
                      className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-blue-200"
                    >
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      <span>1-Tap Customer Demo Sign In (Chetan)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Customer Register Form (with Car & Address) */
                <form onSubmit={handleCustomerRegister} className="space-y-3.5 text-left">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                    Register once to save your vehicle & doorstep parking spot for seamless washes!
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Chetan Sharma"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={regPhone}
                        onChange={(e) =>
                          setRegPhone(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="9876543210"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="chetan"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="password123"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Car Type Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Select Car Type
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {CAR_TYPES.slice(0, 3).map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setCarType(item.type)}
                          className={`p-1.5 rounded-lg border text-left transition-all ${
                            carType === item.type
                              ? "border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-600"
                              : "border-slate-200 bg-white text-slate-700 text-xs"
                          }`}
                        >
                          <span className="mr-1">{item.icon}</span>
                          <span className="text-[11px]">{item.type}</span>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      {CAR_TYPES.slice(3).map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setCarType(item.type)}
                          className={`p-1.5 rounded-lg border text-left transition-all ${
                            carType === item.type
                              ? "border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-600"
                              : "border-slate-200 bg-white text-slate-700 text-xs"
                          }`}
                        >
                          <span className="mr-1">{item.icon}</span>
                          <span className="text-[11px]">{item.type}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Car Model & Plate */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Car Model
                      </label>
                      <input
                        type="text"
                        required
                        value={carName}
                        onChange={(e) => setCarName(e.target.value)}
                        placeholder="Hyundai Creta SX"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Plate Number
                      </label>
                      <input
                        type="text"
                        required
                        value={carNumber}
                        onChange={(e) => setCarNumber(e.target.value)}
                        placeholder="KA 05 MN 4589"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 uppercase font-mono"
                      />
                    </div>
                  </div>

                  {/* Service Address & Parking Spot */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Service Address & Parking Spot
                    </label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="Apartment / Villa Society Address"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300"
                    />
                    <input
                      type="text"
                      required
                      value={parkingSpot}
                      onChange={(e) => setParkingSpot(e.target.value)}
                      placeholder="e.g. Basement 2, Pillar #45 (Covered Bay)"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-blue-400 bg-blue-50/60 font-semibold text-blue-900"
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Complete Registration & Enter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDemoLogin("customer")}
                      className="w-full py-1.5 text-[11px] text-slate-500 hover:text-slate-700 underline text-center block"
                    >
                      Skip car setup for now (Add cars later)
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STATION HEAD PORTAL */}
          {authRole === "station_head" && (
            <div className="space-y-4">
              <form onSubmit={handleStationHeadLoginSubmit} className="space-y-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Washing Station Hub Partner
                  </p>
                  <p className="text-[11px] text-indigo-700 mt-1">
                    Receive bookings for your area, assign workers from your team, and settle online fees directly with the platform owner.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Station Manager Username
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStationUsername("vikram");
                        setStationPassword("station123");
                      }}
                      className="text-[10px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded font-mono font-medium"
                    >
                      fill: vikram
                    </button>
                  </div>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={stationUsername}
                      onChange={(e) => setStationUsername(e.target.value)}
                      placeholder="vikram"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      demo: station123
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={stationPassword}
                      onChange={(e) => setStationPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Building2 className="w-4 h-4 text-indigo-200" />
                  <span>Sign In as Station Head</span>
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onDemoLogin("station_head")}
                  className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-indigo-200"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1-Tap Demo Station Head Login (Vikram Singh)</span>
                </button>
              </div>
            </div>
          )}

          {/* FIELD WASHER PORTAL */}
          {authRole === "washer" && (
            <div className="space-y-4">
              <form onSubmit={handleWasherLoginSubmit} className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Field Washer Technician Portal
                  </p>
                  <p className="text-[11px] text-blue-700 mt-1">
                    Execute dispatched washes, capture mandatory Before & After photos with retakes, and collect Cash or UPI payments.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Technician Username
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setWasherUsername("rajesh");
                        setWasherPassword("washer123");
                      }}
                      className="text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded font-mono font-medium"
                    >
                      fill: rajesh
                    </button>
                  </div>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={washerUsername}
                      onChange={(e) => setWasherUsername(e.target.value)}
                      placeholder="rajesh"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      demo: washer123
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={washerPassword}
                      onChange={(e) => setWasherPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Sign In as Field Washer</span>
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onDemoLogin("washer")}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-700" />
                  <span>1-Tap Demo Washer Login (Rajesh Kumar)</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick-Test Cheat Sheet Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              ⚡ Instant 1-Click Role Switch
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onDemoLogin("customer")}
                className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
              >
                <span>🚗</span>
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => onDemoLogin("station_head")}
                className="py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg border border-slate-200 text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
              >
                <span>🏢</span>
                <span>Station Head</span>
              </button>
              <button
                type="button"
                onClick={() => onDemoLogin("washer")}
                className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
              >
                <span>🧽</span>
                <span>Washer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
