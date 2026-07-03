import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { addCredits } from "@/lib/credits";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const razorpay = (await import("@/lib/razorpay")).getRazorpay();
    const order = await razorpay.orders.fetch(razorpay_order_id);

    const uid = String(order.notes?.uid ?? "");
    const credits = parseInt(String(order.notes?.credits ?? "0"), 10);

    if (!uid || !credits) {
      return NextResponse.json({ error: "Invalid order metadata" }, { status: 400 });
    }

    await addCredits(uid, credits, razorpay_order_id, order.amount as number);

    return NextResponse.json({ success: true, creditsAdded: credits });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
