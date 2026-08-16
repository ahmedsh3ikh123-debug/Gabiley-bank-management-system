"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/layout/auth-card";
import { ProfileUpload } from "@/components/ui/profile-upload";
import {
  Eye, EyeOff, Loader2, User, Mail, Lock, ArrowRight,
  UserPlus, CreditCard, CheckCircle2, XCircle, Shield, Phone,
  Image, FileText,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "", username: "", email: "", password: "", confirmPassword: "",
    pin: "", confirmPin: "", role: "customer", phone: "", mother_name: "",
    account_type: "savings", purpose: "",
  });
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { success, error: showError } = useToast();

  const passwordChecks = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthColors = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-blue-400", "text-emerald-400"];
  const strengthBarColors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"];

  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError("Image must be less than 5MB");
        return;
      }
      setIdCardFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setIdCardPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || form.full_name.trim().length < 3) { showError("Full name must be at least 3 characters"); return; }
    if (!form.username || form.username.trim().length < 3) { showError("Username must be at least 3 characters"); return; }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { showError("Please enter a valid email address"); return; }
    if (!form.password || form.password.length < 8) { showError("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
      showError("Password must include uppercase, lowercase, number, and special character"); return;
    }
    if (form.password !== form.confirmPassword) { showError("Passwords do not match"); return; }
    if (!form.pin || !/^\d{4,6}$/.test(form.pin)) { showError("PIN must be 4-6 digits"); return; }
    if (form.pin !== form.confirmPin) { showError("PINs do not match"); return; }
    if (!idCardFile) { showError("Please upload your ID card image"); return; }

    setLoading(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email,
        password: form.password,
        confirm_password: form.confirmPassword,
        phone: form.phone,
        pin: form.pin,
        role: form.role,
        mother_name: form.mother_name,
        id_card_image: idCardPreview,
        account_type: form.account_type,
        purpose: form.purpose,
      });
      success("Account created! Your account is pending approval. Please wait for an admin to activate it.");
      router.push("/login");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showError(error.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <AuthCard>
      {/* Header */}
      <div className="mb-7 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F8CC58]/10 border border-[#F8CC58]/20 px-4 py-1.5 mb-5 animate-float">
          <UserPlus className="h-3.5 w-3.5 text-[#F8CC58]" />
          <span className="text-[11px] font-semibold text-[#F8CC58] tracking-wider uppercase">Create Account</span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Create your account</h2>
        <p className="mt-2 text-white/50 text-sm leading-relaxed">
          Fill in the details below to get started
        </p>
      </div>

      {/* Profile Upload */}
      <div className="flex justify-center mb-7 animate-scale-in">
        <ProfileUpload
          value={profilePreview}
          onChange={(file, preview) => { setProfileFile(file); setProfilePreview(preview); }}
          size="lg"
        />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <Label htmlFor="full_name" className="text-[13px] font-semibold text-white/70">Full Name</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <User className="h-[18px] w-[18px]" />
            </div>
            <Input
              id="full_name" placeholder="John Doe" value={form.full_name}
              onChange={(e) => updateForm("full_name", e.target.value)}
              className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* Username */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <Label htmlFor="username" className="text-[13px] font-semibold text-white/70">Username</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <User className="h-[18px] w-[18px]" />
            </div>
            <Input
              id="username" placeholder="Choose a username" value={form.username}
              onChange={(e) => updateForm("username", e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.12s" }}>
          <Label htmlFor="phone" className="text-[13px] font-semibold text-white/70">Phone Number</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <Phone className="h-[18px] w-[18px]" />
            </div>
            <Input
              id="phone" type="tel" placeholder="+252 61 234 5678" value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value)}
              className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <Label htmlFor="email" className="text-[13px] font-semibold text-white/70">Email Address</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <Mail className="h-[18px] w-[18px]" />
            </div>
            <Input
              id="email" type="email" placeholder="john@example.com" value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <Label htmlFor="password" className="text-[13px] font-semibold text-white/70">New Password</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <Lock className="h-[18px] w-[18px]" />
            </div>
            <Input
              id="password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters"
              value={form.password} onChange={(e) => updateForm("password", e.target.value)}
              className="h-[52px] pl-12 pr-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-white/30 hover:text-[#F8CC58]/70 transition-colors duration-300" tabIndex={-1}>
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          {/* Confirm Password */}
          <div className="relative mt-2">
            <Input
              id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Confirm password"
              value={form.confirmPassword} onChange={(e) => updateForm("confirmPassword", e.target.value)}
              className="h-[52px] pl-4 pr-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
            {form.confirmPassword && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {form.password === form.confirmPassword ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
              </div>
            )}
          </div>
        </div>

        {/* Password Strength */}
        {form.password && (
          <div className="rounded-[14px] bg-white/[0.03] border border-white/[0.06] p-4 space-y-2.5 animate-scale-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/40">Password strength</span>
              <span className={`text-[11px] font-bold ${strengthColors[passwordStrength]}`}>{strengthLabels[passwordStrength]}</span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthBarColors[passwordStrength] : "bg-white/10"}`} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {[
                { label: "8+ characters", check: passwordChecks.length },
                { label: "Uppercase letter", check: passwordChecks.uppercase },
                { label: "Lowercase letter", check: passwordChecks.lowercase },
                { label: "Number", check: passwordChecks.number },
                { label: "Special character", check: passwordChecks.special },
              ].map(({ label, check }) => (
                <div key={label} className="flex items-center gap-1.5">
                  {check ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <div className="h-3 w-3 rounded-full border border-white/20" />}
                  <span className={`text-[10px] font-medium ${check ? "text-emerald-400" : "text-white/30"}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIN */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <Label htmlFor="pin" className="text-[13px] font-semibold text-white/70">New PIN Account</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative group">
              <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
                <CreditCard className="h-[18px] w-[18px]" />
              </div>
              <Input
                id="pin" type={showPin ? "text" : "password"} placeholder="4-6 digit PIN"
                value={form.pin} maxLength={6}
                onChange={(e) => updateForm("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-[52px] pl-12 pr-4 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] tracking-[0.5em]"
              />
            </div>
            <div className="relative group">
              <Input
                id="confirmPin" type={showPin ? "text" : "password"} placeholder="Confirm PIN"
                value={form.confirmPin} maxLength={6}
                onChange={(e) => updateForm("confirmPin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-[52px] pl-4 pr-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] tracking-[0.5em]"
              />
              {form.confirmPin && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {form.pin === form.confirmPin ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setShowPin(!showPin)}
            className="text-[11px] text-white/30 hover:text-[#F8CC58] transition-colors duration-200">
            {showPin ? "Hide PIN" : "Show PIN"}
          </button>
        </div>

        {/* Mother's Name */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Label htmlFor="mother_name" className="text-[13px] font-semibold text-white/70">Mother&apos;s Full Name</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <User className="h-[18px] w-[18px]" />
            </div>
            <Input
              id="mother_name" placeholder="Mother's full name" value={form.mother_name}
              onChange={(e) => updateForm("mother_name", e.target.value)}
              className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* Account Type */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.32s" }}>
          <Label htmlFor="account_type" className="text-[13px] font-semibold text-white/70">Account Type</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <FileText className="h-[18px] w-[18px]" />
            </div>
            <select
              id="account_type"
              value={form.account_type}
              onChange={(e) => updateForm("account_type", e.target.value)}
              className="h-[52px] w-full pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] appearance-none cursor-pointer"
            >
              <option value="savings" className="bg-black text-white">Savings Account</option>
              <option value="current" className="bg-black text-white">Current Account</option>
              <option value="fixed_deposit" className="bg-black text-white">Fixed Deposit</option>
            </select>
          </div>
        </div>

        {/* Purpose */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.33s" }}>
          <Label htmlFor="purpose" className="text-[13px] font-semibold text-white/70">Purpose</Label>
          <div className="relative group">
            <div className="absolute left-0 top-0 flex h-full w-12 items-center justify-center text-white/30 group-focus-within:text-[#F8CC58]/70 transition-colors duration-300">
              <FileText className="h-[18px] w-[18px]" />
            </div>
            <Input
              id="purpose" placeholder="Purpose of this account" value={form.purpose}
              onChange={(e) => updateForm("purpose", e.target.value)}
              className="h-[52px] pl-12 rounded-[14px] border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/25 focus:border-[#F8CC58]/50 focus:ring-[#F8CC58]/10 focus:ring-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* ID Card Image */}
        <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0.34s" }}>
          <Label htmlFor="id_card" className="text-[13px] font-semibold text-white/70">ID Card Image</Label>
          <div className="relative group">
            <label
              htmlFor="id_card"
              className="flex h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-white/10 bg-white/[0.04] hover:border-[#F8CC58]/50 hover:bg-white/[0.06] transition-all duration-300"
            >
              {idCardPreview ? (
                <img src={idCardPreview} alt="ID Card" className="h-full w-full object-contain rounded-[14px] p-2" />
              ) : (
                <>
                  <Image className="h-8 w-8 text-white/30" />
                  <span className="text-[12px] text-white/40">Click to upload ID card</span>
                  <span className="text-[10px] text-white/25">Max 5MB</span>
                </>
              )}
            </label>
            <input
              id="id_card"
              type="file"
              accept="image/*"
              onChange={handleIdCardChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <Button type="submit" disabled={loading}
            className="relative w-full h-[52px] rounded-[14px] bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#176B3D] hover:from-[#1F8A4D]/90 hover:via-[#1F8A4D]/80 hover:to-[#176B3D]/90 text-white text-[15px] font-bold shadow-lg shadow-[#1F8A4D]/30 hover:shadow-xl hover:shadow-[#1F8A4D]/40 transition-all duration-300 group overflow-hidden">
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            {loading ? (
              <span className="relative flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Creating account...</span>
            ) : (
              <span className="relative flex items-center justify-center">
                {form.role === "customer" ? "Create Customer Account" : form.role === "employee" ? "Create Employee Account" : "Create Admin Account"}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            )}
          </Button>
        </div>

        {/* Cancel */}
        <Link href="/login" className="block animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <Button type="button" variant="outline"
            className="w-full h-[52px] rounded-[14px] border-2 border-[#F8CC58]/30 hover:border-[#F8CC58]/60 hover:bg-[#F8CC58]/[0.08] text-[#F8CC58] hover:text-[#F8CC58]/80 font-semibold text-[15px] transition-all duration-300">
            Cancel
          </Button>
        </Link>
      </form>

      {/* Sign In */}
      <div className="mt-6 text-center text-[13px] animate-fade-in">
        <span className="text-white/40">Already have an account? </span>
        <Link href="/login" className="font-semibold text-[#F8CC58] hover:text-[#F8CC58]/80 transition-colors duration-200 hover:underline underline-offset-2">Sign in</Link>
      </div>
    </AuthCard>
  );
}
