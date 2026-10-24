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
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
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

const PACKAGES: {
  name: Booking["washType"];
  title: string;
  badge?: string;
  desc: string;
  features: string[];
}[] = [
  {
    name: "Exterior Foam Wash",
    title: "Exterior Foam Wash",
    badge: "Popular",
    desc: "Doorstep high-pressure snow foam wash, glass shine & rim cleaning.",
    features: [
      "High-pressure snow foam wash",
      "Wheel arches & rim cleaning",
      "Exterior streak-free glass shine",
      "Door jambs & boot edge wiping",
      "Before/After insurance photos included",
    ],
  },
  {
    name: "Deep Wash & Polish",
    title: "Deep Wash & Polish",
    badge: "Recommended",
    desc: "Exterior foam wash plus protective paint polish & tyre dressing.",
    features: [
      "Everything in Exterior Foam Wash",
      "Hydrophobic wax polish & shine",
      "Deep tyre & plastic trim dressing",
      "Glass water-repellent coating",
      "Timestamped digital inspection report",
    ],
  },
  {
    name: "Interior + Exterior",
    title: "Interior + Exterior",
    desc: "Complete exterior wash + cabin vacuuming & dashboard dress.",
    features: [
      "Everything in Deep Wash",
      "Floor mat & seat vacuuming",
      "Dashboard & console sanitization",
      "Boot space vacuum & air freshener",
      "Door panels cleaning",
    ],
  },
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
  // Stepper state: 1: Cars, 2: Package, 3: Date/Time, 4: Location, 5: Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

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

  // Keep selectedCarIds synced if cars change
  React.useEffect(() => {
    if (cars.length > 0 && selectedCarIds.length === 0) {
      setSelectedCarIds([cars[0].id]);
    }
  }, [cars, selectedCarIds]);

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

  const stepsList = [
    { num: 1, label: "Cars" },
    { num: 2, label: "Package" },
    { num: 3, label: "Time" },
    { num: 4, label: "Location" },
    { num: 5, label: "Review" },
  ];

  return (
    <UiDialog isOpen={isOpen} onClose={onClose} title="Book Doorstep Car Wash" maxWidth="max-w-xl">
      <div className="space-y-5">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E7EBE8]">
          {stepsList.map((step, idx) => {
            const isPassed = currentStep > step.num;
            const isCurrent = currentStep === step.num;

            return (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => {
                    // Only allow jumping back or forward if valid
                    if (step.num <= currentStep || (step.num === 2 && selectedCars.length > 0)) {
                      setCurrentStep(step.num as 1 | 2 | 3 | 4 | 5);
                    }
                  }}
                  className="flex items-center gap-1.5 focus:outline-none group text-left"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-[#07865B] text-white shadow-xs"
                        : isPassed
                        ? "bg-[#E8F7EF] text-[#07865B] font-bold"
                        : "bg-[#F7F8F7] text-[#707875] border border-[#E7EBE8]"
                    }`}
                  >
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </div>
                  <span
                    className={`text-xs hidden sm:inline transition-colors ${
                      isCurrent
                        ? "font-extrabold text-[#171A19]"
                        : isPassed
                        ? "font-medium text-[#07865B]"
                        : "text-[#707875]"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1.5 transition-colors ${
                      currentStep > step.num ? "bg-[#07865B]" : "bg-[#E7EBE8]"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* STEP 1: SELECT CARS */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#171A19] flex items-center gap-1.5">
                  <CarIcon className="w-3.5 h-3.5 text-[#07865B]" />
                  Select Cars to Wash
                </label>
                <p className="text-[11px] text-[#707875]">
                  Select 1, 2, or multiple cars for the same doorstep visit
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAddCar}
                className="text-xs font-bold text-[#07865B] hover:text-[#066747] flex items-center gap-1 bg-[#E8F7EF] px-2.5 py-1.5 rounded-xl border border-[#07865B]/20 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Vehicle</span>
              </button>
            </div>

            <div className="space-y-2">
              {cars.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-[#E7EBE8] rounded-2xl text-center space-y-2.5 bg-[#F7F8F7]">
                  <CarIcon className="w-8 h-8 text-[#707875] mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-[#171A19]">No cars in your garage</p>
                    <p className="text-[11px] text-[#707875]">Please add your vehicle to proceed with booking.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAddCar}
                    className="px-3.5 py-1.5 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
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
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-[#07865B] bg-[#E8F7EF]/50 shadow-xs ring-1 ring-[#07865B]"
                          : "border-[#E7EBE8] hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-[#07865B] border-[#07865B] text-white"
                              : "border-[#E7EBE8] bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#171A19]">
                              {car.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F8F7] text-[#171A19] font-semibold border border-[#E7EBE8]">
                              {car.type}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-[#707875] mt-0.5">
                            {car.carNumber} • {car.color || "Color"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#171A19] block">
                          ₹{price}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            isSelected
                              ? "bg-[#E8F7EF] text-[#07865B]"
                              : "bg-[#F7F8F7] text-[#707875]"
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
              <div className="text-xs font-semibold text-[#066747] bg-[#E8F7EF] px-3.5 py-2 rounded-xl flex items-center gap-2 border border-[#07865B]/20">
                <Sparkles className="w-4 h-4 text-[#07865B] shrink-0" />
                <span>
                  Multi-car wash selected ({selectedCars.length} cars) — washed together at your parking spot!
                </span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={selectedCars.length === 0}
                onClick={() => setCurrentStep(2)}
                className={`py-2.5 px-5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  selectedCars.length === 0
                    ? "bg-[#E7EBE8] text-[#707875] cursor-not-allowed"
                    : "bg-[#07865B] hover:bg-[#066747] text-white shadow-sm shadow-[#07865B]/20"
                }`}
              >
                <span>Select Package</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT PACKAGE */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <label className="text-xs font-bold text-[#171A19] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#07865B]" />
                Choose Doorstep Wash Package
              </label>
              <p className="text-[11px] text-[#707875]">
                Includes high-pressure foam, glass shine, and timestamped inspection photos
              </p>
            </div>

            <div className="space-y-3">
              {PACKAGES.map((pkg) => {
                const isSelected = washType === pkg.name;
                return (
                  <div
                    key={pkg.name}
                    onClick={() => setWashType(pkg.name)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#07865B] bg-[#E8F7EF]/40 ring-1 ring-[#07865B] shadow-xs"
                        : "border-[#E7EBE8] hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-[#171A19]">
                            {pkg.title}
                          </h4>
                          {pkg.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F7EF] text-[#07865B] border border-[#07865B]/20">
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#707875] mt-0.5">{pkg.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-[#07865B] border-[#07865B] text-white"
                            : "border-[#E7EBE8] bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#E7EBE8]/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#171A19]">
                      {pkg.features.map((feat) => (
                        <div key={feat} className="flex items-center gap-1.5 text-[#171A19]">
                          <Check className="w-3.5 h-3.5 text-[#07865B] shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="py-2.5 px-4 text-xs font-bold text-[#707875] hover:text-[#171A19] flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="py-2.5 px-5 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-[#07865B]/20 transition-all"
              >
                <span>Choose Date & Time</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DATE & TIME */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <label className="text-xs font-bold text-[#171A19] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#07865B]" />
                Schedule Your Doorstep Wash Slot
              </label>
              <p className="text-[11px] text-[#707875]">
                Our certified station technician will arrive promptly at your chosen slot
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#171A19] mb-1.5 block">
                  Select Date
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E7EBE8] bg-white focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#171A19] mb-1.5 block">
                  Preferred Time Slot
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#E7EBE8] bg-white focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick time slot chips */}
            <div>
              <label className="text-[11px] font-bold text-[#707875] mb-1.5 block">
                Quick Slot Selection
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] border text-center transition-all ${
                      selectedSlot === slot
                        ? "border-[#07865B] bg-[#E8F7EF] text-[#066747] font-bold ring-1 ring-[#07865B]"
                        : "border-[#E7EBE8] hover:border-slate-300 bg-white text-[#171A19]"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="py-2.5 px-4 text-xs font-bold text-[#707875] hover:text-[#171A19] flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="py-2.5 px-5 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-[#07865B]/20 transition-all"
              >
                <span>Service Location</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SERVICE LOCATION & PARKING SPOT */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#171A19] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#07865B]" />
                  Service Address & Parking Spot
                </label>
                <p className="text-[11px] text-[#707875]">
                  Where is your car parked? Washer visits your exact parking bay.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingLocation(!isAddingLocation)}
                className="text-xs font-bold text-[#07865B] hover:text-[#066747] bg-[#E8F7EF] px-2.5 py-1.5 rounded-xl border border-[#07865B]/20 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingLocation ? "Cancel" : "Add Location"}</span>
              </button>
            </div>

            {/* Inline Add Location Form */}
            {isAddingLocation ? (
              <div className="p-4 bg-[#F7F8F7] border border-[#07865B]/30 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-[#066747] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#07865B]" />
                  Add Doorstep Location & Parking Bay
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#707875] mb-1">
                      Location Label
                    </label>
                    <select
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#E7EBE8] bg-white outline-none"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Apartment / Society">Apartment / Society</option>
                      <option value="Mall / Club">Mall / Club</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#707875] mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="Bangalore"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#E7EBE8] bg-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#707875] mb-1">
                    Building / Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    placeholder="e.g. Prestige Greenwoods, Tower 2"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#E7EBE8] bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#066747] mb-1">
                    Exact Parking Spot / Bay Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newParkingSpot}
                    onChange={(e) => setNewParkingSpot(e.target.value)}
                    placeholder="e.g. Basement 2, Pillar #88 (Covered)"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#07865B]/40 bg-white font-medium text-[#066747] outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveNewLocation}
                  className="w-full py-2 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Use Location</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-[#E7EBE8] rounded-2xl text-center space-y-2 bg-[#F7F8F7]">
                    <p className="text-xs font-bold text-[#171A19]">No saved locations</p>
                    <p className="text-[11px] text-[#707875]">Please enter your service address and parking spot below.</p>
                    <button
                      type="button"
                      onClick={() => setIsAddingLocation(true)}
                      className="px-3.5 py-1.5 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs inline-flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Enter Address & Parking Spot</span>
                    </button>
                  </div>
                ) : (
                  addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-3 rounded-2xl border cursor-pointer text-xs transition-all ${
                          isSelected
                            ? "border-[#07865B] bg-[#E8F7EF]/40 ring-1 ring-[#07865B]"
                            : "border-[#E7EBE8] bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[#171A19]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#07865B]" />
                            {addr.label}: {addr.street}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#07865B]" />
                          )}
                        </div>
                        <div className="text-[#707875] text-[11px] mt-1 flex items-center justify-between">
                          <span>
                            Spot: <strong className="text-[#066747]">{addr.parkingSpot}</strong>
                          </span>
                          <span className="font-mono text-[#707875]">{addr.city}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="py-2.5 px-4 text-xs font-bold text-[#707875] hover:text-[#171A19] flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={!selectedAddress && (!newStreet.trim() || !newParkingSpot.trim())}
                onClick={() => setCurrentStep(5)}
                className={`py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  !selectedAddress && (!newStreet.trim() || !newParkingSpot.trim())
                    ? "bg-[#E7EBE8] text-[#707875] cursor-not-allowed"
                    : "bg-[#07865B] hover:bg-[#066747] text-white shadow-sm shadow-[#07865B]/20"
                }`}
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & FINAL COMBINED TOTAL */}
        {currentStep === 5 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <label className="text-xs font-bold text-[#171A19] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#07865B]" />
                Review Booking Details
              </label>
              <p className="text-[11px] text-[#707875]">
                Verify vehicle selection, appointment schedule, and parking bay before dispatching
              </p>
            </div>

            {/* Comprehensive Summary Card */}
            <div className="bg-[#F7F8F7] border border-[#E7EBE8] rounded-2xl p-4 space-y-3 text-xs">
              {/* Package & Schedule */}
              <div className="flex items-start justify-between pb-2.5 border-b border-[#E7EBE8]">
                <div>
                  <span className="text-[10px] font-bold text-[#707875] uppercase">Service Package</span>
                  <p className="font-extrabold text-[#171A19] text-sm mt-0.5">{washType}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#707875] uppercase">Schedule Slot</span>
                  <p className="font-bold text-[#171A19] mt-0.5">{selectedDate}</p>
                  <p className="text-[11px] text-[#07865B] font-semibold">{selectedSlot}</p>
                </div>
              </div>

              {/* Cars Breakdown */}
              <div className="pb-2.5 border-b border-[#E7EBE8]">
                <span className="text-[10px] font-bold text-[#707875] uppercase block mb-1.5">
                  Selected Vehicles ({selectedCars.length})
                </span>
                <div className="space-y-1.5">
                  {selectedCars.map((car) => (
                    <div key={car.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-[#E7EBE8]">
                      <div>
                        <span className="font-bold text-[#171A19]">{car.name}</span>
                        <span className="text-[10px] text-[#707875] ml-1.5 font-mono">({car.carNumber})</span>
                      </div>
                      <span className="font-bold text-[#171A19]">₹{CAR_PRICING[car.type] || 399}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doorstep Location & Parking Bay */}
              <div>
                <span className="text-[10px] font-bold text-[#707875] uppercase block mb-1">
                  Doorstep Service Location
                </span>
                <p className="text-[#171A19] font-medium">
                  {selectedAddress?.street || newStreet}, {selectedAddress?.city || newCity}
                </p>
                <div className="mt-1.5">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-[#E8F7EF] border border-[#07865B]/25 text-[#066747] font-bold text-[11px]">
                    Parking Spot: {selectedAddress?.parkingSpot || newParkingSpot}
                  </span>
                </div>
              </div>
            </div>

            {/* Zero Damage Guarantee Notice */}
            <div className="p-3 bg-[#E8F7EF] border border-[#07865B]/20 rounded-2xl flex items-center gap-2.5 text-xs text-[#066747]">
              <ShieldCheck className="w-5 h-5 text-[#07865B] shrink-0" />
              <span>
                <strong>Zero Damage Guarantee:</strong> Technician will capture mandatory before-photos of all angles before beginning wash.
              </span>
            </div>

            {/* Combined Total & CTA */}
            <div className="pt-3 border-t border-[#E7EBE8] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#707875] font-semibold block">
                  Combined Total ({selectedCars.length} {selectedCars.length === 1 ? "car" : "cars"})
                </span>
                <div className="text-2xl font-black text-[#171A19] leading-none mt-1">
                  ₹{totalAmount}
                </div>
                <span className="text-[10px] text-[#07865B] font-semibold">
                  Taxes & doorstep visit included
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="py-2.5 px-3 text-xs font-bold text-[#707875] hover:text-[#171A19]"
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="py-3 px-6 bg-[#07865B] hover:bg-[#066747] text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-[#07865B]/25 flex items-center gap-1.5 hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Confirm & Book Slot</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </UiDialog>
  );
}
