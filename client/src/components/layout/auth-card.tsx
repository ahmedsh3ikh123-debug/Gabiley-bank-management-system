"use client";

import { type ReactNode } from "react";
import { Landmark, Shield, Lock } from "lucide-react";
import Link from "next/link";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-[560px] animate-fade-in">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#F8CC58] via-[#F8CC58] to-[#E4B155] shadow-xl shadow-[#F8CC58]/30 transition-all duration-500 group-hover:shadow-[#F8CC58]/50 group-hover:scale-110 group-hover:rotate-3 overflow-hidden">
              <img src="/logo.png" alt="Gabiley Bank" className="h-14 w-14 object-cover rounded-[12px]" style={{ filter: "saturate(1.4) contrast(1.15) brightness(1.08)" }} />
              <div className="absolute inset-0 rounded-[12px] ring-1 ring-inset ring-white/25 pointer-events-none" />
            </div>
            <div className="absolute -inset-1 rounded-[18px] bg-gradient-to-br from-[#F8CC58]/20 to-transparent blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">Gabiley Bank</h1>
            <p className="text-[10px] text-[#F8CC58]/80 tracking-[0.25em] uppercase font-semibold">Management System</p>
          </div>
        </Link>

        {/* Glass Card */}
        <div className="relative group">
          {/* Outer glow on hover */}
          <div className="absolute -inset-[1px] rounded-[20px] bg-gradient-to-br from-[#F8CC58]/20 via-[#1F8A4D]/10 to-[#F8CC58]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

          <div className="relative rounded-[18px] bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] shadow-2xl shadow-black/30 overflow-hidden transition-all duration-300 group-hover:border-white/[0.15] group-hover:shadow-black/40">
            {/* Top gold accent line */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#F8CC58]/70 to-transparent" />

            {/* Inner top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-[1px] bg-[#F8CC58]/40 blur-sm" />

            <div className="p-8 sm:p-10">
              {children}
            </div>
          </div>
        </div>

        {/* Security footer */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 text-[11px] text-white/25 tracking-wide">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-[#F8CC58]/40" />
              <span>SSL Secured</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-[#F8CC58]/40" />
              <span>256-bit Encryption</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-emerald-400/40" />
              <span>Trusted Banking</span>
            </div>
          </div>
          <p className="text-[10px] text-white/15 tracking-wider">
            Privacy &amp; Security &mdash; Your data is protected
          </p>
        </div>

        {/* Bottom Image */}
        <div className="mt-8 flex justify-center opacity-60">
          <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="8" width="100" height="24" rx="4" stroke="rgba(248,204,88,0.3)" strokeWidth="1" fill="none" />
            <path d="M30 20 L40 14 L50 20 L60 14 L70 20 L80 14 L90 20" stroke="rgba(248,204,88,0.25)" strokeWidth="1.5" fill="none" />
            <circle cx="60" cy="20" r="6" stroke="rgba(248,204,88,0.35)" strokeWidth="1" fill="none" />
            <path d="M57 20 L60 17 L63 20 L60 23 Z" fill="rgba(248,204,88,0.2)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
