"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function CreditBadge() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits);
        }
      } catch {
        // silent
      }
    };

    fetchCredits();
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || credits === null) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20">
      <Coins className="w-3.5 h-3.5 text-gold" />
      <span className="text-sm font-medium text-gold">{credits}</span>
    </div>
  );
}
