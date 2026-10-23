"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { UiDialog } from "./UiDialog";
import { Camera, RefreshCw, Upload, Check, AlertCircle } from "lucide-react";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  carName: string;
  carNumber: string;
  angle: string;
  photoType: "before" | "after";
  onPhotoCaptured: (imageDataUrl: string) => void;
}

// Sample realistic demo car photos if camera is unavailable
const SAMPLE_CAR_PHOTOS: Record<string, string[]> = {
  before: [
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  ],
  after: [
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80",
  ],
};

export function CameraCaptureModal({
  isOpen,
  onClose,
  carName,
  carNumber,
  angle,
  photoType,
  onPhotoCaptured,
}: CameraCaptureModalProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setCameraError("Camera permission denied or camera unavailable. You can upload or use high-def sample photo.");
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const snapPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseSample = () => {
    const list = SAMPLE_CAR_PHOTOS[photoType] || SAMPLE_CAR_PHOTOS.before;
    const random = list[Math.floor(Math.random() * list.length)];
    setCapturedImage(random);
    stopCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onPhotoCaptured(capturedImage);
      onClose();
    }
  };

  return (
    <UiDialog
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={`${photoType === "before" ? "Insurance Before-Photo" : "Clean After-Photo"}: ${angle}`}
    >
      <div className="space-y-4">
        {/* Car header */}
        <div className="p-2.5 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-800">{carName}</span>
            <span className="ml-2 font-mono text-slate-500">{carNumber}</span>
          </div>
          <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] bg-blue-100 text-blue-700">
            {angle}
          </span>
        </div>

        {/* Viewport */}
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-300 flex items-center justify-center">
          {capturedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedImage}
              alt="Inspection photo preview"
              className="w-full h-full object-cover"
            />
          ) : cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Overlay grid for inspection alignment */}
              <div className="absolute inset-0 pointer-events-none border-2 border-white/20 grid grid-cols-3 grid-rows-3">
                <div className="border border-white/10" />
                <div className="border border-white/10" />
                <div className="border border-white/10" />
                <div className="border border-white/10" />
                <div className="border border-white/10 flex items-center justify-center">
                  <span className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded">
                    Align {angle}
                  </span>
                </div>
                <div className="border border-white/10" />
                <div className="border border-white/10" />
                <div className="border border-white/10" />
                <div className="border border-white/10" />
              </div>
            </>
          ) : (
            <div className="text-center p-4">
              <Camera className="w-10 h-10 text-slate-500 mx-auto mb-2 animate-pulse" />
              <p className="text-xs text-slate-300">
                {cameraError || "Initializing camera..."}
              </p>
            </div>
          )}

          {/* Timestamp watermarking badge */}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white px-2 py-0.5 rounded">
            {photoType.toUpperCase()} • {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-2">
          {!capturedImage ? (
            <div className="space-y-2">
              {cameraActive && (
                <button
                  type="button"
                  onClick={snapPhoto}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <Camera className="w-5 h-5" />
                  <span>Capture Photo</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className="py-2 px-3 border border-slate-300 hover:bg-slate-50 rounded-xl cursor-pointer text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 text-center">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleUseSample}
                  className="py-2 px-3 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span>Demo High-Res</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Save This Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  startCamera();
                }}
                className="w-full py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake / Reshoot (Blurry/Bad Light)</span>
              </button>
            </div>
          )}
        </div>

        {photoType === "before" && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Insurance Protection:</strong> These photos prove pre-existing scratches/dents so no damage is mistakenly attributed to your wash team.
            </span>
          </div>
        )}
      </div>
    </UiDialog>
  );
}
