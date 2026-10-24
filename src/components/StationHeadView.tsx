"use client";

import React, { useState } from "react";
import { Booking, StationWorker } from "@/lib/types";
import { UiDialog } from "./UiDialog";
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Car,
  UserCheck,
  Send,
  CreditCard,
  Banknote,
  TrendingUp,
} from "lucide-react";

interface StationHeadViewProps {
  bookings: Booking[];
  stationCrew: StationWorker[];
  onAssignWorker: (bookingId: string, worker: StationWorker) => void;
  onSettleOnline: (bookingId: string, ref?: string) => void;
}

export function StationHeadView({
  bookings,
  stationCrew,
  onAssignWorker,
  onSettleOnline,
}: StationHeadViewProps) {
  const [selectedBookingForAssign, setSelectedBookingForAssign] =
    useState<Booking | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    stationCrew[0]?.id || ""
  );

  const [settlementBooking, setSettlementBooking] = useState<Booking | null>(
    null
  );
  const [transferRef, setTransferRef] = useState("");
  const [isSettling, setIsSettling] = useState(false);

  // Filter bookings for this station
  const stationBookings = bookings;
  const unassignedBookings = stationBookings.filter(
    (b) => b.status === "ASSIGNED_TO_STATION" || !b.assignedWorker
  );
  const inProgressBookings = stationBookings.filter(
    (b) =>
      b.assignedWorker &&
      b.status !== "PAID" &&
      b.status !== "REVIEWED" &&
      b.status !== "ASSIGNED_TO_STATION"
  );
  const completedBookings = stationBookings.filter(
    (b) => b.status === "PAID" || b.status === "REVIEWED"
  );

  // Financial accounting: Total cash collected, station share, and platform share to send online
  const totalCashCollected = completedBookings.reduce((sum, b) => {
    return sum + (b.payment?.amount || b.totalAmount || 0);
  }, 0);

  const stationEarnings = Math.round(totalCashCollected * 0.8); // 80% kept by station
  const platformDue = totalCashCollected - stationEarnings; // 20% online payment to app owner

  const handleConfirmAssignment = () => {
    if (!selectedBookingForAssign) return;
    const worker = stationCrew.find((w) => w.id === selectedWorkerId);
    if (worker) {
      onAssignWorker(selectedBookingForAssign.id, worker);
    }
    setSelectedBookingForAssign(null);
  };

  const handleConfirmOnlineSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementBooking) return;
    setIsSettling(true);
    setTimeout(() => {
      setIsSettling(false);
      onSettleOnline(
        settlementBooking.id,
        transferRef || "UPI-SETTLE-" + Date.now().toString().slice(-6)
      );
      setSettlementBooking(null);
      setTransferRef("");
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Station Head Hub Banner */}
      <div className="bg-gradient-to-br from-[#171A19] via-[#232725] to-[#04412E] text-white rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#07865B]/30 border border-[#07865B]/40 flex items-center justify-center text-[#E8F7EF]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black">
                  SpeedShine Central Hub (South)
                </h2>
                <span className="text-[10px] font-bold bg-[#E8F7EF] text-[#07865B] border border-[#07865B]/25 px-2.5 py-0.5 rounded-full">
                  Area Partner Head
                </span>
              </div>
              <p className="text-xs text-[#E7EBE8] mt-0.5">
                Station Manager: <strong>Vikram Singh</strong> • Managing {stationCrew.length} Technicians
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-2xl border border-white/10 text-xs">
            <Users className="w-4 h-4 text-[#E8F7EF]" />
            <div>
              <span className="text-white/70 block text-[10px]">Staff Under Station:</span>
              <span className="font-bold text-white">
                {stationCrew.map((c) => c.name.split(" ")[0]).join(", ")}
              </span>
            </div>
          </div>
        </div>

        {/* Financial & Settlement Ledger Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <span className="text-white/70 text-[11px] flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-[#E8F7EF]" />
              Total Cash Collected by Crew
            </span>
            <div className="text-xl font-black text-white mt-1">
              ₹{totalCashCollected}
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <span className="text-white/70 text-[11px] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Station & Crew Cut (Kept)
            </span>
            <div className="text-xl font-black text-emerald-300 mt-1">
              ₹{stationEarnings}
              <span className="text-[10px] font-normal text-white/60 ml-1.5">
                (80%)
              </span>
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-white/70 text-[11px] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                Online Platform Fee (To App Owner)
              </span>
              <div className="text-xl font-black text-amber-300 mt-1">
                ₹{platformDue}
                <span className="text-[10px] font-normal text-white/60 ml-1.5">
                  (20%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Unassigned Incoming Jobs Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-[#171A19] uppercase tracking-wider flex items-center gap-2">
            <span>Incoming Area Jobs to Assign ({unassignedBookings.length})</span>
          </h3>
          <span className="text-xs text-[#07865B] font-semibold">
            All customer bookings route to you first
          </span>
        </div>

        {unassignedBookings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#E7EBE8] text-xs text-[#707875] shadow-2xs">
            <CheckCircle2 className="w-8 h-8 text-[#07865B] mx-auto mb-2" />
            <p className="font-extrabold text-[#171A19] text-sm">
              No Pending Unassigned Bookings
            </p>
            <p className="text-[11px] text-[#707875] mt-0.5">
              New customer appointments in your area will appear here for technician dispatch.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {unassignedBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-[#07865B]/30 p-4 sm:p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-[#E8F7EF] text-[#07865B] border border-[#07865B]/20">
                      {b.bookingCode}
                    </span>
                    <span className="font-extrabold text-sm text-[#171A19]">
                      {b.customerName}
                    </span>
                    <span className="text-xs text-[#707875] font-mono">
                      {b.customerPhone}
                    </span>
                  </div>

                  <p className="text-xs text-[#707875] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>
                      {b.address.street} •{" "}
                      <strong className="text-[#066747]">
                        Spot: {b.address.parkingSpot}
                      </strong>
                    </span>
                  </p>

                  <p className="text-xs text-[#707875] flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-[#07865B]" />
                    <span>
                      {b.cars.map((c) => `${c.name} (${c.type})`).join(", ")}
                    </span>
                  </p>

                  <div className="flex items-center gap-3 text-xs text-[#707875] pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#707875]" />
                      {b.date} • {b.timeSlot}
                    </span>
                    <span>•</span>
                    <span className="font-black text-[#171A19]">
                      Total: ₹{b.totalAmount}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBookingForAssign(b);
                    setSelectedWorkerId(stationCrew[0]?.id || "");
                  }}
                  className="py-2.5 px-5 bg-[#07865B] hover:bg-[#066747] text-white font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-[#07865B]/20 self-end sm:self-auto"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Assign to Crew Technician</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Dispatched Jobs Under Your Crew */}
      {inProgressBookings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-[#171A19] uppercase tracking-wider">
            In-Progress by Crew ({inProgressBookings.length})
          </h3>
          <div className="space-y-2.5">
            {inProgressBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-[#E7EBE8] p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-[#171A19]">
                    <span className="font-mono text-[#07865B]">
                      {b.bookingCode}
                    </span>
                    <span>{b.customerName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#E8F7EF] text-[#07865B] font-semibold text-[11px] border border-[#07865B]/20">
                      Assigned to: {b.assignedWorker?.name}
                    </span>
                  </div>
                  <p className="text-[#707875] text-[11px] mt-1">
                    {b.address.street} • Spot: {b.address.parkingSpot}
                  </p>
                  <p className="text-[#171A19] font-medium text-[11px] mt-0.5">
                    {b.cars.length} vehicles • Total: ₹{b.totalAmount}
                  </p>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-amber-100 text-amber-900 border border-amber-300">
                    {b.status === "WASH_IN_PROGRESS"
                      ? "Washing on-site"
                      : b.status === "PAYMENT_PENDING"
                      ? "Collecting Cash / UPI"
                      : "Assigned"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Completed Jobs & Online Platform Settlement */}
      {completedBookings.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-[#E7EBE8]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#171A19] uppercase tracking-wider">
              Completed Washes & Cash Settlements
            </h3>
            <span className="text-xs text-[#707875]">
              Deduct station money, send online fee
            </span>
          </div>

          <div className="space-y-2.5">
            {completedBookings.map((b) => {
              const platformShare =
                b.settlement?.platformShare || Math.round(b.totalAmount * 0.2);
              const stationShare =
                b.settlement?.stationShare || b.totalAmount - platformShare;
              const isSettled = b.settlement?.isSettledOnline;

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-[#E7EBE8] p-4 text-xs shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#171A19]">
                        {b.bookingCode}
                      </span>
                      <span className="font-bold text-[#171A19]">
                        {b.customerName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F7EF] text-[#07865B] border border-[#07865B]/20">
                        {b.payment?.method === "CASH"
                          ? "💵 Cash Collected"
                          : "⚡ UPI Paid"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[#707875] text-[11px] mt-1.5">
                      <span>Total: ₹{b.totalAmount}</span>
                      <span>•</span>
                      <span className="text-[#066747] font-bold">
                        Station/Worker Made: ₹{stationShare}
                      </span>
                      <span>•</span>
                      <span className="text-amber-800 font-bold">
                        App Owner Fee: ₹{platformShare}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isSettled ? (
                      <span className="px-3 py-1.5 rounded-xl bg-[#E8F7EF] border border-[#07865B]/25 text-[#066747] font-bold text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#07865B]" />
                        <span>Platform Fee Settled</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSettlementBooking(b)}
                        className="py-2 px-3.5 bg-[#171A19] hover:bg-[#232725] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        <span>Send ₹{platformShare} Online</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Assign Job to Crew Member */}
      {selectedBookingForAssign && (
        <UiDialog
          isOpen={!!selectedBookingForAssign}
          onClose={() => setSelectedBookingForAssign(null)}
          title={`Assign Booking ${selectedBookingForAssign.bookingCode}`}
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-[#F7F8F7] rounded-2xl text-xs space-y-1 border border-[#E7EBE8]">
              <p className="font-bold text-[#171A19]">
                Customer: {selectedBookingForAssign.customerName}
              </p>
              <p className="text-[#707875]">
                Location: {selectedBookingForAssign.address.street}
              </p>
              <p className="text-[#066747] font-bold">
                Parking Spot: {selectedBookingForAssign.address.parkingSpot}
              </p>
              <p className="text-[#707875] font-medium">
                Vehicles:{" "}
                {selectedBookingForAssign.cars.map((c) => c.name).join(", ")}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#171A19] mb-2">
                Select Technician Under Your Station
              </label>
              <div className="space-y-2">
                {stationCrew.map((worker) => {
                  const isSelected = selectedWorkerId === worker.id;
                  return (
                    <div
                      key={worker.id}
                      onClick={() => setSelectedWorkerId(worker.id)}
                      className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                        isSelected
                          ? "border-[#07865B] bg-[#E8F7EF]/50 ring-1 ring-[#07865B]"
                          : "border-[#E7EBE8] bg-white hover:bg-[#F7F8F7]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#07865B] text-white flex items-center justify-center font-bold text-xs">
                          {worker.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#171A19]">
                            {worker.name}
                          </p>
                          <p className="text-[#707875] font-mono text-[11px]">
                            {worker.phone} • {worker.completedJobs} Washes
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-[#07865B]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmAssignment}
              className="w-full py-3 bg-[#07865B] hover:bg-[#066747] text-white font-extrabold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#07865B]/20"
            >
              <UserCheck className="w-4 h-4" />
              <span>Confirm & Dispatch to Technician</span>
            </button>
          </div>
        </UiDialog>
      )}

      {/* Modal: Settle Online Payment to Platform */}
      {settlementBooking && (
        <UiDialog
          isOpen={!!settlementBooking}
          onClose={() => setSettlementBooking(null)}
          title={`Settle Platform Commission • ${settlementBooking.bookingCode}`}
        >
          <form
            onSubmit={handleConfirmOnlineSettlement}
            className="space-y-4 text-xs"
          >
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5 text-amber-900">
              <p className="font-bold">
                Cash Deduction & Online Platform Settlement
              </p>
              <p className="text-[11px] text-amber-800">
                Total cash collected from customer:{" "}
                <strong>₹{settlementBooking.totalAmount}</strong>
              </p>
              <p className="text-[11px] text-amber-800">
                Station & Washer retained earnings (80%):{" "}
                <strong>
                  ₹{Math.round(settlementBooking.totalAmount * 0.8)}
                </strong>
              </p>
              <div className="pt-1 border-t border-amber-200 font-extrabold text-sm text-amber-950 flex justify-between">
                <span>Online Payment to Send App Platform:</span>
                <span>
                  ₹
                  {settlementBooking.totalAmount -
                    Math.round(settlementBooking.totalAmount * 0.8)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#171A19] mb-1">
                Online Payment Method
              </label>
              <div className="p-2.5 bg-[#F7F8F7] rounded-xl text-[#171A19] font-medium border border-[#E7EBE8]">
                UPI / NEFT Transfer to:{" "}
                <strong className="font-mono text-[#07865B]">
                  appwasher.admin@hdfcbank
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#171A19] mb-1">
                Enter Online Transaction Reference (UTR / UPI Ref)
              </label>
              <input
                type="text"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder="e.g. UPI4892109841"
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#E7EBE8] font-mono focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSettling}
              className="w-full py-3 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-[#07865B]/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSettling
                  ? "Recording Settlement..."
                  : "Confirm Online Payment Sent"}
              </span>
            </button>
          </form>
        </UiDialog>
      )}
    </div>
  );
}
