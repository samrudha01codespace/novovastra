"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Coins } from "lucide-react";
import { CREDIT_PLANS } from "@/lib/razorpay";

export function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-[var(--font-heading)] text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Simple <span className="text-gradient">Pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Pay per generation. No subscriptions, no hidden fees. Each credit transforms your saree into one modern design.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {CREDIT_PLANS.map((plan, i) => (
            <Card
              key={plan.id}
              className={`glass-card border-0 relative ${
                i === 1 ? "ring-2 ring-gold/50 scale-105" : ""
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gold-gradient text-white">{plan.badge}</Badge>
                </div>
              )}
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto mb-6">
                  <Coins className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-[var(--font-heading)] text-2xl font-bold mb-2">
                  {plan.label}
                </h3>
                <div className="text-3xl font-bold text-gold mb-2">{plan.price}</div>
                <p className="text-sm text-muted-foreground mb-6">
                  ₹{(plan.amount / plan.credits / 100).toFixed(2)} per credit
                </p>
                <ul className="space-y-3 text-left mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-gold" />
                    <span className="text-sm">{plan.credits} AI generation{plan.credits > 1 ? "s" : ""}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-gold" />
                    <span className="text-sm">6 style options</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-gold" />
                    <span className="text-sm">High-resolution output</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-gold" />
                    <span className="text-sm">Download & share</span>
                  </li>
                </ul>
                <Button
                  className={`w-full cursor-pointer ${
                    i === 1 ? "gold-gradient text-white" : ""
                  }`}
                  variant={i === 1 ? "default" : "outline"}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Payments powered by Razorpay. Secure checkout.
        </p>
      </div>
    </section>
  );
}
