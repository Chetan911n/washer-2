"use client";

import React, { useState } from "react";
import { UiDialog } from "./UiDialog";
import { Booking } from "@/lib/types";
import { generateUpiIntentUrl, generateAppSpecificUpiUrls } from "@/lib/upi";
import confetti from "canvas-confetti";
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onPaymentSuccess: (bookingId: string, ref: string) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  booking,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"intent" | "qr">("intent");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const upiDetails = {
    upiId: "washerpay@okhdfcbank",
    payeeName: "App Washer Services",
    amount: booking.totalAmount,
    transactionRef: "CW" + booking.bookingCode.replace("-", "") + Date.now().toString().slice(-4),
    note: `Doorstep Car Wash (${booking.bookingCode}) - ${booking.cars.length} Cars`,
  };

  const genericUrl = generateUpiIntentUrl(upiDetails);
  const appUrls = generateAppSpecificUpiUrls(upiDetails);

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(upiDetails.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // fallback
      }
      onPaymentSuccess(booking.id, upiDetails.transactionRef);
      onClose();
    }, 700);
  };

  return (
    <UiDialog isOpen={isOpen} onClose={onClose} title="Complete Payment (UPI Only)">
      <div className="space-y-4">
        {/* Banner */}
        <div className="bg-gradient-to-br from-[#07865B] via-[#066747] to-[#04412E] text-white p-5 rounded-3xl shadow-card text-center">
          <p className="text-xs text-[#E8F7EF] font-medium">
            Wash Completed by {booking.washer?.name || "Washer"}
          </p>
          <div className="text-3xl font-black mt-1">₹{booking.totalAmount}</div>
          <p className="text-[11px] text-[#E8F7EF] mt-1">
            Total for {booking.cars.length} {booking.cars.length === 1 ? "car" : "cars"} • Booking {booking.bookingCode}
          </p>
        </div>

        {/* Insurance & Quality verified badge */}
        <div className="p-3 bg-[#E8F7EF] border border-[#07865B]/25 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#066747]">
            <ShieldCheck className="w-4 h-4 text-[#07865B]" />
            <span className="font-bold">Before & After Photos Verified</span>
          </div>
          <span className="font-mono text-[11px] text-[#066747]">
            {booking.afterPhotos.length} After Photos
          </span>
        </div>

        {/* UPI Mode Tabs */}
        <div className="flex rounded-2xl bg-[#F7F8F7] p-1 border border-[#E7EBE8] text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("intent")}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "intent"
                ? "bg-white text-[#07865B] shadow-xs"
                : "text-[#707875] hover:text-[#171A19]"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            UPI App Direct
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "qr"
                ? "bg-white text-[#07865B] shadow-xs"
                : "text-[#707875] hover:text-[#171A19]"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Scan UPI QR Code
          </button>
        </div>

        {activeTab === "intent" ? (
          <div className="space-y-3">
            <p className="text-xs text-[#707875] text-center">
              Tap any installed UPI app on your phone to authorize payment instantly:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={appUrls.gpay}
                className="p-3 border border-[#E7EBE8] hover:border-[#07865B]/40 bg-white hover:bg-[#F7F8F7] rounded-2xl flex items-center justify-center gap-2 font-bold text-xs text-[#171A19] transition-all shadow-2xs"
              >
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">
                  G
                </span>
                Google Pay
              </a>

              <a
                href={appUrls.phonepe}
                className="p-3 border border-[#E7EBE8] hover:border-purple-400 bg-white hover:bg-[#F7F8F7] rounded-2xl flex items-center justify-center gap-2 font-bold text-xs text-[#171A19] transition-all shadow-2xs"
              >
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                  Pe
                </span>
                PhonePe
              </a>

              <a
                href={appUrls.paytm}
                className="p-3 border border-[#E7EBE8] hover:border-sky-400 bg-white hover:bg-[#F7F8F7] rounded-2xl flex items-center justify-center gap-2 font-bold text-xs text-[#171A19] transition-all shadow-2xs"
              >
                <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px]">
                  P
                </span>
                Paytm UPI
              </a>

              <a
                href={genericUrl}
                className="p-3 border border-[#E7EBE8] hover:border-[#07865B]/40 bg-white hover:bg-[#F7F8F7] rounded-2xl flex items-center justify-center gap-2 font-bold text-xs text-[#171A19] transition-all shadow-2xs"
              >
                <ExternalLink className="w-4 h-4 text-[#707875]" />
                Any UPI App
              </a>
            </div>

            <div className="p-3 bg-[#F7F8F7] border border-[#E7EBE8] rounded-2xl flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] text-[#707875] font-semibold uppercase">
                  UPI VPA Address
                </p>
                <p className="font-mono font-bold text-[#171A19]">
                  {upiDetails.upiId}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyUpiId}
                className="px-3 py-1.5 bg-white border border-[#E7EBE8] rounded-xl text-[#171A19] hover:bg-[#F7F8F7] flex items-center gap-1 font-semibold text-xs shadow-2xs"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#07865B]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#707875]" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            {/* Dynamic UPI QR Code */}
            <div className="w-44 h-44 mx-auto p-2 bg-white rounded-2xl border-2 border-[#E7EBE8] shadow-md flex flex-col items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect width="100" height="100" fill="white" />
                {/* Corner Finder 1 */}
                <rect x="5" y="5" width="28" height="28" fill="#171A19" rx="4" />
                <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                <rect x="13" y="13" width="12" height="12" fill="#07865B" rx="2" />
                {/* Corner Finder 2 */}
                <rect x="67" y="5" width="28" height="28" fill="#171A19" rx="4" />
                <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                <rect x="75" y="13" width="12" height="12" fill="#07865B" rx="2" />
                {/* Corner Finder 3 */}
                <rect x="5" y="67" width="28" height="28" fill="#171A19" rx="4" />
                <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                <rect x="13" y="75" width="12" height="12" fill="#07865B" rx="2" />
                {/* Matrix Dots */}
                <circle cx="45" cy="15" r="3" fill="#171A19" />
                <circle cx="55" cy="20" r="2.5" fill="#171A19" />
                <circle cx="40" cy="30" r="3" fill="#171A19" />
                <circle cx="50" cy="40" r="2.5" fill="#171A19" />
                <circle cx="60" cy="35" r="3" fill="#171A19" />
                <circle cx="20" cy="45" r="2.5" fill="#171A19" />
                <circle cx="30" cy="50" r="3" fill="#171A19" />
                <circle cx="50" cy="50" r="4" fill="#07865B" />
                <circle cx="70" cy="50" r="3" fill="#171A19" />
                <circle cx="80" cy="45" r="2.5" fill="#171A19" />
                <circle cx="45" cy="65" r="3" fill="#171A19" />
                <circle cx="55" cy="75" r="2.5" fill="#171A19" />
                <circle cx="75" cy="70" r="3" fill="#171A19" />
                <circle cx="85" cy="80" r="2.5" fill="#171A19" />
                <circle cx="65" cy="85" r="3" fill="#171A19" />
              </svg>
            </div>

            <p className="text-xs font-bold text-[#171A19]">
              Scan with GPay, PhonePe, Paytm, or any UPI App
            </p>
            <p className="text-[11px] font-mono text-[#707875]">
              Pay ₹{booking.totalAmount} to {upiDetails.upiId}
            </p>
          </div>
        )}

        {/* UPI Payment Simulator / Instant Confirmation Button */}
        <div className="pt-3 border-t border-[#E7EBE8]">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSimulatePayment}
            className="w-full py-3.5 bg-[#07865B] hover:bg-[#066747] text-white font-extrabold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#07865B]/20"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" /> Verifying UPI Payment...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> I Have Paid ₹{booking.totalAmount} via UPI
              </span>
            )}
          </button>
          <p className="text-[10px] text-center text-[#707875] mt-2">
            Automated UPI verification • Confirms within 2 seconds
          </p>
        </div>
      </div>
    </UiDialog>
  );
}
