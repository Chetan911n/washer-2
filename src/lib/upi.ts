export interface UpiPaymentDetails {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionRef: string;
  note: string;
}

export function generateUpiIntentUrl(details: UpiPaymentDetails): string {
  const params = new URLSearchParams({
    pa: details.upiId,
    pn: details.payeeName,
    am: details.amount.toFixed(2),
    cu: "INR",
    tn: details.note,
    tr: details.transactionRef,
  });
  return `upi://pay?${params.toString()}`;
}

export function generateAppSpecificUpiUrls(details: UpiPaymentDetails) {
  const generic = generateUpiIntentUrl(details);
  const query = generic.replace("upi://pay?", "");

  return {
    generic,
    gpay: `tez://upi/pay?${query}`,
    phonepe: `phonepe://pay?${query}`,
    paytm: `paytmmp://pay?${query}`,
  };
}

export function generateWhatsAppMessage(params: {
  customerName: string;
  carNames: string[];
  bookingCode: string;
  washerName: string;
  totalAmount: number;
  photoCount: number;
}): { text: string; url: string } {
  const text = `🚗 *App Washer — Wash Completed!*

Hello *${params.customerName}*,
Your car wash (*${params.bookingCode}*) is successfully completed by *${params.washerName}*!

✨ *Vehicles Washed:* ${params.carNames.join(", ")}
📸 *After-Wash Inspection Photos:* ${params.photoCount} high-resolution photos recorded
💰 *Total Amount:* ₹${params.totalAmount} (UPI Payment)

👉 Tap here to view full before/after insurance photos & pay:
${typeof window !== "undefined" ? window.location.origin : "https://app-washer.vercel.app"}/?booking=${params.bookingCode}&pay=true

Thank you for choosing App Washer! 🌟`;

  const encodedText = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encodedText}`;

  return { text, url };
}
