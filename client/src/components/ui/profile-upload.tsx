"use client";

import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Camera, X, User } from "lucide-react";
import { Button } from "./button";

interface ProfileUploadProps {
  value?: string;
  onChange: (file: File | null, preview: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

export function ProfileUpload({ value, onChange, className, size = "lg" }: ProfileUploadProps) {
  const [preview, setPreview] = useState(value || "");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): boolean => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return false;
    if (file.size > 2 * 1024 * 1024) return false;
    return true;
  };

  const handleFile = useCallback(
    (file: File) => {
      if (!validate(file)) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange(file, url);
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview("");
    onChange(null, "");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className={cn("relative group cursor-pointer", className)}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-200",
          sizeMap[size],
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        {preview ? (
          <img src={preview} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <User className="h-1/3 w-1/3 text-muted-foreground/50" />
        )}
      </div>

      <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
        <Camera className="h-5 w-5 text-white" />
      </div>

      {preview && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
          onClick={handleRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />
    </div>
  );
}
