"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";

const transformations = [
  {
    before: "Vintage Kanjivaram Saree",
    after: "Modern Evening Gown",
    description:
      "Rich gold borders and traditional motifs reimagined as a flowing evening gown with contemporary draping.",
  },
  {
    before: "Banarasi Silk Saree",
    after: "Fusion Lehenga",
    description:
      "Intricate brocade patterns transformed into a modern lehenga with a structured blouse and flowing skirt.",
  },
  {
    before: "Chanderi Cotton Saree",
    after: "Cocktail Dress",
    description:
      "Delicate weave and pastel tones crafted into a sleek cocktail dress with architectural lines.",
  },
  {
    before: "Patola Saree",
    after: "Saree-Dress Hybrid",
    description:
      "Bold geometric patola patterns merged with a modern dress silhouette for a statement piece.",
  },
];

export function Gallery() {
  return (
    <section id="gallery" className="py-24 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 1, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-[var(--font-heading)] text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            AI <span className="text-gradient">Transformations</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how vintage sarees become modern masterpieces. Every design
            preserves the soul of the original fabric.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {transformations.map((item, index) => (
            <GlassCard key={item.before} delay={index * 0.1}>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 p-4 rounded-xl bg-muted/50 text-center">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Before
                  </div>
                  <div className="font-[var(--font-heading)] text-lg font-semibold">
                    {item.before}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-white text-lg">
                    →
                  </div>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-gold/10 text-center">
                  <div className="text-xs uppercase tracking-wider text-gold mb-2">
                    After
                  </div>
                  <div className="font-[var(--font-heading)] text-lg font-semibold text-gold-dark">
                    {item.after}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
