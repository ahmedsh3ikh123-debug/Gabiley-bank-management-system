"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Landmark } from "lucide-react";

export function ProtectedRoute({
  children,
  requiredRoles,
}: {
  children: ReactNode;
  requiredRoles?: string[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (!loading && user && requiredRoles && !requiredRoles.includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, loading, router, requiredRoles]);

  if (loading) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[#1A1918]">
        <div className="absolute inset-0 flex items-center justify-center">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border border-[#F8CC58]/[0.06]"
              style={{
                width: `${150 + i * 100}px`,
                height: `${150 + i * 100}px`,
                animation: `authRing ${6 + i * 2}s ease-in-out infinite ${i * 0.5}s`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center gap-5 animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F8CC58] to-[#E4B155] shadow-xl shadow-[#F8CC58]/25">
            <Landmark className="h-7 w-7 text-[#1A1918]" />
          </div>
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#F8CC58]/40 border-t-[#F8CC58]" />
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

  if (!user) return null;

  if (requiredRoles && !requiredRoles.includes(user.role)) return null;

  return <>{children}</>;
}

export default ProtectedRoute;
