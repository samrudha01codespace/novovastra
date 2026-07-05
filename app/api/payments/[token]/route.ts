import { NextRequest, NextResponse } from "next/server";

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!RTDB_URL) {
      return NextResponse.json(
        { error: "Firebase RTDB not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(`${RTDB_URL}/payments/${token}.json`);
    const payment = await res.json();

    if (!payment) {
      return NextResponse.json(
        { error: "Invalid payment link" },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(payment.expiresAt) < new Date()) {
      await fetch(`${RTDB_URL}/payments/${token}/status.json`, {
        method: "PUT",
        body: JSON.stringify("expired"),
      });
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
