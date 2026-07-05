import { NextRequest, NextResponse } from "next/server";
import { getRTDB } from "@/lib/firebase";
import { ref, set, get } from "firebase/database";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const { inquiryId, amount, expiresInHours = 24 } = await request.json();

    if (!inquiryId || !amount) {
      return NextResponse.json(
        { error: "Missing inquiryId or amount" },
        { status: 400 }
      );
    }

    const db = getRTDB();

    // Verify inquiry exists
    const inquiryRef = ref(db, `inquiries/${inquiryId}`);
    const inquirySnap = await get(inquiryRef);
    if (!inquirySnap.exists()) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 }
      );
    }

    const inquiry = inquirySnap.val();

    // Generate token
    const token = nanoid(32);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    // Save payment token to RTDB
    const paymentRef = ref(db, `payments/${token}`);
    await set(paymentRef, {
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
