"use client";

import { useEffect, useState } from "react";

export function AuthBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/auth-bg.jpg')" }}
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Large ambient orbs */}
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[#F8CC58]/[0.04] blur-[150px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#1F8A4D]/[0.04] blur-[130px]" />

        {/* Animated concentric rings */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border border-[#F8CC58]/[0.02]"
              style={{
                width: `${250 + i * 140}px`,
                height: `${250 + i * 140}px`,
                animation: mounted
                  ? `authRing ${10 + i * 2}s ease-in-out infinite ${i * 0.6}s`
                  : "none",
              }}
            />
          ))}
        </div>

        {/* Floating shapes */}
        {mounted && (
          <>
            <div
              className="absolute top-[8%] left-[12%] w-16 h-16 rotate-45 border border-[#F8CC58]/[0.06] rounded-lg"
              style={{ animation: "floatShape 12s ease-in-out infinite 0s" }}
            />
            <div
              className="absolute top-[25%] right-[8%] w-12 h-12 rotate-12 border border-[#1F8A4D]/[0.06] rounded-lg"
              style={{ animation: "floatShape 15s ease-in-out infinite 2s" }}
            />
            <div
              className="absolute bottom-[20%] left-[8%] w-10 h-10 -rotate-12 border border-[#F8CC58]/[0.05] rounded-lg"
              style={{ animation: "floatShape 10s ease-in-out infinite 4s" }}
            />
            <div
              className="absolute bottom-[35%] right-[15%] w-14 h-14 rotate-[30deg] border border-[#1F8A4D]/[0.05] rounded-lg"
              style={{ animation: "floatShape 14s ease-in-out infinite 1s" }}
            />
          </>
        )}

        {/* Gold floating particles */}
        {mounted &&
          [
            { top: "10%", left: "15%", size: 3, dur: "8s", delay: "0s" },
            { top: "18%", left: "75%", size: 2, dur: "10s", delay: "1s" },
            { top: "50%", left: "5%", size: 2, dur: "7s", delay: "2s" },
            { top: "65%", left: "60%", size: 3, dur: "9s", delay: "0.5s" },
            { top: "30%", left: "90%", size: 1.5, dur: "11s", delay: "3s" },
            { top: "80%", left: "22%", size: 2, dur: "8s", delay: "1.5s" },
            { top: "42%", left: "38%", size: 1.5, dur: "12s", delay: "4s" },
            { top: "5%", left: "50%", size: 2, dur: "9s", delay: "2.5s" },
            { top: "72%", left: "82%", size: 2.5, dur: "7s", delay: "0.8s" },
            { top: "88%", left: "45%", size: 1.5, dur: "10s", delay: "3.5s" },
          ].map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-[#F8CC58]/30"
              style={{
                width: p.size,
                height: p.size,
                top: p.top,
                left: p.left,
                animation: `particleDrift ${p.dur} ease-in-out infinite ${p.delay}`,
              }}
            />
          ))}
      </div>

      <style jsx global>{`
        @keyframes authRing {
          0%, 100% { opacity: 0.2; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.5; transform: scale(1.02) rotate(0.5deg); }
        }
        @keyframes particleDrift {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.15; }
          25% { transform: translateY(-20px) translateX(8px); opacity: 0.55; }
          50% { transform: translateY(-10px) translateX(-6px); opacity: 0.25; }
          75% { transform: translateY(-28px) translateX(10px); opacity: 0.65; }
        }
        @keyframes floatShape {
          0%, 100% { transform: translateY(0) rotate(45deg); opacity: 0.4; }
          50% { transform: translateY(-15px) rotate(50deg); opacity: 0.7; }
        }
      `}</style>
    </>
  );
}
