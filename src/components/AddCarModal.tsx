"use client";

import React, { useState } from "react";
import { UiDialog } from "./UiDialog";
import { Car, CarType } from "@/lib/types";
import { PlusCircle, Check } from "lucide-react";

interface AddCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCar: (car: Omit<Car, "id">) => void;
}

const CAR_TYPES: { type: CarType; desc: string; icon: string }[] = [
  { type: "Hatchback", desc: "Swift, i20, Tiago, Polo", icon: "🚗" },
  { type: "Compact SUV", desc: "Brezza, Venue, Nexon, Sonet", icon: "🚙" },
  { type: "Sedan", desc: "City, Verna, Ciaz, Slavia", icon: "🚘" },
  { type: "SUV", desc: "Creta, Harrier, Scorpio, XUV700", icon: "🚙" },
  { type: "Luxury", desc: "BMW, Audi, Mercedes, Fortuner", icon: "✨" },
];

export function AddCarModal({ isOpen, onClose, onAddCar }: AddCarModalProps) {
  const [name, setName] = useState("");
  const [carType, setCarType] = useState<CarType>("SUV");
  const [carNumber, setCarNumber] = useState("");
  const [color, setColor] = useState("Polar White");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !carNumber) return;

    onAddCar({
      name: name.trim(),
      type: carType,
      carNumber: carNumber.toUpperCase().trim(),
      color: color.trim(),
    });

    // Reset & close
    setName("");
    setCarNumber("");
    onClose();
  };

  return (
    <UiDialog isOpen={isOpen} onClose={onClose} title="Add Vehicle to Garage">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Car Type Selector */}
        <div>
          <label className="block text-xs font-bold text-[#171A19] mb-1.5">
            Select Car Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CAR_TYPES.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setCarType(item.type)}
                className={`p-2.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                  carType === item.type
                    ? "border-[#07865B] bg-[#E8F7EF] text-[#066747] ring-1 ring-[#07865B]"
                    : "border-[#E7EBE8] hover:border-slate-300 bg-white"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#171A19]">
                      {item.type}
                    </span>
                    {carType === item.type && (
                      <Check className="w-3.5 h-3.5 text-[#07865B]" />
                    )}
                  </div>
                  <p className="text-[10px] text-[#707875] truncate">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Car Name & Model */}
        <div>
          <label className="block text-xs font-semibold text-[#171A19] mb-1">
            Car Brand & Model
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tata Nexon Fearless"
            className="w-full px-3 py-2 text-sm rounded-xl border border-[#E7EBE8] focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
          />
        </div>

        {/* Car Reg Number */}
        <div>
          <label className="block text-xs font-semibold text-[#171A19] mb-1">
            Car Registration Number
          </label>
          <input
            type="text"
            required
            value={carNumber}
            onChange={(e) => setCarNumber(e.target.value)}
            placeholder="e.g. KA 05 MN 4589"
            className="w-full px-3 py-2 text-sm uppercase font-mono tracking-wider rounded-xl border border-[#E7EBE8] focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
          />
        </div>

        {/* Car Color */}
        <div>
          <label className="block text-xs font-semibold text-[#171A19] mb-1">
            Vehicle Color
          </label>
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="e.g. Polar White"
            className="w-full px-3 py-2 text-sm rounded-xl border border-[#E7EBE8] focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#07865B]/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Save to Garage</span>
        </button>
      </form>
    </UiDialog>
  );
}
