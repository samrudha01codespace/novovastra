import Razorpay from "razorpay";

let razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (razorpay) return razorpay;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Missing Razorpay credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpay;
}

export const CREDIT_PLANS = [
  { id: "credits_1", credits: 1, amount: 299, label: "1 Credit", price: "₹2.99", badge: "" },
  { id: "credits_5", credits: 5, amount: 999, label: "5 Credits", price: "₹9.99", badge: "Popular" },
  { id: "credits_15", credits: 15, amount: 2499, label: "15 Credits", price: "₹24.99", badge: "Best Value" },
] as const;

export type CreditPlanId = (typeof CREDIT_PLANS)[number]["id"];
