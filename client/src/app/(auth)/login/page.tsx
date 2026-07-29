"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/layout/auth-card";
import {
  Eye, EyeOff, Loader2, Lock, User, ArrowRight,
  Shield, Fingerprint, WifiOff, KeyRound,
} from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [pendingError, setPendingError] = useState(false);
  const { login } = useAuth();
  const { success, error: showError } = useToast();
  const { isOnline } = useOnlineStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showError("Please enter username and password");
      return;
    }
    setLoading(true);
    setPendingError(false);
    try {
      await login(username, password);
      success("Login successful");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      const errorMsg = error.response?.data?.error || "Login failed";
      if (errorMsg.includes("pending approval")) {
        setPendingError(true);
      }
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F8CC58]/10 border border-[#F8CC58]/20 px-4 py-1.5 mb-5 animate-float">
          <Fingerprint className="h-3.5 w-3.5 text-[#F8CC58]" />
          <span className="text-[11px] font-semibold text-[#F8CC58] tracking-wider uppercase">Secure Login</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Welcome back</h2>
        <p className="mt-2 text-white/50 text-sm leading-relaxed">
          Sign in to access your banking dashboard
        </p>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3.5 text-sm text-orange-300 animate-slide-up">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Offline Mode — Limited access available</span>
        </div>
      )}

      {/* Pending approval banner */}
      {pendingError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3.5 text-sm text-yellow-300 animate-slide-up">
          <Shield className="h-4 w-4 shrink-0" />
          <span>Your account is pending approval. Please wait for an admin to activate your account.</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <Label htmlFor="username" className="text-[13px] font-semibold text-white/70">Username</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <User className="h-[18px] w-[18px]" />
            </div>
            <Input
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <Label htmlFor="password" className="text-[13px] font-semibold text-white/70">Password</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <Lock className="h-[18px] w-[18px]" />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-[52px] pl-12 pr-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-white/30 hover:text-[#F8CC58]/70 transition-colors duration-300"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        {/* Remember me + Forgot */}
        <div className="flex items-center justify-between animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded-lg border-white/20 bg-white/[0.05] text-[#F8CC58] focus:ring-[#F8CC58]/20 cursor-pointer transition-all duration-200"
            />
            <span className="text-[13px] text-white/50 group-hover:text-white/70 transition-colors duration-200">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-[13px] font-semibold text-[#F8CC58] hover:text-[#F8CC58]/80 transition-colors duration-200 hover:underline underline-offset-2">
            Forgot password?
          </Link>
        </div>

        {/* Sign In button */}
        <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <Button
            type="submit"
            disabled={loading}
            className="relative w-full h-[52px] rounded-[14px] bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#176B3D] hover:from-[#1F8A4D]/90 hover:via-[#1F8A4D]/80 hover:to-[#176B3D]/90 text-white text-[15px] font-bold shadow-lg shadow-[#1F8A4D]/30 hover:shadow-xl hover:shadow-[#1F8A4D]/40 transition-all duration-300 group overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            {loading ? (
              <span className="relative flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </span>
            ) : (
              <span className="relative flex items-center justify-center">
                Sign In
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#1A1918]/80 px-4 text-[11px] font-medium text-white/30 tracking-wider uppercase">
            New to Gabiley Bank?
          </span>
        </div>
      </div>

      {/* Register link */}
      <Link href="/register" className="block animate-slide-up" style={{ animationDelay: "0.25s" }}>
        <Button
          type="button"
          className="relative w-full h-[52px] rounded-[14px] bg-gradient-to-r from-[#F8CC58] via-[#F8CC58] to-[#E4B155] hover:from-[#F8CC58]/90 hover:via-[#F8CC58]/90 hover:to-[#E4B155]/90 text-[#1A1918] dark:text-white text-[15px] font-extrabold shadow-lg shadow-[#F8CC58]/30 hover:shadow-xl hover:shadow-[#F8CC58]/50 transition-all duration-300 group overflow-hidden"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.2] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
          <span className="relative flex items-center justify-center">
            Create New Account
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
          </span>
        </Button>
      </Link>

      {/* Reset Account link */}
      <div className="mt-5 text-center">
        <Link href="/reset-account" className="inline-flex items-center gap-1.5 text-[13px] text-white/35 hover:text-[#F8CC58] transition-colors duration-200 group">
          <KeyRound className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform duration-300" />
          Reset Account
        </Link>
      </div>
    </AuthCard>
  );
}
