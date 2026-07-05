"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { GlassCard } from "@/components/shared/GlassCard";
import { R2_BASE_URL } from "@/lib/config";
import galleryFallback from "@/data/gallery.json";

interface GalleryItem {
  before: string;
  after: string;
  description: string;
  beforeImage: string;
  afterImage: string;
}

export function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>(galleryFallback);

  useEffect(() => {
    if (!R2_BASE_URL) return;

    fetch(`${R2_BASE_URL}/gallery.json`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch");
      })
      .then((data: GalleryItem[]) => setItems(data))
      .catch(() => {
        // fallback already set
      });
  }, []);

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
            Our <span className="text-gradient">Transformations</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how vintage sarees become modern masterpieces. Every design
            preserves the soul of the original fabric.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {items.map((item, index) => (
            <GlassCard key={item.before} delay={index * 0.1}>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 p-4 rounded-xl bg-muted/50 text-center">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Before
                  </div>
                  {item.beforeImage ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden mb-2">
                      <Image
                        src={item.beforeImage}
                        alt={item.before}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : null}
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
                  {item.afterImage ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden mb-2">
                      <Image
                        src={item.afterImage}
                        alt={item.after}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : null}
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
