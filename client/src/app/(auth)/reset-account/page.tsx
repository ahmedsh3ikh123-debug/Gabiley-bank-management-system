"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useToast } from "@/contexts/toast-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/layout/auth-card";
import {
  Loader2, CheckCircle, ArrowLeft, Mail, Lock, Eye, EyeOff,
  User, KeyRound, Shield, ArrowRight, RefreshCcw, UserCheck,
} from "lucide-react";

export default function ResetAccountPage() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useToast();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username && !email) { showError("Please enter username or email"); return; }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email || username });
      setStep(2);
      success("Reset code sent successfully");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showError(error.response?.data?.error || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { showError("Please enter the verification code"); return; }
    if (!newPassword || newPassword.length < 6) { showError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { showError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: newPassword });
      setStep(3);
      success("Account reset successful");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showError(error.response?.data?.error || "Failed to reset account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      {/* Step 1: Enter Username / Email */}
      {step === 1 && (
        <>
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F8CC58]/10 border border-[#F8CC58]/20 px-4 py-1.5 mb-5 animate-float">
              <RefreshCcw className="h-3.5 w-3.5 text-[#F8CC58]" />
              <span className="text-[11px] font-semibold text-[#F8CC58] tracking-wider uppercase">Account Reset</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Reset Account</h2>
            <p className="mt-2 text-white/50 text-sm leading-relaxed">
              Enter your username or email to verify your identity
            </p>
          </div>

          <form onSubmit={handleRequestReset} className="space-y-5">
            <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.05s" }}>
              <Label htmlFor="username" className="text-[13px] font-semibold text-white/70">Username</Label>
              <div className="relative group">
                <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
                  <User className="h-[18px] w-[18px]" />
                </div>
                <Input
                  id="username" placeholder="Enter your username" value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                />
              </div>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#1A1918]/80 px-3 text-[11px] text-white/30 tracking-wider uppercase">or</span>
              </div>
            </div>

            <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <Label htmlFor="email" className="text-[13px] font-semibold text-white/70">Email Address</Label>
              <div className="relative group">
                <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
                  <Mail className="h-[18px] w-[18px]" />
                </div>
                <Input
                  id="email" type="email" placeholder="Enter your email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                />
              </div>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
              <Button type="submit" disabled={loading}
                className="relative w-full h-[52px] rounded-[14px] bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#176B3D] hover:from-[#1F8A4D]/90 hover:via-[#1F8A4D]/80 hover:to-[#176B3D]/90 text-white text-[15px] font-bold shadow-lg shadow-[#1F8A4D]/30 hover:shadow-xl hover:shadow-[#1F8A4D]/40 transition-all duration-300 group overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                {loading ? (
                  <span className="relative flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verifying...</span>
                ) : (
                  <span className="relative flex items-center justify-center">Send Verification Code<ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" /></span>
                )}
              </Button>
            </div>
          </form>
        </>
      )}

      {/* Step 2: Enter Code + New Password */}
      {step === 2 && (
        <>
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F8CC58]/10 border border-[#F8CC58]/20 px-4 py-1.5 mb-5 animate-float">
              <KeyRound className="h-3.5 w-3.5 text-[#F8CC58]" />
              <span className="text-[11px] font-semibold text-[#F8CC58] tracking-wider uppercase">Verification</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Verify & Reset</h2>
            <p className="mt-2 text-white/50 text-sm leading-relaxed">
              Enter the code and create a new password
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.05s" }}>
              <Label htmlFor="token" className="text-[13px] font-semibold text-white/70">Verification Code</Label>
              <div className="relative group">
                <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
                  <KeyRound className="h-[18px] w-[18px]" />
                </div>
                <Input
                  id="token" placeholder="Enter verification code" value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                />
              </div>
            </div>

            <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <Label htmlFor="newPassword" className="text-[13px] font-semibold text-white/70">New Password</Label>
              <div className="relative group">
                <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
                  <Lock className="h-[18px] w-[18px]" />
                </div>
                <Input
                  id="newPassword" type={showPassword ? "text" : "password"} placeholder="Min 6 characters"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="h-[52px] pl-12 pr-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-white/30 hover:text-[#F8CC58]/70 transition-colors duration-300" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.15s" }}>
              <Label htmlFor="confirmPassword" className="text-[13px] font-semibold text-white/70">Confirm Password</Label>
              <div className="relative group">
                <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
                  <Lock className="h-[18px] w-[18px]" />
                </div>
                <Input
                  id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Confirm new password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                />
              </div>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Button type="submit" disabled={loading}
                className="relative w-full h-[52px] rounded-[14px] bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#176B3D] hover:from-[#1F8A4D]/90 hover:via-[#1F8A4D]/80 hover:to-[#176B3D]/90 text-white text-[15px] font-bold shadow-lg shadow-[#1F8A4D]/30 hover:shadow-xl hover:shadow-[#1F8A4D]/40 transition-all duration-300 group overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                {loading ? (
                  <span className="relative flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Resetting...</span>
                ) : (
                  <span className="relative flex items-center justify-center">Reset Account<ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" /></span>
                )}
              </Button>
            </div>
          </form>
        </>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="text-center space-y-6 animate-scale-in">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-gold-pulse">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="absolute -inset-2 rounded-full bg-emerald-500/10 blur-md" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Account Reset Complete</h2>
            <p className="mt-2 text-white/50 text-sm leading-relaxed">
              Your account has been successfully reset. You can now sign in with your new password.
            </p>
          </div>
          <Link href="/login">
            <Button className="w-full h-[52px] rounded-[14px] bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#176B3D] text-white text-[15px] font-bold shadow-lg shadow-[#1F8A4D]/30 transition-all duration-300 group overflow-hidden relative">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              <span className="relative flex items-center justify-center">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Login
              </span>
            </Button>
          </Link>
        </div>
      )}

      {/* Back to Login */}
      {step !== 3 && (
        <div className="mt-6 text-center animate-fade-in">
          <Link href="/login" className="inline-flex items-center gap-2 text-[13px] text-white/35 hover:text-[#F8CC58] transition-colors duration-200 group">
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Login
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
