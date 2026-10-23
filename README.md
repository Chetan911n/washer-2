# 🚗 App Washer — Doorstep Multi-Car Wash Platform

> **Doorstep car cleaning with multi-car slot booking, mandatory insurance photo verification, WhatsApp after-photo delivery, instant UPI payment automation, and partner reviews.**

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Lucide Icons** — ready for one-click deployment to **Vercel** and native camera support on mobile browsers.

---

## 🌟 Key Features & Workflow

### 1. 🔐 Multi-Channel Login & Profile
- **Phone Number & OTP** login (with pre-filled `123456` one-tap test code).
- **Google Connection** and **Email & Password** options.
- Profile management with multi-car garage (Hatchback, Compact SUV, Sedan, SUV, Luxury) and saved address/parking spots (e.g., *Basement 2, Pillar #45*).

### 2. 📅 Multi-Car Slot Booking
- Select preferred date and time slot (e.g. *06:30 AM - 08:30 AM*).
- **Multi-car selection**: Choose 1, 2, or unlimited cars from your garage in a single booking.
- **In-line "Add New Car"**: Add a vehicle on the fly without interrupting the booking.
- Dynamic pricing breakdown based on car type (Hatchback ₹299, Sedan ₹449, SUV ₹549).

### 3. 🛡️ Washer Partner Portal & Insurance Inspection
- Dual-role switch at the top navigation bar to test both **Customer** and **Washer** apps in real time.
- **Mandatory "Before Photos"**: Washer must document Front, Rear, Left Side, Right Side, and Pre-existing Scratch spots before starting. This guarantees liability protection against pre-existing vehicle damages.
- Real camera capture (`navigator.mediaDevices.getUserMedia`) or high-resolution sample photos.
- **"After Photos" with Retake Option**: High-definition clean car photos. Directly beside **"Complete Job"**, there is an explicit **"Retake Photos"** button if any photo is blurry or dimly lit.

### 4. 📲 WhatsApp Photo Delivery & Real-Time Sync
- When the washer clicks **"Complete Job"**, the after-photos summary and verification report are prepared for dispatch to the customer's WhatsApp.
- Instantly transmits a real-time event that pops up the payment sheet on the customer's device.

### 5. ⚡ UPI Payment Automation (UPI Only)
- Direct **UPI Intent links** for instant 1-tap payment via **Google Pay**, **PhonePe**, **Paytm**, and any BHIM UPI app (`upi://pay`).
- Dynamic scan & pay **UPI QR Code** for desktop or alternate phone payments.
- Real-time payment verification with celebratory confetti and automated order status transition.

### 6. ⭐ Washer Review & Rating
- Automatically opens upon UPI payment confirmation.
- Interactive 1–5 Star rating.
- Compliment badges: *"Crystal Clean Wheels"*, *"Zero Scratches"*, *"Spotless Glass"*, *"On-Time Arrival"*.
- Feedback notes and washer tipping (₹20, ₹50, ₹100).

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Open in browser
# Visit http://localhost:3000
```

---

## 📦 Deploying to GitHub & Vercel

### Step 1: Push to your GitHub Repository
```bash
# In the project directory:
git add .
git commit -m "Initial commit: App Washer complete doorstep platform"

# Create a new repository on GitHub (e.g. https://github.com/<your-username>/app-washer)
git remote add origin https://github.com/<your-username>/app-washer.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New"** > **"Project"**.
3. Import your **`app-washer`** GitHub repository.
4. Framework preset will automatically detect **Next.js**.
5. Click **"Deploy"**!
6. Your live web app will be accessible worldwide on `https://app-washer.vercel.app` (or custom domain).

---

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript 5.8
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Animations & Effects**: Canvas Confetti
- **Standards & Best Practices**: Modern Web Guidance for accessible `<dialog closedby="any">` light-dismiss modals.
