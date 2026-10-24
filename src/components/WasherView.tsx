"use client";

import React, { useState } from "react";
import { Booking, InspectionPhoto } from "@/lib/types";
import { PhotoInspectionModal } from "./PhotoInspectionModal";
import {
  MapPin,
  Phone,
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  Camera,
  Star,
  ShieldCheck,
  Banknote,
  Building2,
} from "lucide-react";

interface WasherViewProps {
  bookings: Booking[];
  onSaveBeforePhotos: (bookingId: string, photos: InspectionPhoto[]) => void;
  onCompleteJob: (bookingId: string, afterPhotos: InspectionPhoto[]) => void;
  onCollectPayment?: (bookingId: string, method: "CASH" | "UPI") => void;
}

export function WasherView({
  bookings,
  onSaveBeforePhotos,
  onCompleteJob,
  onCollectPayment,
}: WasherViewProps) {
  const [selectedBookingForInspection, setSelectedBookingForInspection] =
    useState<Booking | null>(null);

  // Active vs Completed
  const activeBookings = bookings.filter(
    (b) => b.status !== "PAID" && b.status !== "REVIEWED"
  );
  const completedBookings = bookings.filter(
    (b) => b.status === "PAID" || b.status === "REVIEWED"
  );

  return (
    <div className="space-y-6">
      {/* Washer Partner Header with Station Hierarchy */}
      <div className="bg-gradient-to-br from-[#171A19] via-[#232725] to-[#04412E] text-white rounded-3xl p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#07865B]/30 border border-[#07865B]/40 flex items-center justify-center text-[#E8F7EF]">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black">Rajesh Kumar</h2>
                <span className="text-[10px] bg-[#E8F7EF] text-[#07865B] border border-[#07865B]/25 font-bold px-2 py-0.5 rounded-full">
                  On Duty Staff
                </span>
              </div>
              <p className="text-xs text-[#E7EBE8] mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#07865B]" />
                <span>Station: <strong>SpeedShine Central Hub</strong> (Head: Vikram Singh)</span>
              </p>
              <div className="flex items-center gap-3 text-xs text-white/70 mt-1">
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  4.92 Rating
                </span>
                <span>•</span>
                <span>348 Doorstep Washes Completed</span>
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10">
            <p className="text-xs text-white/70">Today&apos;s Estimated Earnings</p>
            <p className="text-xl font-black text-emerald-300">
              ₹
              {Math.round(
                completedBookings.reduce((sum, b) => sum + b.totalAmount, 0) * 0.8
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Assigned Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#171A19] uppercase tracking-wider flex items-center gap-2">
            <span>Jobs Dispatched by Station Head ({activeBookings.length})</span>
          </h3>
          <span className="text-xs text-[#07865B] font-semibold">
            Doorstep Site Work
          </span>
        </div>

        {activeBookings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#E7EBE8] shadow-2xs">
            <CheckCircle2 className="w-10 h-10 text-[#07865B] mx-auto mb-2" />
            <h4 className="font-extrabold text-sm text-[#171A19]">No Pending Jobs</h4>
            <p className="text-xs text-[#707875] mt-1">
              Your station manager (Vikram Singh) will dispatch new wash jobs to you here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeBookings.map((booking) => {
              const hasBeforePhotos = booking.beforePhotos.length > 0;
              const hasAfterPhotos = booking.afterPhotos.length > 0;

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-3xl border border-[#E7EBE8] p-4 sm:p-5 shadow-card hover:shadow-elevated transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E7EBE8]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-[#E8F7EF] text-[#07865B] border border-[#07865B]/20">
                          {booking.bookingCode}
                        </span>
                        <h4 className="font-extrabold text-base text-[#171A19]">
                          {booking.customerName}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#707875] mt-1">
                        <Clock className="w-3.5 h-3.5 text-[#07865B]" />
                        <span>
                          {booking.date} • {booking.timeSlot}
                        </span>
                      </div>
                    </div>

                    <a
                      href={`tel:${booking.customerPhone}`}
                      className="py-2 px-3 rounded-xl bg-[#E8F7EF] text-[#07865B] hover:bg-[#C7EED8] transition-colors flex items-center gap-1 text-xs font-bold border border-[#07865B]/20"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  </div>

                  {/* Address & Parking Spot */}
                  <div className="py-3 text-xs text-[#707875] space-y-1">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#171A19] text-xs">
                          {booking.address.street}, {booking.address.city}
                        </p>
                        <div className="mt-1">
                          <p className="text-[#066747] font-extrabold bg-[#E8F7EF] inline-block px-2.5 py-1 rounded-xl text-xs border border-[#07865B]/25">
                            Exact Parking Spot: {booking.address.parkingSpot}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicles to Wash (Multi-car support) */}
                  <div className="bg-[#F7F8F7] rounded-2xl p-3.5 mb-3 border border-[#E7EBE8]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] uppercase font-bold text-[#707875] flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-[#07865B]" />
                        Vehicles to Wash ({booking.cars.length})
                      </p>
                      <span className="text-xs font-black text-[#171A19]">
                        Collect Total: ₹{booking.totalAmount}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {booking.cars.map((car, idx) => (
                        <div
                          key={car.id}
                          className="bg-white p-2.5 rounded-xl border border-[#E7EBE8] text-xs flex items-center justify-between shadow-2xs"
                        >
                          <div>
                            <span className="font-bold text-[#171A19]">
                              #{idx + 1} {car.name}
                            </span>
                            <p className="font-mono text-[11px] text-[#707875]">
                              {car.carNumber} ({car.type})
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F7F8F7] text-[#171A19] border border-[#E7EBE8]">
                            {car.color || "Exterior"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar with Large Touch-Friendly Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E7EBE8] flex-wrap">
                    <div className="text-xs">
                      {booking.status === "PAYMENT_PENDING" ? (
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-amber-600" /> Ready for Payment Collection
                        </span>
                      ) : hasBeforePhotos ? (
                        <span className="text-[#07865B] font-bold flex items-center gap-1">
                          <Camera className="w-4 h-4" /> Ready for Clean After-Photos
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> Before-Photos Required (Insurance)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {booking.status === "PAYMENT_PENDING" && onCollectPayment && (
                        <button
                          type="button"
                          onClick={() => onCollectPayment(booking.id, "CASH")}
                          className="py-2.5 px-4 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-[#07865B]/20"
                        >
                          <Banknote className="w-4 h-4" />
                          <span>Collect ₹{booking.totalAmount} Cash</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedBookingForInspection(booking)}
                        className="py-2.5 px-4 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-[#07865B]/20"
                      >
                        <Camera className="w-4 h-4" />
                        <span>
                          {!hasBeforePhotos
                            ? "Take Before-Photos (Insurance)"
                            : !hasAfterPhotos
                            ? "Take Clean After-Photos"
                            : "Review / Retake Photos"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed History */}
      {completedBookings.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#E7EBE8]">
          <h3 className="text-sm font-extrabold text-[#171A19] uppercase tracking-wider">
            Completed Today ({completedBookings.length})
          </h3>
          <div className="space-y-2">
            {completedBookings.map((b) => (
              <div
                key={b.id}
                className="p-3.5 bg-white border border-[#E7EBE8] rounded-2xl flex items-center justify-between text-xs shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#171A19]">
                      {b.customerName}
                    </span>
                    <span className="font-mono text-[#707875]">
                      ({b.bookingCode})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F7EF] text-[#07865B] border border-[#07865B]/20">
                      {b.payment?.method === "CASH" ? "Cash Received" : "UPI Received"}
                    </span>
                  </div>
                  <p className="text-[#707875] text-[11px] mt-0.5">
                    {b.cars.map((c) => c.name).join(", ")} • Total ₹{b.totalAmount}
                  </p>
                </div>
                {b.review ? (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{b.review.rating}/5</span>
                    </div>
                    <p className="text-[10px] text-[#707875] italic">
                      &quot;{b.review.comment}&quot;
                    </p>
                  </div>
                ) : (
                  <span className="text-[#07865B] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Completed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {selectedBookingForInspection && (
        <PhotoInspectionModal
          isOpen={!!selectedBookingForInspection}
          onClose={() => setSelectedBookingForInspection(null)}
          booking={selectedBookingForInspection}
          onSaveBeforePhotos={onSaveBeforePhotos}
          onCompleteJob={onCompleteJob}
        />
      )}
    </div>
  );
}
