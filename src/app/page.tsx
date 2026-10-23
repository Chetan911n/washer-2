"use client";

import React, { useState } from "react";
import { useAppWasherStore } from "@/lib/store";
import { Header } from "@/components/Header";
import { CustomerView } from "@/components/CustomerView";
import { WasherView } from "@/components/WasherView";
import { LoginPage } from "@/components/LoginPage";
import { DEFAULT_CUSTOMER, DEFAULT_WASHER } from "@/lib/defaultData";
import { Info, Sparkles } from "lucide-react";

export default function Home() {
  const {
    user,
    isLoaded,
    role,
    bookings,
    setRole,
    setUser,
    logout,
    loginDemo,
    addCarToGarage,
    addAddressToUser,
    createBooking,
    addBeforePhotos,
    completeJob,
    markPaymentPaid,
    submitReview,
  } = useAppWasherStore();

  const [authModalOpen, setAuthModalOpen] = useState(false);

  // If initial local storage sync is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
          <Sparkles className="w-5 h-5 text-blue-600 animate-spin" />
          <span>Loading App Washer...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in, show initial login screen first!
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Header
          role={role}
          onRoleChange={setRole}
          isLoggedIn={false}
          onOpenAuth={() => setAuthModalOpen(true)}
          onLogout={logout}
        />
        <main className="flex-1">
          <LoginPage
            onLogin={(u, r) => {
              setUser(u);
              if (r) setRole(r);
            }}
            onDemoLogin={loginDemo}
            onWasherLogin={() => {
              setRole("washer");
              setUser({
                ...DEFAULT_CUSTOMER,
                name: DEFAULT_WASHER.name,
                username: DEFAULT_WASHER.username,
                role: "washer",
                phone: DEFAULT_WASHER.phone,
                isLoggedIn: true,
              });
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Global Header */}
      <Header
        role={role}
        onRoleChange={setRole}
        userName={user?.name || "Partner"}
        userPhone={user?.phone || "+91 91234 56789"}
        isLoggedIn={!!user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={logout}
      />

      {/* Interactive Quick Tour / Testing Banner */}
      <div className="bg-blue-50/90 border-b border-blue-200/80 px-4 py-2 text-xs text-blue-900">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Dual-Role Testing:</strong> Toggle between{" "}
              <button
                onClick={() => setRole("customer")}
                className="font-bold underline text-blue-700 hover:text-blue-900"
              >
                Customer
              </button>{" "}
              and{" "}
              <button
                onClick={() => setRole("washer")}
                className="font-bold underline text-blue-700 hover:text-blue-900"
              >
                Washer App
              </button>{" "}
              at the top bar to test the end-to-end flow!
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200 font-medium">
              Mode: <strong className="capitalize">{role}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {role === "customer" && user ? (
          <CustomerView
            user={user}
            bookings={bookings}
            onAddCar={addCarToGarage}
            onAddAddress={addAddressToUser}
            onCreateBooking={createBooking}
            onPaymentSuccess={markPaymentPaid}
            onSubmitReview={submitReview}
          />
        ) : (
          <WasherView
            bookings={bookings}
            onSaveBeforePhotos={addBeforePhotos}
            onCompleteJob={completeJob}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 space-y-1.5">
          <p className="font-semibold text-slate-700">
            App Washer • Doorstep Car Wash Platform
          </p>
          <p className="text-[11px] text-slate-400">
            Username & Password Auth • Multi-Car Doorstep Wash • UPI Automation
          </p>
        </div>
      </footer>
    </div>
  );
}
