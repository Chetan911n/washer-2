"use client";

import React from "react";
import { Sparkles, ShieldCheck, Car, LogOut, LogIn, Building2 } from "lucide-react";
import { UserRole } from "@/lib/types";

interface HeaderProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  userName?: string;
  userPhone?: string;
  isLoggedIn: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Header({
  role,
  onRoleChange,
  userName,
  userPhone,
  isLoggedIn,
  onOpenAuth,
  onLogout,
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
                Partner Hub
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Station Head • Crew Dispatch • Cash Settlement
            </p>
          </div>
        </div>

        {/* 3-Role Switcher: Customer | Station Head | Washer */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => onRoleChange("customer")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${
              role === "customer"
                ? "bg-white text-blue-700 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Customer</span>
          </button>

          <button
            onClick={() => onRoleChange("station_head")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${
              role === "station_head"
                ? "bg-indigo-600 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Station Head</span>
          </button>

          <button
            onClick={() => onRoleChange("washer")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all ${
              role === "washer"
                ? "bg-blue-600 text-white shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Field Washer</span>
          </button>
        </div>

        {/* Profile / Auth */}
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-left">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400">{userPhone}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
