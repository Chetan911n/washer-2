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
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold">Rajesh Kumar</h2>
                <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 font-bold px-2 py-0.5 rounded-full">
                  On Duty Staff
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Station: <strong>SpeedShine Central Hub</strong> (Head: Vikram Singh)</span>
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  4.92 Rating
                </span>
                <span>•</span>
                <span>348 Washes Done</span>
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10">
            <p className="text-xs text-slate-300">Today&apos;s Estimated Earnings</p>
            <p className="text-xl font-black text-green-400">
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
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>Jobs Assigned by Station Head ({activeBookings.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            Doorstep Site Work
          </span>
        </div>

        {activeBookings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800">No Pending Jobs</h4>
            <p className="text-xs text-slate-500 mt-1">
              Your station manager (Vikram Singh) will dispatch new wash jobs to you here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeBookings.map((booking) => {
              const hasBeforePhotos = booking.beforePhotos.length > 0;
              const hasAfterPhotos = booking.afterPhotos.length > 0;

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {booking.bookingCode}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">
                          {booking.customerName}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {booking.date} • {booking.timeSlot}
                        </span>
                      </div>
                    </div>

                    <a
                      href={`tel:${booking.customerPhone}`}
                      className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-semibold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Call Customer</span>
                    </a>
                  </div>

                  {/* Address & Parking Spot */}
                  <div className="py-3 text-xs text-slate-600 space-y-1">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-800">
                          {booking.address.street}, {booking.address.city}
                        </p>
                        <p className="text-blue-700 font-bold bg-blue-50 inline-block px-2 py-0.5 rounded mt-0.5 border border-blue-200">
                          Parking Spot: {booking.address.parkingSpot}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicles to Wash (Multi-car support) */}
                  <div className="bg-slate-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Car className="w-3 h-3 text-blue-600" />
                        Vehicles to Wash ({booking.cars.length})
                      </p>
                      <span className="text-xs font-black text-slate-900">
                        Collect Total: ₹{booking.totalAmount}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {booking.cars.map((car, idx) => (
                        <div
                          key={car.id}
                          className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800">
                              #{idx + 1} {car.name}
                            </span>
                            <p className="font-mono text-[11px] text-slate-500">
                              {car.carNumber} ({car.type})
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {car.color || "Exterior"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
                    <div className="text-xs">
                      {booking.status === "PAYMENT_PENDING" ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> Ready for Payment Collection
                        </span>
                      ) : hasBeforePhotos ? (
                        <span className="text-blue-600 font-semibold flex items-center gap-1">
                          <Camera className="w-4 h-4" /> Ready for After-Photos
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> Take Before-Photos (Insurance)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {booking.status === "PAYMENT_PENDING" && onCollectPayment && (
                        <button
                          type="button"
                          onClick={() => onCollectPayment(booking.id, "CASH")}
                          className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Collect ₹{booking.totalAmount} Cash</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedBookingForInspection(booking)}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
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
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Completed Today ({completedBookings.length})
          </h3>
          <div className="space-y-2">
            {completedBookings.map((b) => (
              <div
                key={b.id}
                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {b.customerName}
                    </span>
                    <span className="font-mono text-slate-500">
                      ({b.bookingCode})
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {b.payment?.method === "CASH" ? "Cash Received" : "UPI Received"}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {b.cars.map((c) => c.name).join(", ")} • Total ₹{b.totalAmount}
                  </p>
                </div>
                {b.review ? (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{b.review.rating}/5</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      &quot;{b.review.comment}&quot;
                    </p>
                  </div>
                ) : (
                  <span className="text-green-600 font-bold flex items-center gap-1">
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
