"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { UploadZone } from "@/components/visualize/UploadZone";
import { GenerationProgress } from "@/components/visualize/GenerationProgress";
import { DesignGrid } from "@/components/visualize/DesignGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuyCreditsModal } from "@/components/credits/BuyCreditsModal";
import { useAuth } from "@/hooks/useAuth";
import { STYLE_PROMPTS, type StyleKey } from "@/lib/ai";
import { CREDIT_PLANS } from "@/lib/razorpay";
import { ArrowRight, Sparkles, Coins, Lock, Check } from "lucide-react";
import { toast } from "sonner";

type Stage = "upload" | "style" | "generating" | "results";

interface Design {
  id: string;
  style: string;
  imageData: string;
  mimeType: string;
}

const styleOptions: { key: StyleKey; label: string; description: string }[] = [
  { key: "gown", label: "Evening Gown", description: "Flowing, elegant, floor-length" },
  { key: "cocktail", label: "Cocktail Dress", description: "Sleek, modern, knee-length" },
  { key: "fusion", label: "Saree-Dress Fusion", description: "Best of both worlds" },
  { key: "lehenga", label: "Modern Lehenga", description: "Contemporary traditional" },
  { key: "jumpsuit", label: "Silk Jumpsuit", description: "Bold, draped, statement" },
  { key: "shift", label: "Shift Dress", description: "Minimalist, clean lines" },
];

