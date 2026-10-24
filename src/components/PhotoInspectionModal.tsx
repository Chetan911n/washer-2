"use client";

import React, { useState } from "react";
import { UiDialog } from "./UiDialog";
import { Booking, Car, InspectionPhoto } from "@/lib/types";
import { CameraCaptureModal } from "./CameraCaptureModal";
import { generateWhatsAppMessage } from "@/lib/upi";
import {
  ShieldAlert,
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface PhotoInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onSaveBeforePhotos: (bookingId: string, photos: InspectionPhoto[]) => void;
  onCompleteJob: (bookingId: string, afterPhotos: InspectionPhoto[]) => void;
}

const ANGLES: InspectionPhoto["angle"][] = [
  "Front",
  "Rear",
  "Left Side",
  "Right Side",
  "Scratches / Pre-existing",
];

export function PhotoInspectionModal({
  isOpen,
  onClose,
  booking,
  onSaveBeforePhotos,
  onCompleteJob,
}: PhotoInspectionModalProps) {
  const [activeCarIndex, setActiveCarIndex] = useState(0);
  const [photoType, setPhotoType] = useState<"before" | "after">(
    booking.beforePhotos.length > 0 ? "after" : "before"
  );
  const [localBeforePhotos, setLocalBeforePhotos] = useState<InspectionPhoto[]>(
    booking.beforePhotos || []
  );
  const [localAfterPhotos, setLocalAfterPhotos] = useState<InspectionPhoto[]>(
    booking.afterPhotos || []
  );

  // Camera sub-modal state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentAngle, setCurrentAngle] =
    useState<InspectionPhoto["angle"]>("Front");

  // WhatsApp sent feedback
  const [showWhatsAppSentModal, setShowWhatsAppSentModal] = useState(false);
  const [whatsAppUrl, setWhatsAppUrl] = useState("");

  const activeCar: Car | undefined = booking.cars[activeCarIndex];

  // Helper to open camera
  const handleOpenCapture = (
    angle: InspectionPhoto["angle"],
    type: "before" | "after"
  ) => {
    setPhotoType(type);
    setCurrentAngle(angle);
    setCameraOpen(true);
  };

  const handlePhotoCaptured = (imageUrl: string) => {
    if (!activeCar) return;

    const newPhoto: InspectionPhoto = {
      id: "photo-" + Date.now(),
      carId: activeCar.id,
      carNumber: activeCar.carNumber,
      carName: activeCar.name,
      type: photoType,
      angle: currentAngle,
      imageUrl,
      timestamp: new Date().toLocaleTimeString(),
    };

    if (photoType === "before") {
      const filtered = localBeforePhotos.filter(
        (p) => !(p.carId === activeCar.id && p.angle === currentAngle)
      );
      setLocalBeforePhotos([...filtered, newPhoto]);
    } else {
      const filtered = localAfterPhotos.filter(
        (p) => !(p.carId === activeCar.id && p.angle === currentAngle)
      );
      setLocalAfterPhotos([...filtered, newPhoto]);
    }
  };

  // Check if minimum before photos are satisfied
  const isBeforePhotosComplete = booking.cars.every((car) => {
    const carBeforePhotos = localBeforePhotos.filter((p) => p.carId === car.id);
    return carBeforePhotos.length >= 2;
  });

  const isAfterPhotosReady = booking.cars.every((car) => {
    const carAfterPhotos = localAfterPhotos.filter((p) => p.carId === car.id);
    return carAfterPhotos.length >= 2;
  });

  const handleSaveBeforeAndStartWash = () => {
    onSaveBeforePhotos(booking.id, localBeforePhotos);
    setPhotoType("after");
  };

  const handleCompleteJobAction = () => {
    const wa = generateWhatsAppMessage({
      customerName: booking.customerName,
      carNames: booking.cars.map((c) => c.name),
      bookingCode: booking.bookingCode,
      washerName: booking.washer?.name || "Rajesh Kumar",
      totalAmount: booking.totalAmount,
      photoCount: localAfterPhotos.length,
    });
    setWhatsAppUrl(wa.url);
    onCompleteJob(booking.id, localAfterPhotos);
    setShowWhatsAppSentModal(true);
  };

  // Retake after photos handler
  const handleRetakeAllAfterPhotos = () => {
    if (confirm("Do you want to retake after-photos for blurry or poor lighting?")) {
      setLocalAfterPhotos([]);
      setCurrentAngle("Front");
      setPhotoType("after");
      setCameraOpen(true);
    }
  };

  return (
    <>
      <UiDialog
        isOpen={isOpen && !cameraOpen && !showWhatsAppSentModal}
        onClose={onClose}
        maxWidth="max-w-2xl"
        title={`Job Inspection • ${booking.bookingCode}`}
      >
        <div className="space-y-4">
          {/* Insurance Alert Banner */}
          <div className="p-3.5 bg-[#E8F7EF] border border-[#07865B]/25 rounded-2xl flex items-start gap-3 text-xs text-[#066747]">
            <ShieldAlert className="w-5 h-5 text-[#07865B] shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-[#171A19]">Insurance & Damage Protection Protocol</p>
              <p className="text-[#066747] text-[11px] mt-0.5">
                Always take timestamped before-photos of all sides and existing scratch spots before starting. This guarantees zero false damage claims against our washing team.
              </p>
            </div>
          </div>

          {/* Car Tabs (for multi-car bookings) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {booking.cars.map((car, idx) => {
              const beforeCount = localBeforePhotos.filter(
                (p) => p.carId === car.id
              ).length;
              const afterCount = localAfterPhotos.filter(
                (p) => p.carId === car.id
              ).length;

              return (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => setActiveCarIndex(idx)}
                  className={`px-3 py-2 rounded-2xl text-xs font-bold border whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeCarIndex === idx
                      ? "border-[#07865B] bg-[#E8F7EF] text-[#066747] ring-1 ring-[#07865B]"
                      : "border-[#E7EBE8] bg-white text-[#707875] hover:bg-[#F7F8F7]"
                  }`}
                >
                  <span>
                    Car #{idx + 1}: {car.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-[#171A19] border border-[#E7EBE8]">
                    {photoType === "before"
                      ? `${beforeCount}/4 Before`
                      : `${afterCount}/4 After`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Car Info */}
          {activeCar && (
            <div className="p-3 bg-[#F7F8F7] rounded-2xl flex items-center justify-between text-xs border border-[#E7EBE8]">
              <div>
                <span className="font-extrabold text-[#171A19] text-sm">
                  {activeCar.name} ({activeCar.type})
                </span>
                <p className="font-mono text-[#707875]">{activeCar.carNumber}</p>
              </div>
              <div className="flex rounded-xl bg-white p-1 border border-[#E7EBE8] text-xs font-semibold">
                <button
                  onClick={() => setPhotoType("before")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    photoType === "before"
                      ? "bg-amber-100 text-amber-900 font-bold"
                      : "text-[#707875]"
                  }`}
                >
                  Before Photos
                </button>
                <button
                  onClick={() => setPhotoType("after")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    photoType === "after"
                      ? "bg-[#E8F7EF] text-[#07865B] font-bold"
                      : "text-[#707875]"
                  }`}
                >
                  After Photos
                </button>
              </div>
            </div>
          )}

          {/* Angle Photo Grid */}
          <div>
            <h4 className="text-xs font-bold text-[#171A19] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>
                {photoType === "before"
                  ? "Required Before Angles (Insurance Record)"
                  : "Completed After Angles (Clean Shiny Proof)"}
              </span>
              <span className="text-[11px] font-normal text-[#707875]">
                Tap any tile to capture or replace
              </span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ANGLES.map((angle) => {
                const existing = (
                  photoType === "before" ? localBeforePhotos : localAfterPhotos
                ).find((p) => p.carId === activeCar?.id && p.angle === angle);

                return (
                  <div
                    key={angle}
                    onClick={() => handleOpenCapture(angle, photoType)}
                    className={`relative rounded-2xl border-2 border-dashed p-2 flex flex-col items-center justify-center text-center cursor-pointer min-h-[110px] transition-all overflow-hidden ${
                      existing
                        ? "border-[#07865B] bg-[#E8F7EF]/30"
                        : "border-[#E7EBE8] hover:border-[#07865B]/40 bg-[#F7F8F7] hover:bg-white"
                    }`}
                  >
                    {existing ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={existing.imageUrl}
                          alt={angle}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-0.5" />
                          <span className="text-[11px] font-bold">{angle}</span>
                          <span className="text-[9px] text-white/80 underline mt-1">
                            Tap to retake
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-[#707875] mb-1" />
                        <span className="text-xs font-bold text-[#171A19]">
                          {angle}
                        </span>
                        <span className="text-[10px] text-[#707875] mt-0.5">
                          Tap to photograph
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[#E7EBE8]">
            {photoType === "before" ? (
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-[#707875]">
                  {isBeforePhotosComplete ? (
                    <span className="text-[#07865B] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Ready to begin wash
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Take at least 2 before-photos
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSaveBeforeAndStartWash}
                  className="py-2.5 px-5 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm shadow-[#07865B]/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Wash & Switch to After Photos</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={handleRetakeAllAfterPhotos}
                  className="py-2.5 px-4 border border-[#E7EBE8] hover:bg-[#F7F8F7] text-[#171A19] font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#707875]" />
                  <span>Retake Photos (Blurry/Bad)</span>
                </button>

                <button
                  type="button"
                  disabled={!isAfterPhotosReady}
                  onClick={handleCompleteJobAction}
                  className={`py-2.5 px-6 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm ${
                    isAfterPhotosReady
                      ? "bg-[#07865B] hover:bg-[#066747] text-white shadow-[#07865B]/20"
                      : "bg-[#E7EBE8] text-[#707875] cursor-not-allowed"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Job & Trigger Payment</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </UiDialog>

      {/* Sub-modal: Active Camera Capture */}
      {activeCar && (
        <CameraCaptureModal
          isOpen={cameraOpen}
          onClose={() => setCameraOpen(false)}
          carName={activeCar.name}
          carNumber={activeCar.carNumber}
          angle={currentAngle}
          photoType={photoType}
          onPhotoCaptured={handlePhotoCaptured}
        />
      )}

      {/* Sub-modal: WhatsApp Confirmation & Preview */}
      <UiDialog
        isOpen={showWhatsAppSentModal}
        onClose={() => {
          setShowWhatsAppSentModal(false);
          onClose();
        }}
        title="Job Completed & Photos Dispatched!"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 bg-[#E8F7EF] text-[#07865B] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-extrabold text-[#171A19]">
              Photos Prepared for WhatsApp & Payment Opened!
            </h3>
            <p className="text-xs text-[#707875] mt-1">
              Customer <strong>{booking.customerName}</strong> ({booking.customerPhone}) now has the UPI payment screen triggered automatically.
            </p>
          </div>

          <div className="p-3 bg-[#E8F7EF] border border-[#07865B]/20 rounded-xl text-left text-xs text-[#066747] space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#07865B]" />
              <span>WhatsApp Message Content:</span>
            </div>
            <p className="text-[11px] text-[#066747]">
              Clean photos summary link & verification proof ready to dispatch to customer WhatsApp.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 bg-[#07865B] hover:bg-[#066747] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-[#07865B]/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Send via WhatsApp App</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setShowWhatsAppSentModal(false);
                onClose();
              }}
              className="py-2.5 px-4 bg-[#171A19] hover:bg-[#232725] text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </UiDialog>
    </>
  );
}
