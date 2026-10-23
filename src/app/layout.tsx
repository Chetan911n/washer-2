import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Washer — Doorstep Multi-Car Wash & UPI Payment",
  description:
    "Doorstep car wash booking with multi-car slots, insurance before-photos, WhatsApp delivery, automated UPI payments, and washer reviews.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
