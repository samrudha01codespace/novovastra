"use client";

import { useState } from "react";
import Script from "next/script";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { CREDIT_PLANS, type CreditPlanId } from "@/lib/razorpay";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: { email?: string };
  theme: { color: string };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description: string } }) => void) => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export function BuyCreditsModal({ open, onOpenChange }: BuyCreditsModalProps) {
  const [loading, setLoading] = useState<CreditPlanId | null>(null);
  const { user } = useAuth();

  const handleBuy = async (planId: CreditPlanId) => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    setLoading(planId);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const options: RazorpayOptions = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "NovaVstra",
        description: `Buy ${CREDIT_PLANS.find((p) => p.id === planId)?.label}`,
        order_id: data.orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            toast.success("Credits added successfully!");
            onOpenChange(false);
            window.dispatchEvent(new Event("credits-updated"));
          } catch {
            toast.error("Payment verified but credits may be delayed");
          }
        },
        prefill: { email: user.email ?? undefined },
        theme: { color: "#A16207" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: { error?: { description: string } }) => {
        toast.error(response.error?.description ?? "Payment failed");
      });
      rzp.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-0">
        <DialogHeader>
          <DialogTitle className="font-[var(--font-heading)] text-xl">
            Buy Credits
          </DialogTitle>
          <DialogDescription>
            Each credit generates 1 dress design. Choose a plan below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {CREDIT_PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handleBuy(plan.id)}
              disabled={loading !== null}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-border hover:border-gold/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-white font-bold text-sm">
                  {plan.credits}
                </div>
                <div className="text-left">
                  <div className="font-medium">{plan.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {plan.credits === 1 ? "₹2.99 each" : `₹${(plan.amount / plan.credits / 100).toFixed(2)} each`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {plan.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {plan.badge}
                  </Badge>
                )}
                <span className="font-semibold text-lg">{plan.price}</span>
                {loading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Razorpay. Secure payment processing.
        </p>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </DialogContent>
    </Dialog>
  );
}
