import { NextRequest, NextResponse } from "next/server";

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export async function POST(request: NextRequest) {
  try {
    const { token, razorpayOrderId, razorpayPaymentId } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Missing payment token" },
        { status: 400 }
      );
    }

    if (!RTDB_URL) {
      return NextResponse.json(
        { error: "Firebase RTDB not configured" },
        { status: 500 }
      );
    }

    const snapRes = await fetch(`${RTDB_URL}/payments/${token}.json`);
    const payment = await snapRes.json();

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    if (payment.status === "paid") {
      return NextResponse.json(
        { error: "Already paid" },
        { status: 409 }
      );
    }

    await fetch(`${RTDB_URL}/payments/${token}.json`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "paid",
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId: razorpayPaymentId || null,
        paidAt: new Date().toISOString(),
      }),
    });

    if (payment.inquiryId) {
      await fetch(`${RTDB_URL}/inquiries/${payment.inquiryId}.json`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "paid",
          paymentToken: token,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update payment error:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
