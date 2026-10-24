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
  Trash2,
  Home,
  CalendarCheck,
  Layers,
} from "lucide-react";

interface CustomerViewProps {
  user: User;
  bookings: Booking[];
  onAddCar: (car: Omit<Car, "id">) => void;
  onRemoveCar?: (carId: string) => void;
  onRemoveAllCars?: () => void;
  onAddAddress?: (address: Omit<Address, "id">) => Address;
  onRemoveAddress?: (addressId: string) => void;
  onRemoveAllAddresses?: () => void;
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
  onRemoveCar,
  onRemoveAllCars,
  onAddAddress,
  onRemoveAddress,
  onRemoveAllAddresses,
  onCreateBooking,
  onPaymentSuccess,
  onSubmitReview,
}: CustomerViewProps) {
  const [currentView, setCurrentView] = useState<"home" | "review">("home");
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isAddCarOpen, setIsAddCarOpen] = useState(false);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrSpot, setAddrSpot] = useState("");
  const [addrCity, setAddrCity] = useState("Bangalore");
  const [activePaymentBooking, setActivePaymentBooking] =
    useState<Booking | null>(null);
  const [reviewBookingTarget, setReviewBookingTarget] =
    useState<Booking | null>(null);
  const [viewingPhotosBooking, setViewingPhotosBooking] =
    useState<Booking | null>(null);

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet.trim() || !addrSpot.trim()) return;
    if (onAddAddress) {
      onAddAddress({
        label: addrLabel,
        street: addrStreet.trim(),
        parkingSpot: addrSpot.trim(),
        city: addrCity.trim(),
      });
    }
    setIsAddAddressOpen(false);
    setAddrStreet("");
    setAddrSpot("");
  };

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
    <div className="space-y-6 pb-16 sm:pb-0">
      {/* User Greeting & Quick Location Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-[#171A19] tracking-tight">
            Hello, {user.name ? user.name.split(" ")[0] : "Chetan"} 👋
          </h2>
          <p className="text-xs text-[#707875] mt-0.5">
            Doorstep car wash with zero-scratch guarantee & photo proof
          </p>
        </div>

        {user.addresses && user.addresses.length > 0 && (
          <div className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7EBE8] text-xs text-[#171A19] shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-[#07865B]" />
            <span className="font-semibold">{user.addresses[0].street.split(",")[0]}</span>
            <span className="text-[10px] text-[#707875] font-mono">• {user.addresses[0].city}</span>
          </div>
        )}
      </div>

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

      {/* Hero Action Banner: "Doorstep Car Wash at Your Parking Spot" */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#07865B] via-[#066747] to-[#04412E] text-white p-6 sm:p-8 shadow-card">
        <div className="relative z-10 max-w-lg space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-[#E8F7EF]">
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>Zero Damage Guarantee • Insurance Photos Included</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Doorstep Car Wash at Your Parking Spot
          </h1>

          <p className="text-xs sm:text-sm text-[#E8F7EF] leading-relaxed">
            Wash 1, 2, or multiple cars together. Verified washers capture mandatory before/after photos and accept UPI on completion.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsBookingOpen(true)}
              className="py-3 px-6 bg-white text-[#07865B] hover:bg-[#F2FAF6] font-black rounded-2xl text-sm transition-all shadow-md shadow-black/15 flex items-center gap-2 hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4 text-[#07865B]" />
              <span>Book a Car Wash</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddCarOpen(true)}
              className="py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/25 rounded-2xl text-xs font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* Real-Time Active Booking Status Card */}
      {activeBooking && (
        <div className="bg-white rounded-3xl border border-[#07865B]/30 p-5 shadow-card space-y-4 animate-in fade-in-50 duration-300">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E7EBE8]">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-[#E8F7EF] text-[#07865B] border border-[#07865B]/20">
                  {activeBooking.bookingCode}
                </span>
                <span className="text-xs font-bold text-[#171A19]">
                  {activeBooking.washType}
                </span>
              </div>
              <p className="text-xs text-[#707875] mt-1">
                {activeBooking.cars.map((c) => c.name).join(" • ")} ({activeBooking.cars.length} vehicles)
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#707875]">Total Price</span>
              <p className="text-lg font-black text-[#171A19]">
                ₹{activeBooking.totalAmount}
              </p>
            </div>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
            <div
              className={`p-2 rounded-2xl border transition-all ${
                activeBooking.status !== "PENDING"
                  ? "bg-[#E8F7EF] border-[#07865B]/30 text-[#066747]"
                  : "bg-[#F7F8F7] border-[#E7EBE8] text-[#707875]"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-[#07865B]" />
              <span>Assigned</span>
            </div>

            <div
              className={`p-2 rounded-2xl border transition-all ${
                activeBooking.beforePhotos.length > 0 ||
                activeBooking.status === "WASH_IN_PROGRESS" ||
                activeBooking.status === "PAYMENT_PENDING" ||
                activeBooking.status === "PAID"
                  ? "bg-[#E8F7EF] border-[#07865B]/30 text-[#066747]"
                  : "bg-[#F7F8F7] border-[#E7EBE8] text-[#707875]"
              }`}
            >
              <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-[#07865B]" />
              <span>Inspection</span>
            </div>

            <div
              className={`p-2 rounded-2xl border transition-all ${
                activeBooking.status === "WASH_IN_PROGRESS" ||
                activeBooking.status === "PAYMENT_PENDING" ||
                activeBooking.status === "PAID"
                  ? "bg-[#E8F7EF] border-[#07865B]/30 text-[#066747]"
                  : "bg-[#F7F8F7] border-[#E7EBE8] text-[#707875]"
              }`}
            >
              <Sparkles className="w-4 h-4 mx-auto mb-1 text-[#07865B]" />
              <span>Washing</span>
            </div>

            <div
              className={`p-2 rounded-2xl border transition-all ${
                activeBooking.status === "PAYMENT_PENDING" ||
                activeBooking.status === "PAID"
                  ? "bg-amber-50 border-amber-500/30 text-amber-800"
                  : "bg-[#F7F8F7] border-[#E7EBE8] text-[#707875]"
              }`}
            >
              <Smartphone className="w-4 h-4 mx-auto mb-1 text-amber-600" />
              <span>UPI Pay</span>
            </div>
          </div>

          {/* Action trigger if payment is pending */}
          {activeBooking.status === "PAYMENT_PENDING" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
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
                className="py-2 px-4 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-[#07865B]/20"
              >
                <span>Pay ₹{activeBooking.totalAmount}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Action trigger if paid awaiting review */}
          {activeBooking.status === "PAID" && (
            <div className="p-3 bg-[#E8F7EF] border border-[#07865B]/25 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#066747]">
                  Payment Received!
                </p>
                <p className="text-[11px] text-[#066747]">
                  Rate your washer {activeBooking.washer?.name || "Rajesh"} to complete the wash.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewBookingTarget(activeBooking);
                  setCurrentView("review");
                }}
                className="py-2 px-4 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-[#07865B]/20"
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
              className="w-full py-2.5 border border-[#E7EBE8] hover:bg-[#F7F8F7] text-[#171A19] rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[#07865B]" />
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
            <h3 className="text-sm font-extrabold text-[#171A19] uppercase tracking-wider flex items-center gap-2">
              <CarIcon className="w-4 h-4 text-[#07865B]" />
              <span>My Garage ({user.garage?.length || 0} Cars)</span>
            </h3>
            <p className="text-[11px] text-[#707875]">
              {user.garage && user.garage.length > 0
                ? "Select any of these when booking a doorstep wash"
                : "No vehicles saved yet. Add your car to book a doorstep wash!"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user.garage && user.garage.length > 0 && onRemoveAllCars && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to remove all cars from your garage?")) {
                    onRemoveAllCars();
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remove All</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAddCarOpen(true)}
              className="text-xs font-bold text-[#07865B] hover:text-[#066747] bg-[#E8F7EF] hover:bg-[#C7EED8] px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors border border-[#07865B]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Car</span>
            </button>
          </div>
        </div>

        {(!user.garage || user.garage.length === 0) ? (
          <div className="p-8 border-2 border-dashed border-[#E7EBE8] rounded-3xl text-center bg-white space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F8F7] text-[#707875] mx-auto flex items-center justify-center text-xl">
              🚗
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#171A19]">Your Garage is Empty</h4>
              <p className="text-xs text-[#707875] mt-0.5 max-w-sm mx-auto">
                Add your vehicle details to start booking doorstep car washes right at your parking spot.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddCarOpen(true)}
              className="px-4 py-2 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm shadow-[#07865B]/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your Car</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {user.garage.map((car) => (
              <div
                key={car.id}
                className="bg-white rounded-2xl border border-[#E7EBE8] p-4 shadow-2xs hover:shadow-card transition-shadow relative group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#171A19]">
                      {car.name}
                    </h4>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F7F8F7] text-[#171A19] border border-[#E7EBE8]">
                      {car.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {onRemoveCar && (
                      <button
                        type="button"
                        onClick={() => onRemoveCar(car.id)}
                        title="Remove Car"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="w-7 h-7 rounded-xl bg-[#E8F7EF] text-[#07865B] flex items-center justify-center font-bold text-xs">
                      🚗
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E7EBE8] flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-[#171A19]">
                    {car.carNumber}
                  </span>
                  <span className="text-[#707875] text-[11px]">
                    {car.color || "Color"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Addresses Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-[#171A19] uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#07865B]" />
              <span>Saved Wash Locations ({user.addresses?.length || 0})</span>
            </h3>
            <p className="text-[11px] text-[#707875]">
              {user.addresses && user.addresses.length > 0
                ? "Manage your doorstep service locations & parking bay details"
                : "No locations saved yet. Add your address & parking spot below."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user.addresses && user.addresses.length > 0 && onRemoveAllAddresses && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to remove all saved locations?")) {
                    onRemoveAllAddresses();
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remove All</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAddAddressOpen(!isAddAddressOpen)}
              className="text-xs font-bold text-[#07865B] hover:text-[#066747] bg-[#E8F7EF] hover:bg-[#C7EED8] px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors border border-[#07865B]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddAddressOpen ? "Cancel" : "Add Location"}</span>
            </button>
          </div>
        </div>

        {/* Inline Add Address Form */}
        {isAddAddressOpen && (
          <form onSubmit={handleSaveAddress} className="p-4 bg-white border border-[#07865B]/30 rounded-2xl space-y-3 shadow-card">
            <h4 className="text-xs font-bold text-[#171A19]">Add New Doorstep Location</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#707875] mb-1">Location Label</label>
                <input
                  type="text"
                  required
                  value={addrLabel}
                  onChange={(e) => setAddrLabel(e.target.value)}
                  placeholder="e.g. Home, Office"
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#E7EBE8] focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#707875] mb-1">City</label>
                <input
                  type="text"
                  required
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  placeholder="Bangalore"
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#E7EBE8] focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#707875] mb-1">Street / Apartment Address</label>
              <input
                type="text"
                required
                value={addrStreet}
                onChange={(e) => setAddrStreet(e.target.value)}
                placeholder="e.g. Prestige Ferns Residency, Tower 4, Flat 802"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#E7EBE8] focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#066747] mb-1">Exact Parking Spot / Bay Number</label>
              <input
                type="text"
                required
                value={addrSpot}
                onChange={(e) => setAddrSpot(e.target.value)}
                placeholder="e.g. Basement 2, Pillar #45 (Covered Bay)"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#07865B]/40 bg-[#E8F7EF]/40 font-medium text-[#066747] focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm shadow-[#07865B]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Location</span>
            </button>
          </form>
        )}

        {(!user.addresses || user.addresses.length === 0) && !isAddAddressOpen ? (
          <div className="p-8 border-2 border-dashed border-[#E7EBE8] rounded-3xl text-center bg-white space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F8F7] text-[#707875] mx-auto flex items-center justify-center text-xl">
              📍
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#171A19]">No Saved Locations</h4>
              <p className="text-xs text-[#707875] mt-0.5 max-w-sm mx-auto">
                Add your building address and exact parking bay to receive doorstep washes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddAddressOpen(true)}
              className="px-4 py-2 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm shadow-[#07865B]/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Location</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.addresses?.map((addr) => (
              <div
                key={addr.id}
                className="p-4 bg-white border border-[#E7EBE8] rounded-2xl text-xs space-y-2 shadow-2xs hover:shadow-card transition-shadow relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#171A19] text-sm">{addr.label}</span>
                    <span className="text-[10px] bg-[#F7F8F7] text-[#707875] font-semibold px-2 py-0.5 rounded-full border border-[#E7EBE8]">
                      {addr.city}
                    </span>
                  </div>
                  {onRemoveAddress && (
                    <button
                      type="button"
                      onClick={() => onRemoveAddress(addr.id)}
                      title="Remove Location"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[#707875] leading-snug">{addr.street}</p>
                <div className="pt-1">
                  <p className="text-[#066747] font-bold bg-[#E8F7EF] border border-[#07865B]/20 inline-block px-2.5 py-1 rounded-xl text-[11px]">
                    Parking Spot: {addr.parkingSpot}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile-Friendly Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E7EBE8] py-2 px-6 flex items-center justify-around text-[10px] font-bold text-[#707875] shadow-lg">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex flex-col items-center gap-1 text-[#07865B]"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => setIsBookingOpen(true)}
          className="flex flex-col items-center gap-1 hover:text-[#07865B]"
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Book</span>
        </button>
        <button
          type="button"
          onClick={() => setIsAddCarOpen(true)}
          className="flex flex-col items-center gap-1 hover:text-[#07865B]"
        >
          <CarIcon className="w-4 h-4" />
          <span>Garage</span>
        </button>
        <button
          type="button"
          onClick={() => setIsAddAddressOpen(true)}
          className="flex flex-col items-center gap-1 hover:text-[#07865B]"
        >
          <MapPin className="w-4 h-4" />
          <span>Location</span>
        </button>
      </div>

      {/* Modals */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        cars={user.garage}
        addresses={user.addresses}
        onOpenAddCar={() => setIsAddCarOpen(true)}
        onAddAddress={onAddAddress}
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
              <h4 className="text-xs font-bold text-[#066747] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#07865B]" />
                Before Photos (Insurance Damage Verification)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {viewingPhotosBooking.beforePhotos.map((p) => (
                  <div
                    key={p.id}
                    className="aspect-video bg-black rounded-2xl overflow-hidden relative group"
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
              <div className="pt-2 border-t border-[#E7EBE8]">
                <h4 className="text-xs font-bold text-[#07865B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#07865B]" />
                  Clean After Photos
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {viewingPhotosBooking.afterPhotos.map((p) => (
                    <div
                      key={p.id}
                      className="aspect-video bg-black rounded-2xl overflow-hidden relative"
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
