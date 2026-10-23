"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface UiDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function UiDialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: UiDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Handle close event triggered by Esc or close()
    const handleClose = () => {
      onClose();
    };
    dialog.addEventListener("close", handleClose);

    // Fallback for browsers without native closedby="any" support
    const handleBackdropClick = (event: MouseEvent) => {
      if (!("closedBy" in HTMLDialogElement.prototype)) {
        if (event.target !== dialog) return;

        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (!isDialogContent) {
          dialog.close();
        }
      }
    };

    dialog.addEventListener("click", handleBackdropClick);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleBackdropClick);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      // @ts-expect-error closedby is a modern HTML attribute supported in modern browsers
      closedby="any"
      aria-labelledby={title ? "dialog-title" : undefined}
      className={`fixed inset-0 m-auto z-50 p-0 rounded-2xl bg-white shadow-2xl border border-slate-200 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm w-[92vw] ${maxWidth} overflow-hidden transition-all animate-in fade-in-0 zoom-in-95 duration-200`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        {title ? (
          <h2 id="dialog-title" className="text-lg font-bold text-slate-800">
            {title}
          </h2>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-5 max-h-[82vh] overflow-y-auto">{children}</div>
    </dialog>
  );
}
