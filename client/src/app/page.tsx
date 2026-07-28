"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Landmark } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[#1A1918]">
      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-[#F8CC58]/[0.06]"
            style={{
              width: `${200 + i * 120}px`,
              height: `${200 + i * 120}px`,
              animation: mounted
                ? `authRing ${6 + i * 2}s ease-in-out infinite ${i * 0.5}s`
                : "none",
            }}
          />
        ))}
      </div>

      {/* Glow effects */}
      <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] rounded-full bg-[#1F8A4D]/10 blur-[100px]" />
      <div className="absolute bottom-[20%] right-[20%] w-[250px] h-[250px] rounded-full bg-[#F8CC58]/8 blur-[80px]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-5 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F8CC58] to-[#E4B155] shadow-xl shadow-[#F8CC58]/25">
          <Landmark className="h-8 w-8 text-[#1A1918]" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Gabiley Bank</h1>
          <p className="text-[11px] text-[#F8CC58]/70 tracking-[0.2em] uppercase font-medium">Management System</p>
        </div>
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#F8CC58]/40 border-t-[#F8CC58]" />
      </div>

      <style jsx global>{`
        @keyframes authRing {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}
