"use client";

import React, { useState } from "react";
import { UiDialog } from "./UiDialog";
import { Car, Address, Booking } from "@/lib/types";
import { CAR_PRICING } from "@/lib/defaultData";
import {
  Calendar,
  Clock,
  Car as CarIcon,
  Plus,
  MapPin,
  Check,
  Sparkles,
} from "lucide-react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars: Car[];
  addresses: Address[];
  onOpenAddCar: () => void;
  onConfirmBooking: (data: {
    cars: Car[];
    address: Address;
    date: string;
    timeSlot: string;
    washType: Booking["washType"];
  }) => void;
}

const TIME_SLOTS = [
  "06:30 AM - 08:30 AM",
  "08:30 AM - 10:30 AM",
  "10:30 AM - 12:30 PM",
  "03:00 PM - 05:00 PM",
  "05:00 PM - 07:00 PM",
];

export function BookingModal({
  isOpen,
  onClose,
  cars,
  addresses,
  onOpenAddCar,
  onConfirmBooking,
}: BookingModalProps) {
  // Selected cars array (supports multiple cars: 1, 2, or many!)
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>(
    cars.length > 0 ? [cars[0].id] : []
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses[0]?.id || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[1]);
  const [washType, setWashType] =
    useState<Booking["washType"]>("Exterior Foam Wash");

  // Multi-car selection toggle
  const toggleCar = (id: string) => {
    if (selectedCarIds.includes(id)) {
      if (selectedCarIds.length > 1) {
        setSelectedCarIds(selectedCarIds.filter((c) => c !== id));
      }
    } else {
      setSelectedCarIds([...selectedCarIds, id]);
    }
  };

  const selectedCars = cars.filter((c) => selectedCarIds.includes(c.id));
  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) || addresses[0];

  const totalAmount = selectedCars.reduce(
    (acc, car) => acc + (CAR_PRICING[car.type] || 399),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCars.length === 0 || !selectedAddress) return;

    onConfirmBooking({
      cars: selectedCars,
      address: selectedAddress,
      date: selectedDate,
      timeSlot: selectedSlot,
      washType,
    });
    onClose();
  };

  return (
    <UiDialog isOpen={isOpen} onClose={onClose} title="Book Doorstep Car Wash">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Select Cars */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CarIcon className="w-3.5 h-3.5 text-blue-600" />
                Select Cars to Wash
              </label>
              <p className="text-[11px] text-slate-500">
                You can select 1, 2, or multiple cars for the same slot
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddCar}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg"
            >
              <Plus className="w-3 h-3" />
              <span>Add New Car</span>
            </button>
          </div>

          <div className="space-y-2">
            {cars.map((car) => {
              const isSelected = selectedCarIds.includes(car.id);
              const price = CAR_PRICING[car.type] || 399;
              return (
                <div
                  key={car.id}
                  onClick={() => toggleCar(car.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-600"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {car.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                          {car.type}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-500">
                        {car.carNumber} • {car.color || "Color"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-slate-900">
                      ₹{price}
                    </span>
                    <p className="text-[10px] text-green-600 font-semibold">
                      Foam Wash
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedCars.length > 1 && (
            <div className="mt-2 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Multi-car wash selected ({selectedCars.length} cars) — washer will clean all in one visit!
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Wash Type */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Select Wash Package
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              {
                name: "Exterior Foam Wash",
                desc: "Pressure foam, wheel clean, glass shine",
              },
              {
                name: "Deep Wash & Polish",
                desc: "Exterior foam + Tyre dressing + Wax coat",
              },
            ].map((pkg) => (
              <button
                key={pkg.name}
                type="button"
                onClick={() => setWashType(pkg.name as Booking["washType"])}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  washType === pkg.name
                    ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="font-bold text-slate-800">{pkg.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{pkg.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Slot & Date Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Booking Date
            </label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Time Slot
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 4: Address & Parking Spot */}
        <div>
          <label className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            Service Address & Parking Spot
          </label>
          <div className="space-y-1.5">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                onClick={() => setSelectedAddressId(addr.id)}
                className={`p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                  selectedAddressId === addr.id
                    ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>{addr.label}: {addr.street}</span>
                  {selectedAddressId === addr.id && (
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                  )}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Spot: <span className="font-semibold text-slate-700">{addr.parkingSpot}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total & Confirm CTA */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Total ({selectedCars.length} {selectedCars.length === 1 ? "car" : "cars"})
            </span>
            <div className="text-xl font-black text-slate-900">₹{totalAmount}</div>
          </div>

          <button
            type="submit"
            disabled={selectedCars.length === 0}
            className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-blue-500/20"
          >
            Confirm & Book Slot
          </button>
        </div>
      </form>
    </UiDialog>
  );
}
