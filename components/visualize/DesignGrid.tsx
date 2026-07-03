"use client";

import { motion } from "framer-motion";
import { Heart, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Design {
  id: string;
  style: string;
  imageData: string;
  mimeType: string;
}

interface DesignGridProps {
  designs: Design[];
  onSelect: (design: Design) => void;
  onRegenerate: () => void;
  selectedId?: string;
}

const styleLabels: Record<string, string> = {
  gown: "Evening Gown",
  lehenga: "Modern Lehenga",
  cocktail: "Cocktail Dress",
  fusion: "Saree-Dress Fusion",
  jumpsuit: "Silk Jumpsuit",
  shift: "Shift Dress",
};

export function DesignGrid({
  designs,
  onSelect,
  onRegenerate,
  selectedId,
}: DesignGridProps) {
  const handleDownload = (design: Design) => {
    const link = document.createElement("a");
    link.href = `data:${design.mimeType};base64,${design.imageData}`;
    link.download = `novovastra-${design.style}.png`;
    link.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-[var(--font-heading)] text-xl font-semibold">
          Your Generated Designs
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          className="cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {designs.map((design, index) => (
          <motion.div
            key={design.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative group rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
              selectedId === design.id
                ? "border-gold shadow-lg shadow-gold/20"
                : "border-border hover:border-gold/50"
            }`}
            onClick={() => onSelect(design)}
          >
            <img
              src={`data:${design.mimeType};base64,${design.imageData}`}
              alt={`${styleLabels[design.style] || design.style} design`}
              className="w-full h-72 sm:h-80 object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
              <div className="flex items-center justify-between">
                <Badge className="bg-gold text-white">
                  {styleLabels[design.style] || design.style}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(design);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0 gold-gradient text-white cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(design);
                    }}
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {selectedId === design.id && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-gold text-white">Selected</Badge>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
