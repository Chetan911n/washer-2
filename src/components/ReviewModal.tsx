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
          <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-2 overflow-hidden border-2 border-blue-500 shadow-sm flex items-center justify-center">
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
          <h3 className="font-extrabold text-base text-slate-900">
            {booking.washer?.name || "Rajesh Kumar"}
          </h3>
          <p className="text-xs text-slate-500">
            Washed {booking.cars.map((c) => c.name).join(" & ")}
          </p>
        </div>

        {/* Star Rating */}
        <div className="py-2 text-center">
          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
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
                      : "text-slate-300"
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
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
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
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    selected
                      ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
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
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Write a Quick Review
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Super clean finish! Arrived right on time and parked cars safely."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Optional Tip */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Tip for {booking.washer?.name || "Washer"} (Optional)
          </label>
          <div className="flex items-center gap-2">
            {[0, 20, 50, 100].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setTip(amount)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  tip === amount
                    ? "bg-green-50 border-green-600 text-green-700 ring-1 ring-green-600"
                    : "bg-white border-slate-200 text-slate-600"
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
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
        >
          <Send className="w-4 h-4" />
          <span>Submit Review & Finish</span>
        </button>
      </form>
    </UiDialog>
  );
}
