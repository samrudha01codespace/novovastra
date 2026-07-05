"use client";

import { motion } from "framer-motion";
import { Upload, Scissors, Shirt } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

const steps = [
  {
    icon: Upload,
    title: "Upload & Choose Design",
    description:
      "Take a photo of your vintage saree, upload it, and pick the dress style you love — gown, lehenga, fusion wear, and more.",
    step: "01",
  },
  {
    icon: Scissors,
    title: "Discuss & Confirm",
    description:
      "We review your saree and design, discuss details over WhatsApp, and confirm your order with a quote.",
    step: "02",
  },
  {
    icon: Shirt,
    title: "We Transform & Deliver",
    description:
      "Send us your saree via post. Our artisans craft your dream dress and deliver it back to your doorstep.",
    step: "03",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 1, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-[var(--font-heading)] text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Three simple steps to transform your heritage into a modern masterpiece.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <GlassCard key={step.step} delay={index * 0.15} className="relative">
              <div className="absolute top-4 right-4 font-[var(--font-heading)] text-5xl font-bold text-primary/20">
                {step.step}
              </div>
              <div className="w-14 h-14 rounded-xl gold-gradient flex items-center justify-center mb-5">
                <step.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-[var(--font-heading)] text-xl font-semibold mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
