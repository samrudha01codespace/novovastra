"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

interface FeedbackItem {
  id: string;
  name: string;
  quote: string;
  rating: number;
}

export function StoriesOfTransformation() {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    fetch("/api/feedback")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((data: FeedbackItem[]) => setItems(data))
      .catch(() => {});
  }, []);

  if (items.length < 3) return null;

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
          {items.map((item, index) => (
            <GlassCard key={item.id} delay={index * 0.15}>
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
              <div className="font-[var(--font-heading)] font-semibold">
                {item.name}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
