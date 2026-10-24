"use client";

import React from "react";
import { Sparkles, ShieldCheck, Car, LogOut, LogIn, Building2, Droplets } from "lucide-react";
import { UserRole } from "@/lib/types";

interface HeaderProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  userName?: string;
  userPhone?: string;
  isLoggedIn: boolean;
  userRole?: UserRole;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Header({
  role,
  onRoleChange,
  userName,
  userPhone,
  isLoggedIn,
  userRole,
  onOpenAuth,
  onLogout,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7EBE8] shadow-2xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#07865B] to-[#066747] flex items-center justify-center text-white shadow-md shadow-[#07865B]/20">
            <Droplets className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#171A19] text-lg tracking-tight">
                AppWasher
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F7EF] text-[#07865B] uppercase tracking-wider border border-[#07865B]/20">
                Partner Hub
              </span>
            </div>
            <p className="text-[11px] text-[#707875] hidden sm:block">
              Station Head • Crew Dispatch • Cash Settlement
            </p>
          </div>
        </div>

        {/* Role View: Locked Badge when logged in, or Portal Switcher when logged out */}
        {isLoggedIn ? (
          <div className="flex items-center">
            {role === "customer" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8F7EF] border border-[#07865B]/25 text-[#07865B] text-xs font-bold shadow-2xs">
                <Car className="w-3.5 h-3.5 text-[#07865B]" />
                <span>Customer Portal</span>
              </div>
            )}
            {role === "station_head" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2FAF6] border border-[#07865B]/30 text-[#066747] text-xs font-bold shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-[#07865B]" />
                <span>Station Head Hub</span>
              </div>
            )}
            {role === "washer" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F8F7] border border-[#E7EBE8] text-[#171A19] text-xs font-bold shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#07865B]" />
                <span>Field Washer Portal</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center bg-[#F7F8F7] p-1 rounded-xl border border-[#E7EBE8] text-xs font-semibold">
            <button
              onClick={() => onRoleChange("customer")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                role === "customer"
                  ? "bg-[#07865B] text-white shadow-xs font-bold"
                  : "text-[#707875] hover:text-[#171A19]"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer</span>
            </button>

            <button
              onClick={() => onRoleChange("station_head")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                role === "station_head"
                  ? "bg-[#07865B] text-white shadow-xs font-bold"
                  : "text-[#707875] hover:text-[#171A19]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Station Head</span>
            </button>

            <button
              onClick={() => onRoleChange("washer")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                role === "washer"
                  ? "bg-[#07865B] text-white shadow-xs font-bold"
                  : "text-[#707875] hover:text-[#171A19]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Field Washer</span>
            </button>
          </div>
        )}

        {/* Profile / Auth */}
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-[#E7EBE8] bg-[#F7F8F7] text-left">
              <div className="w-7 h-7 rounded-full bg-[#07865B] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-[#171A19] leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-[#707875]">{userPhone}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-xl text-[#707875] hover:text-rose-600 hover:bg-rose-50 border border-[#E7EBE8] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#07865B] hover:bg-[#066747] text-white text-xs font-bold transition-all shadow-sm shadow-[#07865B]/20"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
