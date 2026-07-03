"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface GenerationProgressProps {
  progress: number;
  currentStyle: string;
}

export function GenerationProgress({ progress, currentStyle }: GenerationProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="mb-6"
      >
        <Loader2 className="w-12 h-12 text-gold" />
      </motion.div>

      <h3 className="font-[var(--font-heading)] text-xl font-semibold mb-2">
        Creating Your Design
      </h3>
      <p className="text-muted-foreground mb-6">
        AI is transforming your saree into a {currentStyle}...
      </p>

      <div className="w-full max-w-xs">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-gold">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full gold-gradient rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        {["Analyzing fabric", "Generating design", "Rendering output"].map(
          (step, i) => (
            <div
              key={step}
              className={`text-xs px-3 py-2 rounded-lg ${
                progress > (i + 1) * 33
                  ? "bg-gold/10 text-gold"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step}
            </div>
          )
        )}
      </div>
    </div>
  );
}
