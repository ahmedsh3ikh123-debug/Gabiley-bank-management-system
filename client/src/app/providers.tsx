"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth-context";
import { LanguageProvider } from "@/contexts/language-context";
import { ToastProvider } from "@/contexts/toast-context";
import { DataRefreshProvider } from "@/contexts/data-refresh-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OnlineStatusProvider } from "@/hooks/use-online-status";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <LanguageProvider>
          <OnlineStatusProvider>
            <ToastProvider>
              <DataRefreshProvider>
                <TooltipProvider>{children}</TooltipProvider>
              </DataRefreshProvider>
            </ToastProvider>
          </OnlineStatusProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
