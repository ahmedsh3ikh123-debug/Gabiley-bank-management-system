"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { OfflineBanner } from "@/components/offline/offline-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleResize = (e: CustomEvent<{ width: number }>) => {
      setSidebarWidth(e.detail.width);
    };
    window.addEventListener("sidebar-resize", handleResize as EventListener);
    return () => window.removeEventListener("sidebar-resize", handleResize as EventListener);
  }, []);

  return (
    <div className="min-h-screen transition-all duration-500 relative bg-gray-50 dark:bg-gray-900">
      {/* Global bank background image */}
      <div className="fixed inset-0 bg-[url('/bank-bg.svg')] bg-cover bg-center opacity-[0.03] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10 pointer-events-none z-0" />

      <OfflineBanner />
      <Sidebar />
      <div
        className="transition-all duration-300 ease-in-out relative z-10"
        style={{ marginLeft: isMobile ? 0 : `${sidebarWidth}px` }}
      >
        <Topbar />
        <main className="p-4 lg:p-6 transition-all duration-500 relative bg-gray-50 dark:bg-gray-900">
          {/* Content background overlay */}
          <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] bg-repeat opacity-30 pointer-events-none" />
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
