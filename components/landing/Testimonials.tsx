"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Mumbai",
    quote:
      "My grandmother's 40-year-old Kanjivaram saree is now a stunning evening gown I wear to galas. NovaVstra preserved every intricate detail while making it completely modern.",
    rating: 5,
  },
  {
    name: "Ananya Patel",
    location: "Ahmedabad",
    quote:
      "I was skeptical about AI fashion, but the results blew my mind. The AI understood the essence of my mother's Banarasi silk and created a lehenga that makes me cry every time I wear it.",
    rating: 5,
  },
  {
    name: "Meera Krishnan",
    location: "Chennai",
    quote:
      "The 3D visualization sealed the deal. I could see exactly how the saree-dress hybrid would look before committing. The final garment is even better than the preview.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 1, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-[var(--font-heading)] text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Stories of <span className="text-gradient">Transformation</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every saree has a story. Here are some of the women who let us
            rewrite theirs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((item, index) => (
            <GlassCard key={item.name} delay={index * 0.15}>
              <div className="flex gap-1 mb-4">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-gold text-gold"
                  />
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6 italic">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div>
                <div className="font-[var(--font-heading)] font-semibold">
                  {item.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.location}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
