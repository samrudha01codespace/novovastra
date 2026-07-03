"use client";

import { Coins, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InsufficientCreditsProps {
  required: number;
  current: number;
  onBuyCredits: () => void;
}

export function InsufficientCredits({ required, current, onBuyCredits }: InsufficientCreditsProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
        <Coins className="w-8 h-8 text-gold" />
      </div>
      <div>
        <h3 className="font-[var(--font-heading)] text-xl font-semibold">
          Insufficient Credits
        </h3>
        <p className="text-muted-foreground mt-1">
          You need {required} credit{required > 1 ? "s" : ""} but only have {current}.
        </p>
      </div>
      <Button onClick={onBuyCredits} className="gold-gradient text-white cursor-pointer">
        Buy Credits
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
