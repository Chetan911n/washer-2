"use client";

import React, { useState } from "react";
import { Booking } from "@/lib/types";
import confetti from "canvas-confetti";
import {
  Star,
  ThumbsUp,
  Send,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface ReviewPageProps {
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
  onBack: () => void;
}

const COMPLIMENT_TAGS = [
  "✨ Crystal Clean Wheels",
  "⚡ On-Time Arrival",
  "🛡️ Zero Scratches / Dents",
  "🪟 Spotless Glass",
  "👔 Polite & Professional",
  "🧼 Rich Foam Shine",
];

export function ReviewPage({
  booking,
  onSubmitReview,
  onBack,
}: ReviewPageProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "✨ Crystal Clean Wheels",
    "🛡️ Zero Scratches / Dents",
  ]);
  const [comment, setComment] = useState("");
  const [tip, setTip] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {
      // ignore
    }
    setIsSubmitted(true);
    onSubmitReview(booking.id, {
      rating,
      tags: selectedTags,
      comment: comment.trim() || "Excellent doorstep car wash!",
      tipAmount: tip,
    });

    setTimeout(() => {
      onBack();
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          Review Submitted!
        </h2>
        <p className="text-sm text-slate-600">
          Thank you for rating {booking.washer?.name || "Rajesh Kumar"}. Your feedback helps our doorstep team maintain 5-star quality.
        </p>
        <p className="text-xs text-slate-400">Returning to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-4 px-2 space-y-5 animate-in fade-in-50 duration-200">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Hero Success Card */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-800 text-white p-5 rounded-3xl shadow-lg space-y-2 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-200" />
          <span>Payment Verified • UPI Successful</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight">
          How was your car wash?
        </h1>
        <p className="text-xs text-green-100">
          Booking {booking.bookingCode} • Cleaned {booking.cars.map((c) => c.name).join(", ")}
        </p>
      </div>

      {/* Washer Partner Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 overflow-hidden border-2 border-blue-500 shrink-0">
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
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">
              {booking.washer?.name || "Rajesh Kumar"}
            </h3>
            <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              4.92 Rating
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Your Doorstep Car Care Professional
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-semibold mt-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Insurance Before & After Photos Submitted</span>
          </div>
        </div>
      </div>

      {/* After Photos Gallery Preview (if any) */}
      {booking.afterPhotos.length > 0 && (
        <div className="bg-slate-100 p-3 rounded-2xl">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Clean Photos Captured by Washer ({booking.afterPhotos.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {booking.afterPhotos.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="aspect-video rounded-xl overflow-hidden bg-black relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt={p.angle}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 text-[9px] font-mono text-white bg-black/60 px-1 rounded">
                  {p.angle}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Star Rating */}
        <div className="text-center py-2">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Tap Stars to Rate
          </label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => setRating(star)}
                className="p-1 focus:outline-none transition-transform hover:scale-125"
              >
                <Star
                  className={`w-9 h-9 ${
                    (hoverRating !== null ? hoverRating >= star : rating >= star)
                      ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                      : "text-slate-200"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs font-extrabold text-amber-600 mt-2">
            {rating === 5
              ? "🌟 5/5 — Spotless Shine & Outstanding Service!"
              : rating === 4
              ? "⭐ 4/5 — Very Good Clean"
              : rating === 3
              ? "⭐ 3/5 — Average Wash"
              : "⭐ " + rating + "/5 — Needs Improvement"}
          </p>
        </div>

        {/* Compliment Tags */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
            What impressed you the most?
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
                      ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Write Feedback for Washer
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Washed right at my parking slot, zero scratches, glass and tyres look brand new!"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Optional Tip */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Add a Tip for {booking.washer?.name || "Washer"} (Optional)
          </label>
          <div className="flex items-center gap-2">
            {[0, 20, 50, 100].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTip(amt)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  tip === amt
                    ? "bg-green-50 border-green-600 text-green-700 ring-1 ring-green-600 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {amt === 0 ? "No Tip" : `₹${amt}`}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 hover:scale-[1.01]"
        >
          <Send className="w-4 h-4" />
          <span>Submit Review & Complete</span>
        </button>
      </form>
    </div>
  );
}
