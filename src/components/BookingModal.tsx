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
  ShieldCheck,
  Building,
} from "lucide-react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars: Car[];
  addresses: Address[];
  onOpenAddCar: () => void;
  onAddAddress?: (address: Omit<Address, "id">) => Address;
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
  onAddAddress,
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

  // Inline "Add New Address / Location" state
  const [isAddingLocation, setIsAddingLocation] = useState(
    addresses.length === 0
  );
  const [newLabel, setNewLabel] = useState("Home");
  const [newStreet, setNewStreet] = useState("");
  const [newParkingSpot, setNewParkingSpot] = useState("");
  const [newCity, setNewCity] = useState("Bangalore");

  // Auto-sync address selection & open add form if no locations
  React.useEffect(() => {
    if (addresses.length === 0) {
      setIsAddingLocation(true);
    } else if (!selectedAddressId || !addresses.some((a) => a.id === selectedAddressId)) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

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

  const handleSaveNewLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet.trim() || !newParkingSpot.trim()) return;

    if (onAddAddress) {
      const created = onAddAddress({
        label: newLabel || "Home",
        street: newStreet.trim(),
        parkingSpot: newParkingSpot.trim(),
        city: newCity.trim() || "Bangalore",
      });
      setSelectedAddressId(created.id);
    }
    setIsAddingLocation(false);
    setNewStreet("");
    setNewParkingSpot("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCars.length === 0) return;

    let addressToUse = selectedAddress;
    if (!addressToUse && newStreet.trim() && newParkingSpot.trim() && onAddAddress) {
      addressToUse = onAddAddress({
        label: newLabel || "Home",
        street: newStreet.trim(),
        parkingSpot: newParkingSpot.trim(),
        city: newCity.trim() || "Bangalore",
      });
      setSelectedAddressId(addressToUse.id);
      setIsAddingLocation(false);
    }

    if (!addressToUse) return;

    onConfirmBooking({
      cars: selectedCars,
      address: addressToUse,
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
                Select 1, 2, or multiple cars for the same slot
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
            {cars.length === 0 ? (
              <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2.5 bg-slate-50/80">
                <CarIcon className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-700">No cars in your garage</p>
                  <p className="text-[11px] text-slate-500">Please add your vehicle to proceed with booking.</p>
                </div>
                <button
                  type="button"
                  onClick={onOpenAddCar}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your Car Now</span>
                </button>
              </div>
            ) : (
              cars.map((car) => {
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
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                          isSelected
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isSelected ? "Selected" : "Tap to Add"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
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

        {/* Step 4: Service Address & Parking Spot with Inline Add */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Service Address & Parking Spot
            </label>
            <button
              type="button"
              onClick={() => setIsAddingLocation(!isAddingLocation)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>{isAddingLocation ? "Cancel" : "Add Location"}</span>
            </button>
          </div>

          {/* Inline Add Location Form */}
          {isAddingLocation ? (
            <div className="p-3 bg-slate-50 border border-blue-200 rounded-xl space-y-2 mb-3">
              <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                Add New Location for this Appointment
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600">
                    Location Label
                  </label>
                  <select
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Apartment / Society">Apartment / Society</option>
                    <option value="Mall / Club">Mall / Club</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600">
                    City
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Bangalore"
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600">
                  Building / Street Address
                </label>
                <input
                  type="text"
                  required
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  placeholder="e.g. Prestige Greenwoods, Tower 2"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-blue-800">
                  Exact Parking Spot / Bay Details
                </label>
                <input
                  type="text"
                  required
                  value={newParkingSpot}
                  onChange={(e) => setNewParkingSpot(e.target.value)}
                  placeholder="e.g. Basement 2, Pillar #88 (Covered)"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-400 bg-white font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveNewLocation}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Select This Location</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {addresses.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50/70">
                  <p className="text-xs font-bold text-slate-700">No saved locations</p>
                  <p className="text-[11px] text-slate-500">Please enter your service address and parking spot below.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddingLocation(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Enter Address & Parking Spot</span>
                  </button>
                </div>
              ) : (
                addresses.map((addr) => (
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
                      <span>
                        {addr.label}: {addr.street}
                      </span>
                      {selectedAddressId === addr.id && (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="text-slate-600 text-[11px] mt-0.5 flex items-center justify-between">
                      <span>
                        Spot: <strong className="text-blue-800">{addr.parkingSpot}</strong>
                      </span>
                      <span className="text-slate-400 font-mono">{addr.city}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Step 5: Location Confirmation Card */}
        {selectedAddress && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center gap-1.5 text-green-700">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Confirmed Service Spot
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                Doorstep Visit
              </span>
            </div>
            <p className="text-slate-700 font-medium">
              {selectedAddress.street}, {selectedAddress.city}
            </p>
            <p className="text-blue-700 font-bold bg-white inline-block px-2 py-0.5 rounded border border-blue-200 text-[11px]">
              Parking Spot: {selectedAddress.parkingSpot}
            </p>
          </div>
        )}

        {/* Total & Confirm CTA (Total shown only at the end) */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 -mx-5 -mb-5 p-4 rounded-b-2xl">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              Combined Total ({selectedCars.length} {selectedCars.length === 1 ? "car" : "cars"})
            </span>
            <div className="text-2xl font-black text-slate-900 leading-none mt-1">
              ₹{totalAmount}
            </div>
            <span className="text-[10px] text-green-700 font-semibold">
              All taxes & doorstep visit included
            </span>
          </div>

          <button
            type="submit"
            disabled={
              selectedCars.length === 0 ||
              (!selectedAddress && (!newStreet.trim() || !newParkingSpot.trim()))
            }
            className={`py-3 px-6 rounded-xl text-sm font-extrabold transition-all ${
              selectedCars.length === 0 ||
              (!selectedAddress && (!newStreet.trim() || !newParkingSpot.trim()))
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
            }`}
          >
            {selectedCars.length === 0
              ? "Select a Car First"
              : !selectedAddress && (!newStreet.trim() || !newParkingSpot.trim())
              ? "Enter Location Details"
              : "Confirm & Book Slot"}
          </button>
        </div>
      </form>
    </UiDialog>
  );
}
