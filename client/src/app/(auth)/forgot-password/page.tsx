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
  Loader2, CheckCircle, ArrowLeft, Lock, Eye, EyeOff,
  KeyRound, Shield, ArrowRight, Fingerprint, CreditCard, Mail,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [accountNumber, setAccountNumber] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [userName, setUserName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useToast();

  const handleVerifyAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) { showError("Please enter your account number"); return; }
    if (!emailOrPhone.trim()) { showError("Please enter your email or phone number"); return; }

    setLoading(true);
    try {
      const res = await api.post("/auth/verify-account", {
        account_number: accountNumber.trim(),
        email_or_phone: emailOrPhone.trim(),
      });
      setResetToken(res.data.reset_token);
      setUserName(res.data.user_name);
      setStep(2);
      success("Account verified! You can now set a new password.");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showError(error.response?.data?.error || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { showError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { showError("Passwords do not match"); return; }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token: resetToken,
        new_password: newPassword,
      });
      setStep(3);
      success("Password reset successful!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showError(error.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      {/* Step 1: Verify Account */}
      {step === 1 && (
        <>
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F8CC58]/10 border border-[#F8CC58]/20 px-4 py-1.5 mb-5">
              <Fingerprint className="h-3.5 w-3.5 text-[#F8CC58]" />
              <span className="text-[11px] font-semibold text-[#F8CC58] tracking-wider uppercase">Password Recovery</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Forgot Password?</h2>
            <p className="mt-2 text-white/50 text-sm leading-relaxed">
              Verify your identity to reset your password
            </p>
          </div>

          <form onSubmit={handleVerifyAccount} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-white/70">Account Number</Label>
              <div className="relative group">
                <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#1F8A4D]/70 transition-colors duration-300">
                  <CreditCard className="h-[18px] w-[18px]" />
                </div>
                <Input
                  placeholder="Enter your account number (e.g. ACC-001)"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#1F8A4D]/50 focus:ring-[#1F8A4D]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-white/70">Email or Phone Number</Label>
              <div className="relative group">
                <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#1F8A4D]/70 transition-colors duration-300">
                  <Mail className="h-[18px] w-[18px]" />
                </div>
                <Input
                  placeholder="Enter your email or phone number"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#1F8A4D]/50 focus:ring-[#1F8A4D]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                />
              </div>
            </div>

            <div className="rounded-xl bg-[#1F8A4D]/10 border border-[#1F8A4D]/20 p-4">
              <p className="text-sm text-[#1F8A4D]">
                Enter the account number and email/phone number registered with your account to verify your identity.
              </p>
            </div>

            <Button type="submit" disabled={loading}
              className="relative w-full h-[52px] rounded-[14px] bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#176B3D] hover:from-[#1F8A4D]/90 hover:via-[#1F8A4D]/80 hover:to-[#176B3D]/90 text-white text-[15px] font-bold shadow-lg shadow-[#1F8A4D]/30 hover:shadow-xl hover:shadow-[#1F8A4D]/40 transition-all duration-300 group overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              {loading ? (
                <span className="relative flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verifying...</span>
              ) : (
                <span className="relative flex items-center justify-center">Verify Account<ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" /></span>
              )}
            </Button>
          </form>
        </>
      )}

      {/* Step 2: Set New Password */}
      {step === 2 && (
        <>
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#1F8A4D]/10 border border-[#1F8A4D]/20 px-4 py-1.5 mb-5">
              <KeyRound className="h-3.5 w-3.5 text-[#1F8A4D]" />
              <span className="text-[11px] font-semibold text-[#1F8A4D] tracking-wider uppercase">Identity Verified</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Set New Password</h2>
            <p className="mt-2 text-white/50 text-sm leading-relaxed">
              Welcome back, <span className="text-[#F8CC58] font-semibold">{userName}</span>. Create a new password.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-white/70">New Password</Label>
              <div className="relative group">
                <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#1F8A4D]/70 transition-colors duration-300">
                  <Lock className="h-[18px] w-[18px]" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-[52px] pl-12 pr-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#1F8A4D]/50 focus:ring-[#1F8A4D]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-white/30 hover:text-[#1F8A4D]/70 transition-colors duration-300" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-white/70">Confirm Password</Label>
              <div className="relative group">
                <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#1F8A4D]/70 transition-colors duration-300">
                  <Lock className="h-[18px] w-[18px]" />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#1F8A4D]/50 focus:ring-[#1F8A4D]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                />
              </div>
            </div>

            <div className="rounded-xl bg-[#F8CC58]/10 border border-[#F8CC58]/20 p-4">
              <p className="text-sm text-[#F8CC58]">
                Password must be at least 6 characters. Your old password will be replaced.
              </p>
            </div>

            <Button type="submit" disabled={loading}
              className="relative w-full h-[52px] rounded-[14px] bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#176B3D] hover:from-[#1F8A4D]/90 hover:via-[#1F8A4D]/80 hover:to-[#176B3D]/90 text-white text-[15px] font-bold shadow-lg shadow-[#1F8A4D]/30 hover:shadow-xl hover:shadow-[#1F8A4D]/40 transition-all duration-300 group overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              {loading ? (
                <span className="relative flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Resetting...</span>
              ) : (
                <span className="relative flex items-center justify-center">Reset Password<ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" /></span>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => setStep(1)} className="text-[13px] text-white/40 hover:text-[#F8CC58] transition-colors">
              ← Back to verification
            </button>
          </div>
        </>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="absolute -inset-2 rounded-full bg-emerald-500/10 blur-md" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Password Reset!</h2>
            <p className="mt-2 text-white/50 text-sm leading-relaxed">
              Your password has been reset successfully. You can now sign in with your new password.
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
        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-[13px] text-white/35 hover:text-[#F8CC58] transition-colors duration-200 group">
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Login
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
