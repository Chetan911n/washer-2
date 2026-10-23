"use client";

import React, { useState, useEffect } from "react";
import { User, Booking, Car, Address } from "@/lib/types";
import { BookingModal } from "./BookingModal";
import { AddCarModal } from "./AddCarModal";
import { PaymentModal } from "./PaymentModal";
import { ReviewPage } from "./ReviewPage";
import { UiDialog } from "./UiDialog";
import {
  Sparkles,
  Plus,
  Car as CarIcon,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Eye,
  Star,
  Smartphone,
  Flame,
} from "lucide-react";

interface CustomerViewProps {
  user: User;
  bookings: Booking[];
  onAddCar: (car: Omit<Car, "id">) => void;
  onCreateBooking: (data: {
    cars: Car[];
    address: Address;
    date: string;
    timeSlot: string;
    washType: Booking["washType"];
  }) => void;
  onPaymentSuccess: (bookingId: string, ref: string) => void;
  onSubmitReview: (
    bookingId: string,
    review: {
      rating: number;
      tags: string[];
      comment: string;
      tipAmount?: number;
    }
  ) => void;
}

export function CustomerView({
  user,
  bookings,
  onAddCar,
  onCreateBooking,
  onPaymentSuccess,
  onSubmitReview,
}: CustomerViewProps) {
  const [currentView, setCurrentView] = useState<"home" | "review">("home");
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isAddCarOpen, setIsAddCarOpen] = useState(false);
  const [activePaymentBooking, setActivePaymentBooking] =
    useState<Booking | null>(null);
  const [reviewBookingTarget, setReviewBookingTarget] =
    useState<Booking | null>(null);
  const [viewingPhotosBooking, setViewingPhotosBooking] =
    useState<Booking | null>(null);

  // Active in-flight booking
  const activeBooking = bookings.find(
    (b) => b.status !== "REVIEWED"
  );

  // Auto-trigger payment modal when job is completed by washer!
  useEffect(() => {
    const paymentNeeded = bookings.find((b) => b.status === "PAYMENT_PENDING");
    if (paymentNeeded && (!activePaymentBooking || activePaymentBooking.id !== paymentNeeded.id)) {
      setActivePaymentBooking(paymentNeeded);
    }
  }, [bookings, activePaymentBooking]);

  // Handler when user finishes paying via UPI in PaymentModal
  const handlePaymentCompleted = (bookingId: string, ref: string) => {
    onPaymentSuccess(bookingId, ref);
    setActivePaymentBooking(null);

    // Immediately navigate to Review Page!
    const target = bookings.find((b) => b.id === bookingId) || activeBooking;
    if (target) {
      setReviewBookingTarget(target);
      setCurrentView("review");
    }
  };

  // If in review view, render the dedicated Review Page!
  if (currentView === "review" && (reviewBookingTarget || activeBooking)) {
    const target = reviewBookingTarget || activeBooking!;
    return (
      <ReviewPage
        booking={target}
        onSubmitReview={(id, review) => {
          onSubmitReview(id, review);
          setCurrentView("home");
          setReviewBookingTarget(null);
        }}
        onBack={() => {
          setCurrentView("home");
          setReviewBookingTarget(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* If a completed wash was paid and needs review, show unmissable top banner */}
      {bookings.some((b) => b.status === "PAID") && (
        <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 fill-white text-white shrink-0" />
            <div>
              <p className="font-extrabold text-sm">
                Your Wash is Complete & Paid!
              </p>
              <p className="text-xs text-amber-100">
                Please leave a review and rate your washer to close this job.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const paidBooking = bookings.find((b) => b.status === "PAID");
              if (paidBooking) {
                setReviewBookingTarget(paidBooking);
                setCurrentView("review");
              }
            }}
            className="px-4 py-2 bg-white text-orange-700 font-extrabold rounded-xl text-xs hover:bg-orange-50 transition-colors shadow-sm whitespace-nowrap"
          >
            Review Now →
          </button>
        </div>
      )}

      {/* Hero Action Banner: "Book a Car Wash" */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-lg space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-blue-100">
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>Zero Damage Guarantee • Insurance Photos Included</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Doorstep Car Wash at Your Parking Spot
          </h1>

          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Wash 1, 2, or multiple cars together. Verified washers capture mandatory before/after photos and accept UPI on completion.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsBookingOpen(true)}
              className="py-3 px-6 bg-white text-blue-700 hover:bg-blue-50 font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-black/10 flex items-center gap-2 hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Book a Car Wash</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddCarOpen(true)}
              className="py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* Real-Time Active Booking Status Card */}
      {activeBooking && (
        <div className="bg-white rounded-2xl border-2 border-blue-500/30 p-5 shadow-md space-y-4 animate-in fade-in-50 duration-300">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {activeBooking.bookingCode}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {activeBooking.washType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeBooking.cars.map((c) => c.name).join(" • ")} ({activeBooking.cars.length} vehicles)
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Total Price</span>
              <p className="text-lg font-black text-slate-900">
                ₹{activeBooking.totalAmount}
              </p>
            </div>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
            <div
              className={`p-2 rounded-xl border ${
                activeBooking.status !== "PENDING"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <span>Assigned</span>
            </div>

            <div
              className={`p-2 rounded-xl border ${
                activeBooking.beforePhotos.length > 0 ||
                activeBooking.status === "WASH_IN_PROGRESS" ||
                activeBooking.status === "PAYMENT_PENDING" ||
                activeBooking.status === "PAID"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <span>Inspection</span>
            </div>

            <div
              className={`p-2 rounded-xl border ${
                activeBooking.status === "WASH_IN_PROGRESS" ||
                activeBooking.status === "PAYMENT_PENDING" ||
                activeBooking.status === "PAID"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <Sparkles className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <span>Washing</span>
            </div>

            <div
              className={`p-2 rounded-xl border ${
                activeBooking.status === "PAYMENT_PENDING" ||
                activeBooking.status === "PAID"
                  ? "bg-amber-50 border-amber-500 text-amber-700"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <Smartphone className="w-4 h-4 mx-auto mb-1 text-amber-600" />
              <span>UPI Pay</span>
            </div>
          </div>

          {/* Action trigger if payment is pending */}
          {activeBooking.status === "PAYMENT_PENDING" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-900">
                  🎉 Job Completed by Washer!
                </p>
                <p className="text-[11px] text-amber-700">
                  After-photos sent to your WhatsApp. Please pay ₹{activeBooking.totalAmount} via UPI.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePaymentBooking(activeBooking)}
                className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Pay ₹{activeBooking.totalAmount}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action trigger if paid awaiting review */}
          {activeBooking.status === "PAID" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-green-900">
                  Payment Received!
                </p>
                <p className="text-[11px] text-green-700">
                  Rate your washer {activeBooking.washer?.name || "Rajesh"} to complete the wash.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewBookingTarget(activeBooking);
                  setCurrentView("review");
                }}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Write Review</span>
                <Star className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Photo viewer toggle */}
          {(activeBooking.beforePhotos.length > 0 ||
            activeBooking.afterPhotos.length > 0) && (
            <button
              type="button"
              onClick={() => setViewingPhotosBooking(activeBooking)}
              className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>
                View Inspection Photos ({activeBooking.beforePhotos.length} Before /{" "}
                {activeBooking.afterPhotos.length} After)
              </span>
            </button>
          )}
        </div>
      )}

      {/* Customer Garage Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CarIcon className="w-4 h-4 text-blue-600" />
              <span>My Garage ({user.garage.length} Cars)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Select any of these when booking a doorstep wash
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddCarOpen(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-xl flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Car</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {user.garage.map((car) => (
            <div
              key={car.id}
              className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm hover:shadow-md transition-shadow relative"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {car.name}
                  </h4>
                  <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {car.type}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  🚗
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-600">
                  {car.carNumber}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {car.color || "Color"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Addresses Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>Saved Wash Locations</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {user.addresses.map((addr) => (
            <div
              key={addr.id}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-xs space-y-1 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{addr.label}</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                  {addr.city}
                </span>
              </div>
              <p className="text-slate-600">{addr.street}</p>
              <p className="text-blue-700 font-bold bg-blue-50 inline-block px-1.5 py-0.5 rounded text-[11px]">
                Spot: {addr.parkingSpot}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        cars={user.garage}
        addresses={user.addresses}
        onOpenAddCar={() => setIsAddCarOpen(true)}
        onConfirmBooking={onCreateBooking}
      />

      <AddCarModal
        isOpen={isAddCarOpen}
        onClose={() => setIsAddCarOpen(false)}
        onAddCar={onAddCar}
      />

      {activePaymentBooking && (
        <PaymentModal
          isOpen={!!activePaymentBooking}
          onClose={() => setActivePaymentBooking(null)}
          booking={activePaymentBooking}
          onPaymentSuccess={handlePaymentCompleted}
        />
      )}

      {/* Before / After Photo Gallery Dialog */}
      {viewingPhotosBooking && (
        <UiDialog
          isOpen={!!viewingPhotosBooking}
          onClose={() => setViewingPhotosBooking(null)}
          maxWidth="max-w-2xl"
          title={`Verified Inspection Photos • ${viewingPhotosBooking.bookingCode}`}
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                🛡️ Before Photos (Insurance Damage Verification)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {viewingPhotosBooking.beforePhotos.map((p) => (
                  <div
                    key={p.id}
                    className="aspect-video bg-black rounded-xl overflow-hidden relative group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt={p.angle}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 text-white p-2 flex flex-col justify-end text-[10px]">
                      <span className="font-bold">{p.angle}</span>
                      <span className="text-[9px] text-white/80">{p.carName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {viewingPhotosBooking.afterPhotos.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">
                  ✨ Clean After Photos
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {viewingPhotosBooking.afterPhotos.map((p) => (
                    <div
                      key={p.id}
                      className="aspect-video bg-black rounded-xl overflow-hidden relative"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.imageUrl}
                        alt={p.angle}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 text-white p-2 flex flex-col justify-end text-[10px]">
                        <span className="font-bold">{p.angle}</span>
                        <span className="text-[9px] text-white/80">{p.carName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </UiDialog>
      )}
    </div>
  );
}
