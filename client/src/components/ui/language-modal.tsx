"use client";

import { useLanguage } from "@/contexts/language-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, Globe } from "lucide-react";

interface LanguageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const languages = [
  { code: "en" as const, label: "English", flag: "EN", native: "English" },
  { code: "so" as const, label: "Somali", flag: "SO", native: "Soomaali" },
  { code: "ar" as const, label: "Arabic", flag: "AR", native: "العربية" },
];

export function LanguageModal({ open, onOpenChange }: LanguageModalProps) {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (code: "en" | "so" | "ar") => {
    setLanguage(code);
    if (code === "ar") {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark:bg-[#0D0D0D] dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold dark:text-white">
            <Globe className="h-5 w-5 text-[#1F8A4D]" />
            Select Language
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                "flex items-center justify-between rounded-xl border p-4 transition-all",
                "hover:bg-gray-50 dark:hover:bg-gray-900",
                language === lang.code
                  ? "border-[#1F8A4D] bg-[#1F8A4D]/5 dark:border-[#1F8A4D] dark:bg-[#1F8A4D]/10"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold",
                    language === lang.code
                      ? "bg-[#1F8A4D] text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  )}
                >
                  {lang.flag}
                </div>
                <div className="text-left">
                  <p className={cn(
                    "text-base font-semibold",
                    language === lang.code ? "text-[#1F8A4D]" : "text-gray-900 dark:text-white"
                  )}>
                    {lang.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{lang.native}</p>
                </div>
              </div>
              {language === lang.code && (
                <Check className="h-5 w-5 text-[#1F8A4D]" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}