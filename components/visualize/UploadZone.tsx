"use client";

import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  onUpload: (file: File, preview: string) => void;
  disabled?: boolean;
}

export function UploadZone({ onUpload, disabled }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreview(result);
        onUpload(file, result);
      };
      reader.readAsDataURL(file);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearPreview = () => {
    setPreview(null);
  };

  if (preview) {
    return (
      <div className="relative rounded-2xl overflow-hidden border-2 border-border">
        <img
          src={preview}
          alt="Uploaded saree"
          className="w-full h-64 sm:h-80 object-cover"
        />
        <button
          onClick={clearPreview}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary/80 text-primary-foreground flex items-center justify-center hover:bg-primary transition-colors cursor-pointer"
          aria-label="Remove image"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
        dragActive
          ? "border-gold bg-gold/5"
          : "border-border hover:border-gold/50 hover:bg-muted/30"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          {dragActive ? (
            <ImageIcon className="w-8 h-8 text-gold" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-lg font-medium">
            {dragActive ? "Drop your saree here" : "Upload your vintage saree"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Drag & drop or click to browse. JPEG, PNG, WebP up to 10MB.
          </p>
        </div>
        <Button variant="outline" size="sm" className="cursor-pointer">
          Choose File
        </Button>
      </div>
    </div>
  );
}
