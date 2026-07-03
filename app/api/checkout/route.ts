import { NextRequest, NextResponse } from "next/server";
import { CREDIT_PLANS } from "@/lib/razorpay";
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
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: "INR",
        receipt: `credits_${user.uid}_${Date.now()}`,
        notes: {
          uid: user.uid,
          credits: String(plan.credits),
          planId: plan.id,
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
      amount: plan.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
