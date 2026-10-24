"use client";

import React, { useState } from "react";
import { UiDialog } from "./UiDialog";
import { Booking } from "@/lib/types";
import confetti from "canvas-confetti";
import { Star, ThumbsUp, Send } from "lucide-react";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
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

const COMPLIMENT_TAGS = [
  "✨ Crystal Clean Wheels",
  "⚡ On-Time Arrival",
  "🛡️ Zero Scratches",
  "🪟 Spotless Glass",
  "👔 Polite & Professional",
  "🧼 Rich Foam Shine",
];

export function ReviewModal({
  isOpen,
  onClose,
  booking,
  onSubmitReview,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "✨ Crystal Clean Wheels",
    "🛡️ Zero Scratches",
  ]);
  const [comment, setComment] = useState("");
  const [tip, setTip] = useState<number>(0);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
    onSubmitReview(booking.id, {
      rating,
      tags: selectedTags,
      comment: comment.trim() || "Great car wash service!",
      tipAmount: tip,
    });
    onClose();
  };

  return (
    <UiDialog isOpen={isOpen} onClose={onClose} title="Review Your Washer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Washer Avatar & Profile */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F7EF] mx-auto mb-2 overflow-hidden border-2 border-[#07865B] shadow-2xs flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                booking.washer?.avatarUrl ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
              }
              alt={booking.washer?.name || "Washer"}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="font-extrabold text-base text-[#171A19]">
            {booking.washer?.name || "Rajesh Kumar"}
          </h3>
          <p className="text-xs text-[#707875]">
            Washed {booking.cars.map((c) => c.name).join(" & ")}
          </p>
        </div>

        {/* Star Rating */}
        <div className="py-2 text-center">
          <label className="block text-xs font-bold text-[#707875] mb-2 uppercase tracking-wider">
            Rate Your Doorstep Experience
          </label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => setRating(star)}
                className="p-1 focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    (hoverRating !== null ? hoverRating >= star : rating >= star)
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-xs font-bold text-amber-600 mt-1 inline-block">
            {rating === 5
              ? "⭐ 5/5 — Outstanding Wash!"
              : rating === 4
              ? "⭐ 4/5 — Very Good"
              : "⭐ " + rating + "/5"}
          </span>
        </div>

        {/* Compliment Tags */}
        <div>
          <label className="block text-xs font-bold text-[#171A19] mb-1.5 flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5 text-[#07865B]" />
            What did you like the most?
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMPLIMENT_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    selected
                      ? "bg-[#E8F7EF] border-[#07865B] text-[#066747] ring-1 ring-[#07865B]"
                      : "bg-white border-[#E7EBE8] text-[#707875] hover:border-slate-300"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Text */}
        <div>
          <label className="block text-xs font-bold text-[#171A19] mb-1">
            Write a Quick Review
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Super clean finish! Arrived right on time and parked cars safely."
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#E7EBE8] focus:border-[#07865B] focus:ring-1 focus:ring-[#07865B] outline-none"
          />
        </div>

        {/* Optional Tip */}
        <div>
          <label className="block text-xs font-bold text-[#171A19] mb-1.5">
            Tip for {booking.washer?.name || "Washer"} (Optional)
          </label>
          <div className="flex items-center gap-2">
            {[0, 20, 50, 100].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setTip(amount)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  tip === amount
                    ? "bg-[#E8F7EF] border-[#07865B] text-[#066747] ring-1 ring-[#07865B]"
                    : "bg-white border-[#E7EBE8] text-[#707875]"
                }`}
              >
                {amount === 0 ? "No Tip" : `₹${amount}`}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-[#07865B]/20"
        >
          <Send className="w-4 h-4" />
          <span>Submit Review & Finish</span>
        </button>
      </form>
    </UiDialog>
  );
}
