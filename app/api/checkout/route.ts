import { NextRequest, NextResponse } from "next/server";
import { getRazorpay, CREDIT_PLANS } from "@/lib/razorpay";
import { getServerUser } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();
    const plan = CREDIT_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: "INR",
      receipt: `credits_${user.uid}_${Date.now()}`,
      notes: {
        uid: user.uid,
        credits: String(plan.credits),
        planId: plan.id,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: plan.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
