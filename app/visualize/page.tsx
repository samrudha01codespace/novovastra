"use client";

import { useState } from "react";
import Image from "next/image";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { UploadZone } from "@/components/visualize/UploadZone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Phone, MessageCircle, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import designsData from "@/data/designs.json";

const WHATSAPP_NUMBER = "919558397481";

interface Measurement {
  param: string;
  value: string;
}

export default function VisualizePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    notes: "",
  });
  const [measurements, setMeasurements] = useState<Measurement[]>([
    { param: "", value: "" },
  ]);

  const handleUpload = (_file: File, previewUrl: string) => {
    setPreview(previewUrl);
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
    if (!preview) {
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
          measurements: measurements.filter(m => m.param && m.value),
          sareeImage: preview,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      const styleLabel = designsData.find(s => s.key === selectedStyle)?.label || selectedStyle;
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
              Upload your vintage saree, pick a design, and we will bring it to life.
            </p>
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
                    setPreview(null);
                    setSelectedStyle(null);
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
              {/* 1. Upload Saree */}
              <Card className="glass-card border-0">
                <CardContent className="p-6">
                  <h2 className="font-[var(--font-heading)] text-xl font-semibold mb-4">
                    1. Upload Your Saree
                  </h2>
                  <UploadZone onUpload={handleUpload} />
                  {preview && (
                    <div className="mt-4 w-full h-48 rounded-xl overflow-hidden">
                      <img
                        src={preview}
                        alt="Uploaded saree"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
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
                        <div className="relative w-full h-40">
                          <Image
                            src={design.image}
                            alt={design.label}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
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
                  </div>
                </CardContent>
              </Card>

              {/* 3. Your Details */}
              <Card className="glass-card border-0">
                <CardContent className="p-6 space-y-4">
                  <h2 className="font-[var(--font-heading)] text-xl font-semibold">
                    3. Your Details
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Measurements</label>
                      <button
                        type="button"
                        onClick={() => setMeasurements([...measurements, { param: "", value: "" }])}
                        className="text-xs text-gold hover:text-gold-dark flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add More
                      </button>
                    </div>
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
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Add your body measurements so we can craft the perfect fit.
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

              {/* 4. Submit */}
              <Button
                onClick={handleSubmit}
                className="w-full gold-gradient text-white cursor-pointer py-6 text-lg"
                disabled={!formData.name || !formData.phone || !selectedStyle || !preview || loading}
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
    </>
  );
}
