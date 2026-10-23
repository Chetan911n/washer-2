"use client";

import React from "react";
import { Sparkles, UserCheck, ShieldCheck, Car } from "lucide-react";
import { UserRole } from "@/lib/types";

interface HeaderProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  userName: string;
  userPhone: string;
  onOpenAuth: () => void;
}

export function Header({
  role,
  onRoleChange,
  userName,
  userPhone,
  onOpenAuth,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                AppWasher
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase tracking-wider">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Doorstep Car Wash • UPI & Photo Verified
            </p>
          </div>
        </div>

        {/* Role Toggle Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onRoleChange("customer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              role === "customer"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Customer</span>
          </button>
          <button
            onClick={() => onRoleChange("washer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              role === "washer"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Washer App</span>
          </button>
        </div>

        {/* Profile / Auth */}
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-800 leading-tight">
              {userName || "Sign In"}
            </p>
            <p className="text-[10px] text-slate-400">{userPhone || "OTP / Google"}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