export default function VisualizePage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<StyleKey[]>(["gown", "cocktail", "fusion", "lehenga"]);
  const [progress, setProgress] = useState(0);
  const [currentStyle, setCurrentStyle] = useState("");
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);

  const { user, refreshSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        const sessionReady = await refreshSession();
        if (!sessionReady) return;

        let res = await fetch("/api/credits", { signal: controller.signal });

        if (res.status === 401) {
          const refreshed = await refreshSession();
          if (refreshed) {
            res = await fetch("/api/credits", { signal: controller.signal });
          }
        }

        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits);
        }
      } catch {
        // silent
      }
    };

    load();
    const interval = setInterval(load, 30000);

    const handler = () => load();
    window.addEventListener("credits-updated", handler);

    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("credits-updated", handler);
    };
  }, [user]);

  const handleUpload = useCallback((_file: File, previewUrl: string) => {
    setPreview(previewUrl);
    setStage("style");
  }, []);

  const toggleStyle = (key: StyleKey) => {
    setSelectedStyles((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleGenerate = async () => {
    if (!preview || selectedStyles.length === 0) return;

    if (!user) {
      toast.error("Please sign in to generate designs");
      router.push("/login");
      return;
    }

    if (credits === null || credits < selectedStyles.length) {
      setBuyOpen(true);
      return;
    }

    setStage("generating");
    setProgress(0);

    const base64 = preview.split(",")[1];
    const results: Design[] = [];

    for (let i = 0; i < selectedStyles.length; i++) {
      const style = selectedStyles[i];
      setCurrentStyle(STYLE_PROMPTS[style]);
      setProgress(((i + 0.5) / selectedStyles.length) * 100);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, style }),
        });

        const data = await response.json();

        if (response.status === 402) {
          toast.error("Insufficient credits. Please buy more.");
          setCredits(data.remaining ?? 0);
          setBuyOpen(true);
          setStage("style");
          return;
        }

        if (data.images && data.images.length > 0) {
          results.push({
            id: `${style}-${Date.now()}`,
            style,
            imageData: data.images[0].data,
            mimeType: data.images[0].mimeType,
          });
          if (data.remaining !== undefined) setCredits(data.remaining);
        } else if (data.error) {
          toast.error(data.error);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (msg.includes("429")) {
          toast.error("Rate limited. Waiting 30s before next request...");
          await new Promise((r) => setTimeout(r, 30000));
        } else {
          toast.error(`Failed to generate ${STYLE_PROMPTS[style]}`);
        }
      }

      setProgress(((i + 1) / selectedStyles.length) * 100);

      if (i < selectedStyles.length - 1) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    setDesigns(results);
    setStage("results");

    if (results.length > 0) {
      toast.success(`Generated ${results.length} designs!`);
    } else {
      toast.error("No designs were generated. Please try again.");
    }
  };

  const handleSelect = (design: Design) => {
    setSelectedDesign(design);
    toast.success(`${STYLE_PROMPTS[design.style as StyleKey] || design.style} selected!`);
  };

  const handleRegenerate = () => {
    setDesigns([]);
    setSelectedDesign(null);
    setStage("style");
  };

  const hasEnoughCredits = credits !== null && credits >= selectedStyles.length;
  const cost = selectedStyles.length;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-[var(--font-heading)] text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Visualize Your <span className="text-gradient">Heritage</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Upload your vintage saree and let AI transform it into a modern masterpiece.
            </p>
          </div>

          {stage === "upload" && (
            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <UploadZone onUpload={handleUpload} />
                {!user && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    <button
                      onClick={() => router.push("/login")}
                      className="text-gold hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>{" "}
                    to save your designs and access them later.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {stage === "style" && (
            <div className="space-y-6">
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle className="font-[var(--font-heading)] text-xl flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gold" />
                    Choose Your Styles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {preview && (
                    <div className="w-full h-48 rounded-xl overflow-hidden mb-4">
                      <img
                        src={preview}
                        alt="Uploaded saree"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {styleOptions.map((style) => (
                      <button
                        key={style.key}
                        onClick={() => toggleStyle(style.key)}
                        className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          selectedStyles.includes(style.key)
                            ? "border-gold bg-gold/5"
                            : "border-border hover:border-gold/30"
                        }`}
                      >
                        <div className="font-medium text-sm">{style.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {style.description}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStage("upload")}
                      className="cursor-pointer"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={selectedStyles.length === 0}
                      className="flex-1 gold-gradient text-white cursor-pointer"
                    >
                      {hasEnoughCredits ? (
                        <>
                          Generate {selectedStyles.length} Design{selectedStyles.length > 1 ? "s" : ""}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Buy Credits to Generate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Card */}
              <Card className="glass-card border-0">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
                      <Coins className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-[var(--font-heading)] text-lg font-semibold">
                        Pay Per Generation
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Each style costs 1 credit
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {CREDIT_PLANS.map((plan) => (
                      <div
                        key={plan.id}
                        className={`p-3 rounded-xl border text-center ${
                          cost <= plan.credits
                            ? "border-gold/30 bg-gold/5"
                            : "border-border"
                        }`}
                      >
                        <div className="font-bold text-lg">{plan.credits}</div>
                        <div className="text-xs text-muted-foreground">credits</div>
                        <div className="font-semibold text-gold mt-1">{plan.price}</div>
                        {plan.badge && (
                          <div className="text-xs text-gold mt-1">{plan.badge}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!user ? (
                    <Button
                      onClick={() => router.push("/login")}
                      className="w-full gold-gradient text-white cursor-pointer"
                    >
                      Sign In to Buy Credits
                    </Button>
                  ) : !hasEnoughCredits ? (
                    <Button
                      onClick={() => setBuyOpen(true)}
                      className="w-full gold-gradient text-white cursor-pointer"
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      Buy {cost} Credit{cost > 1 ? "s" : ""} — {CREDIT_PLANS.find(p => p.credits >= cost)?.price || "₹2.99"}
                    </Button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
                      <Check className="w-4 h-4" />
                      You have {credits} credits — ready to generate!
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {stage === "generating" && (
            <Card className="glass-card border-0">
              <CardContent className="p-6">
                <GenerationProgress progress={progress} currentStyle={currentStyle} />
              </CardContent>
            </Card>
          )}

          {stage === "results" && (
            <div className="space-y-6">
              <DesignGrid
                designs={designs}
                onSelect={handleSelect}
                onRegenerate={handleRegenerate}
                selectedId={selectedDesign?.id}
              />

              {selectedDesign && (
                <Card className="glass-card border-0">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1">
                        <h3 className="font-[var(--font-heading)] text-lg font-semibold">
                          Ready to create your garment?
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Contact us with your selected design and we will bring it to life.
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push("/contact")}
                        className="gold-gradient text-white cursor-pointer"
                      >
                        Contact Us
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <BuyCreditsModal open={buyOpen} onOpenChange={setBuyOpen} />
    </>
  );
}
