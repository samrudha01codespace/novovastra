"use client";

import { useState } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { BuyCreditsModal } from "@/components/credits/BuyCreditsModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, ArrowRight } from "lucide-react";
import { CREDIT_PLANS } from "@/lib/razorpay";
import { AI_MODELS } from "@/lib/ai";

const MODEL_ICONS = {
  imagen_fast: Zap,
  nano_banana: Sparkles,
  nano_banana_pro: Crown,
};

export default function PricingPage() {
  const [buyOpen, setBuyOpen] = useState(false);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h1 className="font-[var(--font-heading)] text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Choose Your <span className="text-gradient">AI Model</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Different models for different needs. Pick the quality level that fits your vision.
            </p>
          </div>

          {/* Model Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {(Object.entries(AI_MODELS) as [string, typeof AI_MODELS[keyof typeof AI_MODELS]][]).map(([key, model], i) => {
              const Icon = MODEL_ICONS[key as keyof typeof MODEL_ICONS] || Sparkles;
              const isPopular = i === 1;

              return (
                <div
                  key={key}
                  className={`relative rounded-2xl p-[1px] ${
                    isPopular ? "gold-gradient" : "bg-border"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="gold-gradient text-white text-xs px-3">Most Popular</Badge>
                    </div>
                  )}
                  <div className={`glass-card rounded-2xl p-6 h-full ${isPopular ? "ring-1 ring-gold/20" : ""}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isPopular ? "gold-gradient" : "bg-muted"
                      }`}>
                        <Icon className={`w-5 h-5 ${isPopular ? "text-white" : "text-gold"}`} />
                      </div>
                      <div>
                        <h3 className="font-[var(--font-heading)] text-lg font-bold">{model.name}</h3>
                        <p className="text-xs text-muted-foreground">{model.description}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gold">{model.credits}</span>
                        <span className="text-sm text-muted-foreground">credit{model.credits > 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">per generation</p>
                    </div>

                    <ul className="space-y-2.5 mb-6">
                      {[
                        "Photorealistic output",
                        key === "nano_banana_pro" ? "4K resolution" : "1K resolution",
                        key === "imagen_fast" ? "Fastest generation" : "Standard speed",
                      ].map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gold shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => setBuyOpen(true)}
                      className={`w-full cursor-pointer ${isPopular ? "gold-gradient text-white" : ""}`}
                      variant={isPopular ? "default" : "outline"}
                    >
                      Get Started
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Credit Packs */}
          <div className="text-center mb-8">
            <h3 className="font-[var(--font-heading)] text-xl font-bold mb-2">Credit Packs</h3>
            <p className="text-sm text-muted-foreground">Buy credits once, use them anytime. No expiry.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {CREDIT_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setBuyOpen(true)}
                className="glass-card rounded-xl p-5 text-left hover:shadow-lg transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-[var(--font-heading)] text-lg font-bold">{plan.label}</span>
                  {plan.badge && (
                    <Badge variant="secondary" className="text-xs">{plan.badge}</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-gold">{plan.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{(plan.amount / plan.credits / 100).toFixed(2)} per credit
                </p>
              </button>
            ))}
          </div>

          {/* How It Works */}
          <div className="mt-20 text-center">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="font-[var(--font-heading)] text-2xl font-bold mb-8">
              Three Simple Steps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {[
                { step: "1", title: "Buy Credits", desc: "Choose a pack and pay securely via Razorpay" },
                { step: "2", title: "Upload Saree", desc: "Take a photo of your vintage saree" },
                { step: "3", title: "Get Designs", desc: "AI generates modern designs from your fabric" },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-12">
            Payments powered by Razorpay. Secure checkout.
          </p>
        </div>
      </main>
      <Footer />
      <BuyCreditsModal open={buyOpen} onOpenChange={setBuyOpen} />
    </>
  );
}
