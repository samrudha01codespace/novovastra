"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, notFound } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, Clock, AlertCircle, Phone } from "lucide-react";

interface RazorpayPaymentOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  theme: { color: string };
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface PaymentData {
  token: string;
  amount: number;
  customerName: string;
  style: string;
  sareeImageUrl: string;
  designImageUrl: string;
  expiresAt: string;
  status: string;
}

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    notFound();
  }

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchPayment = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`/api/payments/${token}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.expired) setExpired(true);
        if (data.paid) setPaid(true);
        throw new Error(data.error);
      }

      setPayment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  const handlePay = async () => {
    if (!token || processing) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "NovaVstra",
        description: `Payment for ${payment?.style || "dress transformation"}`,
        order_id: data.orderId,
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            await fetch("/api/payments/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
              }),
            });
            setPaid(true);
          } catch {
            // Payment succeeded but update failed — still shows success to user
          }
        },
        prefill: {},
        theme: { color: "#722F37" },
      };

      const rzp = new window.Razorpay(options as RazorpayPaymentOptions & { prefill: { email?: string } });
      rzp.on("payment.failed", (response: { error?: { description: string } }) => {
        alert(response.error?.description ?? "Payment failed");
      });
      rzp.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start payment");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="glass-card border-0 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="font-[var(--font-heading)] text-2xl font-bold">
              {expired ? "Link Expired" : paid ? "Already Paid" : "Invalid Link"}
            </h1>
            <p className="text-muted-foreground">
              {expired
                ? "This payment link has expired. Please request a new one."
                : paid
                ? "This payment has already been completed."
                : error}
            </p>
            {(expired || paid) && (
              <a href="tel:+919558397481">
                <Button variant="outline" className="mt-4 cursor-pointer">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Us
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="glass-card border-0 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h1 className="font-[var(--font-heading)] text-2xl font-bold">
              Payment Successful!
            </h1>
            <p className="text-muted-foreground">
              Thank you, {payment?.customerName}. Your payment has been received.
              We will start working on your dress shortly.
            </p>
            <a href="tel:+919558397481">
              <Button variant="outline" className="mt-4 cursor-pointer">
                <Phone className="w-4 h-4 mr-2" />
                Call Us
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Card className="glass-card border-0 max-w-lg w-full">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h1 className="font-[var(--font-heading)] text-2xl font-bold mb-1">
                Complete Your Payment
              </h1>
              <p className="text-muted-foreground text-sm">
                {payment?.customerName}, pay for your dress transformation
              </p>
            </div>

            {/* Images */}
            <div className="flex gap-3">
              {payment?.sareeImageUrl && (
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1 text-center">Your Saree</div>
                  <div className="relative h-32 rounded-lg overflow-hidden">
                    <Image
                      src={payment.sareeImageUrl}
                      alt="Saree"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-white text-sm">
                  →
                </div>
              </div>
              {payment?.designImageUrl && (
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1 text-center">Design</div>
                  <div className="relative h-32 rounded-lg overflow-hidden">
                    <Image
                      src={payment.designImageUrl}
                      alt="Design"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="text-center p-4 rounded-xl bg-gold/10 border border-gold/20">
              <div className="text-sm text-muted-foreground mb-1">Amount to Pay</div>
              <div className="font-[var(--font-heading)] text-3xl font-bold text-gold-dark">
                ₹{(payment?.amount ?? 0) / 100}
              </div>
            </div>

            {/* Expiry */}
            {payment?.expiresAt && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Expires: {new Date(payment.expiresAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {/* Pay Button */}
            <Button
              onClick={handlePay}
              disabled={processing}
              className="w-full gold-gradient text-white cursor-pointer py-6 text-lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₹${(payment?.amount ?? 0) / 100}`
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Secure payment powered by Razorpay
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}
