import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Washer — Doorstep Multi-Car Wash & Partner Hub",
  description:
    "Doorstep car wash booking with multi-car slots, insurance before-photos, WhatsApp delivery, automated UPI payments, station head dispatch, and washer reviews.",
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
      <body className="min-h-screen bg-[#F7F8F7] text-[#171A19] antialiased selection:bg-[#07865B] selection:text-white">
        {children}
      </body>
    </html>
  );
}
