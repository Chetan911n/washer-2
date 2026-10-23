"use client";

import React, { useState } from "react";
import { useAppWasherStore } from "@/lib/store";
import { Header } from "@/components/Header";
import { CustomerView } from "@/components/CustomerView";
import { WasherView } from "@/components/WasherView";
import { AuthModal } from "@/components/AuthModal";
import { Car, Info, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  const {
    user,
    role,
    bookings,
    setRole,
    setUser,
    addCarToGarage,
    createBooking,
    addBeforePhotos,
    completeJob,
    markPaymentPaid,
    submitReview,
  } = useAppWasherStore();

  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Global Header */}
      <Header
        role={role}
        onRoleChange={setRole}
        userName={user.name}
        userPhone={user.phone}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Interactive Quick Tour / Testing Banner */}
      <div className="bg-blue-50/90 border-b border-blue-200/80 px-4 py-2.5 text-xs text-blue-900">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Dual-Role Testing Mode:</strong> Toggle between{" "}
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
              Current Mode: <strong className="capitalize">{role}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {role === "customer" ? (
          <CustomerView
            user={user}
            bookings={bookings}
            onAddCar={addCarToGarage}
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
            App Washer • Doorstep Car Wash Automation
          </p>
          <p className="text-[11px] text-slate-400">
            Built for GitHub & Vercel Deployment • Real-time UPI Payments & Insurance Inspection Records
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={user}
        onLoginSuccess={setUser}
      />
    </div>
  );
}
