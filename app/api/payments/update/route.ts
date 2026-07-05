import { NextRequest, NextResponse } from "next/server";
import { getRTDB } from "@/lib/firebase";
import { ref, get, update } from "firebase/database";

export async function POST(request: NextRequest) {
  try {
    const { token, razorpayOrderId, razorpayPaymentId } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Missing payment token" },
        { status: 400 }
      );
    }

    const db = getRTDB();
    const paymentRef = ref(db, `payments/${token}`);
    const snapshot = await get(paymentRef);

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const payment = snapshot.val();

    if (payment.status === "paid") {
      return NextResponse.json(
        { error: "Already paid" },
        { status: 409 }
      );
    }

    // Update payment status
    await update(paymentRef, {
      status: "paid",
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      paidAt: new Date().toISOString(),
    });

    // Update inquiry status if linked
    if (payment.inquiryId) {
      const inquiryRef = ref(db, `inquiries/${payment.inquiryId}`);
      await update(inquiryRef, {
        status: "paid",
        paymentToken: token,
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
