"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/toast-context";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import {
  Loader2, Plus, Search, User, CreditCard, FileText,
  Mail, Phone, Lock, Eye, EyeOff, Image, CheckCircle2, XCircle,
} from "lucide-react";

interface CreateAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountCreated?: () => void;
}

interface Customer {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
}

interface AccountForm {
  mode: "existing" | "new";
  customer_id: number | null;
  customer_search: string;
  account_type: string;
  purpose: string;
  username: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  email: string;
  phone: string;
  mother_name: string;
  id_card_image: string;
  pin: string;
  confirmPin: string;
}

const initialForm: AccountForm = {
  mode: "existing",
  customer_id: null,
  customer_search: "",
  account_type: "savings",
  purpose: "",
  username: "",
  password: "",
  confirmPassword: "",
  full_name: "",
  email: "",
  phone: "",
  mother_name: "",
  id_card_image: "",
  pin: "",
  confirmPin: "",
};

export function CreateAccountModal({ open, onOpenChange, onAccountCreated }: CreateAccountModalProps) {
  const { success, error: showError } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState<AccountForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [idCardPreview, setIdCardPreview] = useState("");

  useEffect(() => {
    if (form.customer_search.length >= 2 && form.mode === "existing") {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [form.customer_search, form.mode]);

  const searchCustomers = async () => {
    setSearching(true);
    try {
      const res = await api.get(`/admin/users?search=${form.customer_search}&role=customer`);
      setCustomers(res.data);
    } catch (err) {
      console.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setForm((prev) => ({ ...prev, customer_id: customer.id, customer_search: customer.full_name }));
    setCustomers([]);
  };

  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showError("Image must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setIdCardPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.mode === "existing") {
      if (!form.customer_id) {
        showError("Please select a customer");
        return;
      }
    } else {
      if (!form.full_name || form.full_name.trim().length < 3) {
        showError("Full name must be at least 3 characters");
        return;
      }
      if (!form.username || form.username.trim().length < 3) {
        showError("Username must be at least 3 characters");
        return;
      }
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        showError("Please enter a valid email address");
        return;
      }
      if (!form.password || form.password.length < 8) {
        showError("Password must be at least 8 characters");
        return;
      }
      if (form.password !== form.confirmPassword) {
        showError("Passwords do not match");
        return;
      }
      if (!form.phone || form.phone.trim().length < 6) {
        showError("Please enter a valid phone number");
        return;
      }
    }

    setLoading(true);
    try {
      if (form.mode === "existing") {
        await api.post("/accounts/create-for-customer", {
          customer_id: form.customer_id,
          account_type: form.account_type,
          purpose: form.purpose,
          pin: form.pin || undefined,
          email: form.email || undefined,
          username: form.username || undefined,
          password: form.password || undefined,
        });
      } else {
        await api.post("/accounts/register-customer", {
          username: form.username.trim(),
          email: form.email,
          password: form.password,
          confirm_password: form.confirmPassword,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          mother_name: form.mother_name,
          id_card_image: idCardPreview,
          account_type: form.account_type,
          purpose: form.purpose,
          pin: form.pin || undefined,
        });
      }
      success(t("account_created_success"));
      setForm(initialForm);
      setSelectedCustomer(null);
      setIdCardPreview("");
      onOpenChange(false);
      onAccountCreated?.();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: string, value: string | number | null) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const passwordChecks = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22c55e]/10">
              <Plus className="h-4 w-4 text-[#22c55e]" />
            </div>
            {t("create_account_for_customer")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("create_account_form_desc")}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, mode: "existing", customer_id: null, customer_search: "" }))}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              form.mode === "existing"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="inline-block mr-2 h-4 w-4" />
            {t("existing_customer")}
          </button>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, mode: "new" }))}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              form.mode === "new"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plus className="inline-block mr-2 h-4 w-4" />
            {t("new_customer")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Existing Customer Mode */}
          {form.mode === "existing" && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{t("search_customer")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("search_customer_placeholder")}
                    value={form.customer_search}
                    onChange={(e) => {
                      updateForm("customer_search", e.target.value);
                      setSelectedCustomer(null);
                      updateForm("customer_id", null);
                    }}
                    className="pl-10"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {customers.length > 0 && !selectedCustomer && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{customer.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{customer.username} - {customer.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedCustomer && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#22c55e]/20">
                      <User className="h-4 w-4 text-[#22c55e]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{selectedCustomer.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{selectedCustomer.username}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setForm((prev) => ({ ...prev, customer_id: null, customer_search: "" }));
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t("change")}
                    </button>
                  </div>
                )}
              </div>

              {/* New Credentials for Existing Customer */}
              {selectedCustomer && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Credentials (optional - leave blank to keep existing)</p>
                  
                  {/* New Email */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">New Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Enter new email address"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* New Username */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">New Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter new username"
                        value={form.username}
                        onChange={(e) => updateForm("username", e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={form.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground">Password strength</span>
                          <span className={`text-[11px] font-bold ${
                            Object.values(passwordChecks).filter(Boolean).length <= 2 ? "text-red-500" :
                            Object.values(passwordChecks).filter(Boolean).length <= 3 ? "text-orange-500" :
                            Object.values(passwordChecks).filter(Boolean).length <= 4 ? "text-yellow-500" : "text-emerald-500"
                          }`}>
                            {["", "Weak", "Fair", "Good", "Strong", "Very Strong"][Object.values(passwordChecks).filter(Boolean).length]}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { label: "8+ characters", check: passwordChecks.length },
                            { label: "Uppercase letter", check: passwordChecks.uppercase },
                            { label: "Lowercase letter", check: passwordChecks.lowercase },
                            { label: "Number", check: passwordChecks.number },
                            { label: "Special character", check: passwordChecks.special },
                          ].map(({ label, check }) => (
                            <div key={label} className="flex items-center gap-1.5">
                              {check ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                              <span className={`text-[10px] font-medium ${check ? "text-emerald-500" : "text-muted-foreground"}`}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={form.confirmPassword}
                        onChange={(e) => updateForm("confirmPassword", e.target.value)}
                        className="pr-10"
                      />
                      {form.confirmPassword && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {form.password === form.confirmPassword ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* New PIN */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">New PIN</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPin ? "text" : "password"}
                          placeholder="4-6 digit PIN"
                          maxLength={6}
                          value={form.pin}
                          onChange={(e) => updateForm("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="pl-10 tracking-[0.5em]"
                        />
                      </div>
                      <div className="relative">
                        <Input
                          type={showPin ? "text" : "password"}
                          placeholder="Confirm PIN"
                          maxLength={6}
                          value={form.confirmPin}
                          onChange={(e) => updateForm("confirmPin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="tracking-[0.5em]"
                        />
                        {form.confirmPin && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {form.pin === form.confirmPin ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPin ? "Hide PIN" : "Show PIN"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* New Customer Mode */}
          {form.mode === "new" && (
            <>
              {/* 1. Full Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{t("full_name")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("full_name_placeholder")}
                    value={form.full_name}
                    onChange={(e) => updateForm("full_name", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 2. Email */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{t("email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={t("email_placeholder")}
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 3. Phone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{t("phone")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder={t("phone_placeholder")}
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 4. PIN Account */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">PIN Account</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPin ? "text" : "password"}
                      placeholder="4-6 digit PIN"
                      maxLength={6}
                      value={form.pin}
                      onChange={(e) => updateForm("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="pl-10 tracking-[0.5em]"
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPin ? "text" : "password"}
                      placeholder="Confirm PIN"
                      maxLength={6}
                      value={form.confirmPin}
                      onChange={(e) => updateForm("confirmPin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="tracking-[0.5em]"
                    />
                    {form.confirmPin && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {form.pin === form.confirmPin ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPin ? "Hide PIN" : "Show PIN"}
                </button>
              </div>

              {/* 5. ID Card Image */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{t("id_card_image")}</Label>
                <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/50 hover:border-[#22c55e]/50 hover:bg-muted transition-all">
                  {idCardPreview ? (
                    <img src={idCardPreview} alt="ID Card" className="h-full object-contain rounded-lg p-1" />
                  ) : (
                    <>
                      <Image className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{t("upload_id_card")}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIdCardChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 6. Mother's Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{t("mother_name")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("mother_name_placeholder")}
                    value={form.mother_name}
                    onChange={(e) => updateForm("mother_name", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 7. Username + Password */}
              <div className="space-y-4 pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Login Credentials</p>
                
                {/* Username */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">{t("username")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("username_placeholder")}
                      value={form.username}
                      onChange={(e) => updateForm("username", e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">{t("password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("password_placeholder")}
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">Password strength</span>
                        <span className={`text-[11px] font-bold ${
                          Object.values(passwordChecks).filter(Boolean).length <= 2 ? "text-red-500" :
                          Object.values(passwordChecks).filter(Boolean).length <= 3 ? "text-orange-500" :
                          Object.values(passwordChecks).filter(Boolean).length <= 4 ? "text-yellow-500" : "text-emerald-500"
                        }`}>
                          {["", "Weak", "Fair", "Good", "Strong", "Very Strong"][Object.values(passwordChecks).filter(Boolean).length]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: "8+ characters", check: passwordChecks.length },
                          { label: "Uppercase letter", check: passwordChecks.uppercase },
                          { label: "Lowercase letter", check: passwordChecks.lowercase },
                          { label: "Number", check: passwordChecks.number },
                          { label: "Special character", check: passwordChecks.special },
                        ].map(({ label, check }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            {check ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                            <span className={`text-[10px] font-medium ${check ? "text-emerald-500" : "text-muted-foreground"}`}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("confirm_password_placeholder")}
                      value={form.confirmPassword}
                      onChange={(e) => updateForm("confirmPassword", e.target.value)}
                      className="pr-10"
                    />
                    {form.confirmPassword && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {form.password === form.confirmPassword ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Account Type (Common) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("account_type")}</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={form.account_type}
                onChange={(e) => updateForm("account_type", e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
              >
                <option value="savings">{t("savings_account")}</option>
                <option value="current">{t("current_account")}</option>
                <option value="fixed_deposit">{t("fixed_deposit")}</option>
              </select>
            </div>
          </div>

          {/* Purpose (Common) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("purpose")}</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("purpose_placeholder")}
                value={form.purpose}
                onChange={(e) => updateForm("purpose", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || (form.mode === "existing" && !form.customer_id)}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t("create_account_button")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
