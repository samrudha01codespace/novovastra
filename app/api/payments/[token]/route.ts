import { NextRequest, NextResponse } from "next/server";
import { getRTDB } from "@/lib/firebase";
import { ref, get, update } from "firebase/database";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const db = getRTDB();
    const paymentRef = ref(db, `payments/${token}`);
    const snapshot = await get(paymentRef);

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: "Invalid payment link" },
        { status: 404 }
      );
    }

    const payment = snapshot.val();

    // Check if expired
    if (new Date(payment.expiresAt) < new Date()) {
      await update(paymentRef, { status: "expired" });
      return NextResponse.json(
        { error: "This payment link has expired", expired: true },
        { status: 410 }
      );
    }

    // Check if already paid
    if (payment.status === "paid") {
      return NextResponse.json(
        { error: "This payment has already been completed", paid: true },
        { status: 409 }
      );
    }

    return NextResponse.json({
      token: payment.token,
      amount: payment.amount,
      customerName: payment.customerName,
      style: payment.style,
      sareeImageUrl: payment.sareeImageUrl,
      designImageUrl: payment.designImageUrl,
      expiresAt: payment.expiresAt,
      status: payment.status,
    });
  } catch (error) {
    console.error("Fetch payment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment details" },
      { status: 500 }
    );
  }
}
