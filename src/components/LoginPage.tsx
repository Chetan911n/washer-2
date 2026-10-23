"use client";

import React, { useState } from "react";
import { User, CarType } from "@/lib/types";
import {
  Sparkles,
  Phone,
  Mail,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Car as CarIcon,
  MapPin,
} from "lucide-react";

interface LoginPageProps {
  onLogin: (user: User) => void;
  onDemoLogin: () => void;
}

const CAR_TYPES: { type: CarType; desc: string; icon: string }[] = [
  { type: "Hatchback", desc: "Swift, i20, Tiago, Polo", icon: "🚗" },
  { type: "Compact SUV", desc: "Brezza, Venue, Nexon, Sonet", icon: "🚙" },
  { type: "Sedan", desc: "City, Verna, Ciaz, Slavia", icon: "🚘" },
  { type: "SUV", desc: "Creta, Harrier, Scorpio, XUV700", icon: "🚙" },
  { type: "Luxury", desc: "BMW, Audi, Mercedes, Fortuner", icon: "✨" },
];

export function LoginPage({ onLogin, onDemoLogin }: LoginPageProps) {
  const [step, setStep] = useState<"auth" | "onboarding">("auth");
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("9876543210");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("Chetan Sharma");
  const [isLoading, setIsLoading] = useState(false);

  // Onboarding state: Car + Address
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

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
      setOtp("123456");
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const userBase: Partial<User> = {
        id: "user-" + Date.now(),
        name: name || "Customer",
        phone: phone.startsWith("+91") ? phone : `+91 ${phone}`,
        email: email || `${phone}@appwasher.com`,
        role: "customer",
      };
      setAuthenticatedUser(userBase);
      setStep("onboarding");
    }, 400);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const userBase: Partial<User> = {
        id: "user-" + Date.now(),
        name: name || "Customer",
        phone: "+91 98765 43210",
        email: email || "customer@example.com",
        role: "customer",
      };
      setAuthenticatedUser(userBase);
      setStep("onboarding");
    }, 400);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const userBase: Partial<User> = {
        id: "user-" + Date.now(),
        name: "Chetan Sharma (Google)",
        phone: "+91 98765 43210",
        email: "chetan.google@example.com",
        role: "customer",
      };
      setAuthenticatedUser(userBase);
      setStep("onboarding");
    }, 400);
  };

  const handleCompleteOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUser: User = {
      id: authenticatedUser.id || "user-" + Date.now(),
      name: authenticatedUser.name || "Customer",
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
    onLogin(finalUser);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md mx-auto mb-3 flex items-center justify-center text-white shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            {step === "auth" ? "Welcome to App Washer" : "Setup Your Car & Address"}
          </h1>
          <p className="text-xs text-blue-100 mt-1">
            {step === "auth"
              ? "Doorstep Car Wash • UPI & Photo Verified"
              : "Add your vehicle and parking spot to start booking washes"}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === "auth" ? (
            <div className="space-y-4">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-xl hover:bg-slate-50 font-semibold text-slate-700 transition-colors shadow-sm text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs uppercase font-medium text-slate-400">
                  or
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Method Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMethod("phone")}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    method === "phone"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Phone No + OTP
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("email")}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    method === "email"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email + Password
                </button>
              </div>

              {method === "phone" ? (
                !otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Chetan Sharma"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 text-sm rounded-r-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20"
                    >
                      <span>Send OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                      OTP sent to <strong>+91 {phone}</strong>. (Auto-filled test
                      code: <strong>123456</strong>)
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
                        placeholder="123456"
                        className="w-full px-3 py-2 text-center tracking-widest text-lg font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Continue</span>
                    </button>
                  </form>
                )
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-3">
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
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="chetan@example.com"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    Sign In with Email
                  </button>
                </form>
              )}

              {/* Instant 1-tap demo login */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={onDemoLogin}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Explore Instantly with Pre-filled Demo Account</span>
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Onboarding - Add Car Type, Car Name, Car Number, Address */
            <form onSubmit={handleCompleteOnboarding} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                Hi <strong>{authenticatedUser.name}</strong>, let&apos;s register your vehicle and parking address so you can book a wash!
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
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Car Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Car Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={carNumber}
                  onChange={(e) => setCarNumber(e.target.value)}
                  placeholder="e.g. KA 05 MN 4589"
                  className="w-full px-3 py-2 text-sm uppercase font-mono tracking-wider rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Address & Parking Spot */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  4. Address & Parking Spot
                </label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Apartment / Building / Street address"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  required
                  value={parkingSpot}
                  onChange={(e) => setParkingSpot(e.target.value)}
                  placeholder="Parking Spot: e.g. Basement 2, Pillar #45"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-900 bg-blue-50/50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Save & Enter App</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
