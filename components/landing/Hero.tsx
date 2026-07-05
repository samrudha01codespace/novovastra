"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Shirt, Shield, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const trustBadges = [
  { icon: Shirt, label: "All Types of Sarees" },
  { icon: Shield, label: "Secure Payment" },
  { icon: Sparkles, label: "Custom Stitched" },
  { icon: Star, label: "100% Quality" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />

      <div className="absolute top-20 left-10 w-72 h-72 bg-gold/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl animate-float-delayed" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 mb-8"
        >
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-primary-foreground/90">
            Heritage Fashion, Reimagined
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="font-[var(--font-heading)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-primary-foreground"
        >
          Your Heritage,
          <br />
          <span className="text-gold">Reimagined</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Our expert artisans transform your vintage saree into a bespoke modern garment.
          Upload your heritage fabric and let us craft your dream design.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/visualize">
            <Button size="lg" className="bg-gold hover:bg-gold-dark text-primary px-8 py-6 text-lg group cursor-pointer font-semibold">
              Start Your Order
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Button>
          </Link>
          <Link href="/heritage">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-6 text-lg border-gold/50 text-gold hover:bg-gold/10 cursor-pointer"
            >
              Our Heritage
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto"
        >
          {[
            { value: "500+", label: "Sarees Transformed" },
            { value: "98%", label: "Client Satisfaction" },
            { value: "100%", label: "Artisan Crafted" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-[var(--font-heading)] text-2xl md:text-3xl font-bold text-gold">
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-primary-foreground/60 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Trust Badges Strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="absolute bottom-0 left-0 right-0 bg-primary-foreground/10 backdrop-blur-sm border-t border-primary-foreground/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustBadges.map((badge) => (
              <div key={badge.label} className="flex items-center justify-center gap-2 text-primary-foreground/80">
                <badge.icon className="w-5 h-5 text-gold" />
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
