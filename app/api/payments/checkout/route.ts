import { NextRequest, NextResponse } from "next/server";
import { getRTDB } from "@/lib/firebase";
import { ref, get } from "firebase/database";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const db = getRTDB();
    const paymentRef = ref(db, `payments/${token}`);
    const snapshot = await get(paymentRef);

    if (!snapshot.exists()) {
      return NextResponse.json({ error: "Invalid payment link" }, { status: 404 });
    }

    const payment = snapshot.val();

    if (payment.status === "paid") {
      return NextResponse.json({ error: "Already paid" }, { status: 409 });
    }

    if (new Date(payment.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials missing");
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: payment.amount,
        currency: "INR",
        receipt: `pay_${token.slice(0, 12)}_${Date.now()}`,
        notes: {
          token,
          inquiryId: payment.inquiryId || "",
        },
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error("Razorpay order failed:", errText);
      throw new Error("Razorpay returned an error");
    }

    const order = await orderRes.json();

    return NextResponse.json({
      orderId: order.id,
      amount: payment.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error("Payment checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
