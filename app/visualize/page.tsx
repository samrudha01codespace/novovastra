"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { UploadZone } from "@/components/visualize/UploadZone";
import { DesignGrid } from "@/components/visualize/DesignGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Phone, MessageCircle, Loader2, Plus, X, Box, Keyboard, Sparkles, ImagePlus, Coins, Zap, Crown, Download } from "lucide-react";
import { toast } from "sonner";
import designsData from "@/data/designs.json";
import { useAuth } from "@/hooks/useAuth";
import { BuyCreditsModal } from "@/components/credits/BuyCreditsModal";
import { ImageModal } from "@/components/visualize/ImageModal";

const MannequinViewer = dynamic(
  () => import("@/components/visualize/MannequinViewer").then((m) => m.MannequinViewer),
  { ssr: false, loading: () => <div className="w-full aspect-[4/3] rounded-xl bg-muted/30 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div> }
);

const GenerationProgress = dynamic(
  () => import("@/components/visualize/GenerationProgress").then((m) => m.GenerationProgress),
  { ssr: false }
);

const WHATSAPP_NUMBER = "919558397481";

interface Measurement {
  param: string;
  value: string;
}

interface GeneratedDesign {
  id: string;
  style: string;
  imageData: string;
  mimeType: string;
}

export default function VisualizePage() {
  const { user } = useAuth();
  const [sareePreview, setSareePreview] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string | undefined>();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    notes: "",
  });
  const [measurements, setMeasurements] = useState<Measurement[]>([
    { param: "", value: "" },
  ]);
  const [useManualInput, setUseManualInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [viewingDesign, setViewingDesign] = useState<{ imageData: string; mimeType: string; label: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<"standard" | "premium">("standard");

  const fetchCredits = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/credits", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchCredits();
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSareeUpload = (_file: File, previewUrl: string) => {
    setSareePreview(previewUrl);
  };

  const handleGenerate = async () => {
    if (!sareePreview) {
      toast.error("Please upload a saree photo first");
      return;
    }
    if (!selectedStyle) {
      toast.error("Please select a dress style");
      return;
    }
    if (selectedStyle === "custom" && !customPrompt.trim()) {
      toast.error("Please describe the dress style you want");
      return;
    }
    if (!user) {
      toast.error("Please sign in to generate designs");
      return;
    }
    const creditsNeeded = selectedModel === "premium" ? 3 : 1;
    if (credits !== null && credits < creditsNeeded) {
      setShowBuyCredits(true);
      toast.error(`Insufficient credits. You need ${creditsNeeded} credit(s) for ${selectedModel === "premium" ? "Premium" : "Standard"} quality.`);
      return;
    }

    setGenerating(true);
    setProgress(0);
    setGeneratedDesigns([]);

    const styleLabel = selectedStyle === "custom" ? customPrompt.slice(0, 30) + (customPrompt.length > 30 ? "..." : "") : designsData.find(s => s.key === selectedStyle)?.label || selectedStyle;

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 800);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sareeImageBase64: sareePreview,
          style: selectedStyle,
          customPrompt: selectedStyle === "custom" ? customPrompt.trim() : undefined,
          model: selectedModel,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
          return;
        }
        if (res.status === 402) {
          setShowBuyCredits(true);
          toast.error(`Insufficient credits. You need ${data.creditsNeeded} credit(s).`);
          return;
        }
        throw new Error(data.error || "Failed to generate");
      }

      if (data.images && data.images.length > 0) {
        const designs: GeneratedDesign[] = data.images.map((img: { mimeType: string; data: string }, i: number) => ({
          id: `design-${Date.now()}-${i}`,
          style: selectedStyle,
          imageData: img.data,
          mimeType: img.mimeType,
        }));
        setGeneratedDesigns(designs);
        const creditsUsed = selectedModel === "premium" ? 3 : 1;
        setCredits((prev) => (prev !== null ? prev - creditsUsed : null));
        toast.success(`Generated ${designs.length} ${styleLabel} design(s)!`);
      } else {
        toast.error("No images were generated. Please try again.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Please fill in your name and phone number");
      return;
    }
    if (!selectedStyle) {
      toast.error("Please select a dress style");
      return;
    }
    if (!sareePreview) {
      toast.error("Please upload a saree photo");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          notes: formData.notes,
          style: selectedStyle,
          customPrompt: selectedStyle === "custom" ? customPrompt : undefined,
          measurements: measurements.filter(m => m.param && m.value),
          sareeImage: sareePreview,
          generatedDesign: selectedDesignId ? generatedDesigns.find(d => d.id === selectedDesignId) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      const styleLabel = selectedStyle === "custom" ? customPrompt.slice(0, 30) + (customPrompt.length > 30 ? "..." : "") : designsData.find(s => s.key === selectedStyle)?.label || selectedStyle;
      const measurementText = measurements
        .filter(m => m.param && m.value)
        .map(m => `${m.param}: ${m.value}`)
        .join(", ");
      const message = encodeURIComponent(
        `Hi Sangita, I'm ${formData.name}. I want to transform my saree into a ${styleLabel}.${measurementText ? ` Measurements: ${measurementText}.` : ""}${formData.notes ? ` Notes: ${formData.notes}` : ""}`
      );

      setSubmitted(true);
      toast.success("Inquiry saved! Opening WhatsApp...");
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-[var(--font-heading)] text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Transform Your <span className="text-gradient">Heritage</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Upload your saree and your photo, pick a design, and see yourself in it instantly.
            </p>
            {user && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20">
                  <Coins className="w-4 h-4 text-gold" />
                  <span className="text-sm font-medium text-gold">{credits !== null ? credits : "..."}</span>
                  <span className="text-xs text-gold/70">credits</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBuyCredits(true)}
                  className="text-xs border-gold/30 text-gold hover:bg-gold/10 cursor-pointer"
                >
                  Buy More
                </Button>
              </div>
            )}
          </div>

          {submitted ? (
            <Card className="glass-card border-0">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="font-[var(--font-heading)] text-2xl font-bold mb-2">
                    Inquiry Submitted!
                  </h2>
                  <p className="text-muted-foreground">
                    Thank you, {formData.name}. Please share your saree photo on WhatsApp.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi Sangita, I'm ${formData.name}. I want to transform my saree into a ${designsData.find(s => s.key === selectedStyle)?.label}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white cursor-pointer px-8">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat on WhatsApp
                    </Button>
                  </a>
                  <a href="tel:+919558397481">
                    <Button variant="outline" className="cursor-pointer px-8">
                      <Phone className="w-4 h-4 mr-2" />
                      Call Us
                    </Button>
                  </a>
                </div>

                <p className="text-sm text-muted-foreground">
                  We will call you back to discuss your design.
                </p>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setSareePreview(null);
                    setSelectedStyle(null);
                    setGeneratedDesigns([]);
                    setSelectedDesignId(undefined);
                    setFormData({ name: "", phone: "", whatsapp: "", notes: "" });
                    setMeasurements([{ param: "", value: "" }]);
                  }}
                  className="cursor-pointer"
                >
                  Start New Inquiry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* 1. Upload Photos */}
              <Card className="glass-card border-0">
                <CardContent className="p-6">
                  <h2 className="font-[var(--font-heading)] text-xl font-semibold mb-4">
                    1. Upload Saree Photo
                  </h2>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Saree Photo *</label>
                    <UploadZone
                      onUpload={handleSareeUpload}
                      label="saree"
                      sublabel="Upload a clear photo of your vintage saree"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Choose Design */}
              <Card className="glass-card border-0">
                <CardContent className="p-6">
                  <h2 className="font-[var(--font-heading)] text-xl font-semibold mb-4">
                    2. Choose Your Design
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {designsData.map((design) => (
                      <button
                        key={design.key}
                        onClick={() => setSelectedStyle(design.key)}
                        className={`relative rounded-xl overflow-hidden border-2 text-left transition-all cursor-pointer group ${
                          selectedStyle === design.key
                            ? "border-gold ring-2 ring-gold/20"
                            : "border-border hover:border-gold/30"
                        }`}
                      >
                        <div className="relative w-full h-48 overflow-hidden">
                          <img
                            src={design.image}
                            alt={design.label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          {selectedStyle === design.key && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full gold-gradient flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <div className="font-medium text-sm text-white">{design.label}</div>
                          <div className="text-xs text-white/70">{design.description}</div>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => setSelectedStyle("custom")}
                      className={`relative rounded-xl overflow-hidden border-2 text-left transition-all cursor-pointer group ${
                        selectedStyle === "custom"
                          ? "border-gold ring-2 ring-gold/20"
                          : "border-border hover:border-gold/30"
                      }`}
                    >
                      <div className="w-full h-40 bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-3xl mb-2 block">✨</span>
                          <span className="font-medium text-sm text-gold">Custom</span>
                        </div>
                        {selectedStyle === "custom" && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full gold-gradient flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="font-medium text-sm">Your Design</div>
                        <div className="text-xs text-muted-foreground">Describe any dress you want</div>
                      </div>
                    </button>
                  </div>

                  {/* Full-size preview of selected design */}
                  {selectedStyle && selectedStyle !== "custom" && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-border bg-background/50">
                      <div className="relative w-full">
                        <img
                          src={designsData.find(d => d.key === selectedStyle)?.image}
                          alt={designsData.find(d => d.key === selectedStyle)?.label || ""}
                          className="w-full h-auto max-h-[500px] object-contain"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="font-[var(--font-heading)] text-lg font-semibold text-white">
                                {designsData.find(d => d.key === selectedStyle)?.label}
                              </div>
                              <div className="text-sm text-white/70">
                                {designsData.find(d => d.key === selectedStyle)?.description}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = designsData.find(d => d.key === selectedStyle)?.image || "";
                                  link.download = `novovastra-${selectedStyle}.jpg`;
                                  link.click();
                                }}
                                className="p-2 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedStyle === "custom" && (
                    <div className="mt-4">
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Describe your dream dress... e.g. A-line cocktail dress with sweetheart neckline, floor length, flowing cape sleeves, Indian brocade fabric..."
                        className="w-full h-28 px-4 py-3 rounded-xl bg-background/80 border border-border focus:border-gold focus:ring-1 focus:ring-gold/20 text-sm placeholder:text-muted-foreground resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Be specific about shape, length, neckline, sleeves, and details you want
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 3. AI Generate */}
              {sareePreview && selectedStyle && (
                <Card className="glass-card border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="font-[var(--font-heading)] text-xl font-semibold">
                          3. See Your Design
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          AI virtual try-on — see yourself wearing this design
                        </p>
                      </div>
                    </div>

                    {!generating && generatedDesigns.length === 0 && (
                      <div className="mb-6">
                        <label className="text-sm font-medium text-muted-foreground mb-3 block">Choose Quality</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setSelectedModel("standard")}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              selectedModel === "standard"
                                ? "border-gold ring-2 ring-gold/20 bg-gold/5"
                                : "border-border hover:border-gold/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                selectedModel === "standard" ? "gold-gradient" : "bg-muted"
                              }`}>
                                <Zap className={`w-5 h-5 ${selectedModel === "standard" ? "text-white" : "text-muted-foreground"}`} />
                              </div>
                              <div>
                                <div className="font-medium text-sm">Standard</div>
                                <div className="text-xs text-muted-foreground">1 credit</div>
                              </div>
                            </div>
                            {selectedModel === "standard" && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full gold-gradient flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                          <button
                            onClick={() => setSelectedModel("premium")}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              selectedModel === "premium"
                                ? "border-gold ring-2 ring-gold/20 bg-gold/5"
                                : "border-border hover:border-gold/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                selectedModel === "premium" ? "gold-gradient" : "bg-muted"
                              }`}>
                                <Crown className={`w-5 h-5 ${selectedModel === "premium" ? "text-white" : "text-muted-foreground"}`} />
                              </div>
                              <div>
                                <div className="font-medium text-sm">Premium</div>
                                <div className="text-xs text-muted-foreground">3 credits</div>
                              </div>
                            </div>
                            {selectedModel === "premium" && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full gold-gradient flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {generating ? (
                      <GenerationProgress
                        progress={progress}
                        currentStyle={designsData.find(s => s.key === selectedStyle)?.label || selectedStyle}
                      />
                    ) : generatedDesigns.length > 0 ? (
                      <DesignGrid
                        designs={generatedDesigns}
                        onSelect={(design) => setSelectedDesignId(design.id)}
                        onView={(design) => {
                          const styleLabel = designsData.find(d => d.key === design.style)?.label || design.style;
                          setViewingDesign({ imageData: design.imageData, mimeType: design.mimeType, label: styleLabel });
                        }}
                        onRegenerate={handleGenerate}
                        selectedId={selectedDesignId}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                          <ImagePlus className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground mb-4">
                          Ready to generate? Click below to see your saree transformed.
                        </p>
                        <Button
                          onClick={handleGenerate}
                          className="gold-gradient text-white cursor-pointer px-8"
                          disabled={credits !== null && credits < (selectedModel === "premium" ? 3 : 1)}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Design
                          {credits !== null && (
                            <span className="ml-2 text-xs opacity-80">({selectedModel === "premium" ? "3" : "1"} credit{selectedModel === "premium" ? "s" : ""} · {credits} left)</span>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 4. Your Details */}
              <Card className="glass-card border-0">
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-[var(--font-heading)] text-xl font-semibold">
                    {sareePreview && selectedStyle ? "4" : "3"}. Your Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name *</label>
                      <Input
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone Number *</label>
                      <Input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp Number (optional)</label>
                    <Input
                      type="tel"
                      placeholder="Same as phone if left blank"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Measurements</label>
                      <button
                        type="button"
                        onClick={() => setUseManualInput(!useManualInput)}
                        className="text-xs text-gold hover:text-gold-dark flex items-center gap-1 cursor-pointer"
                      >
                        {useManualInput ? (
                          <><Box className="w-3 h-3" /> Use 3D model</>
                        ) : (
                          <><Keyboard className="w-3 h-3" /> Enter manually</>
                        )}
                      </button>
                    </div>

                    {useManualInput ? (
                      <div className="space-y-2">
                        {measurements.map((m, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="e.g. Neck, Waist, Chest"
                              value={m.param}
                              onChange={(e) => {
                                const updated = [...measurements];
                                updated[index].param = e.target.value;
                                setMeasurements(updated);
                              }}
                              className="flex-1"
                            />
                            <Input
                              placeholder="e.g. 15 inches"
                              value={m.value}
                              onChange={(e) => {
                                const updated = [...measurements];
                                updated[index].value = e.target.value;
                                setMeasurements(updated);
                              }}
                              className="flex-1"
                            />
                            {measurements.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setMeasurements(measurements.filter((_, i) => i !== index))}
                                className="p-2 text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setMeasurements([...measurements, { param: "", value: "" }])}
                          className="text-xs text-gold hover:text-gold-dark flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add More
                        </button>
                      </div>
                    ) : (
                      <MannequinViewer
                        measurements={measurements}
                        setMeasurements={setMeasurements}
                      />
                    )}

                    {measurements.filter((m) => m.param && m.value).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {measurements.filter((m) => m.param && m.value).map((m, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs bg-gold/10 text-gold-dark border border-gold/20 rounded-full px-2.5 py-1"
                          >
                            {m.param}: {m.value}
                            <button
                              type="button"
                              onClick={() => setMeasurements(measurements.filter((_, idx) => !(m.param === measurements.filter((mm) => mm.param && mm.value)[i].param && m.value === measurements.filter((mm) => mm.param && mm.value)[i].value)))}
                              className="ml-0.5 hover:text-destructive cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Click on body parts to add measurements, or enter manually.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Additional Notes</label>
                    <textarea
                      placeholder="Tell us about your vision, preferred colors, occasion..."
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 5. Submit */}
              <Button
                onClick={handleSubmit}
                className="w-full gold-gradient text-white cursor-pointer py-6 text-lg"
                disabled={!formData.name || !formData.phone || !selectedStyle || !sareePreview || loading || (selectedStyle === "custom" && !customPrompt.trim())}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Inquiry
                    <MessageCircle className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <BuyCreditsModal open={showBuyCredits} onOpenChange={setShowBuyCredits} />
      {viewingDesign && (
        <ImageModal
          imageData={viewingDesign.imageData}
          mimeType={viewingDesign.mimeType}
          label={viewingDesign.label}
          onClose={() => setViewingDesign(null)}
        />
      )}
    </>
  );
}
