import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

const RTDB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

export async function POST(request: NextRequest) {
  try {
    const { inquiryId, amount, expiresInHours = 24 } = await request.json();

    if (!inquiryId || !amount) {
      return NextResponse.json(
        { error: "Missing inquiryId or amount" },
        { status: 400 }
      );
    }

    if (!RTDB_URL) {
      return NextResponse.json(
        { error: "Firebase RTDB not configured" },
        { status: 500 }
      );
    }

    // Verify inquiry exists
    const inquirySnapRes = await fetch(`${RTDB_URL}/inquiries/${inquiryId}.json`);
    const inquiry = await inquirySnapRes.json();

    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 }
      );
    }

    // Generate token
    const token = nanoid(32);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    // Save payment token to RTDB
    await fetch(`${RTDB_URL}/payments/${token}.json`, {
      method: "PUT",
      body: JSON.stringify({
        token,
        inquiryId,
        amount: Number(amount),
        status: "pending",
        customerName: inquiry.name,
        customerPhone: inquiry.phone,
        style: inquiry.style,
        sareeImageUrl: inquiry.sareeImageUrl,
        designImageUrl: inquiry.designImageUrl,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }),
    });

    return NextResponse.json({
      success: true,
      token,
      paymentUrl: `https://novavastra.samrudhakshirsagar.tech/payment?token=${token}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
