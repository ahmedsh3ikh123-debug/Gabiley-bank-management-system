"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileUpload } from "@/components/ui/profile-upload";
import api from "@/lib/api";
import {
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

interface UserForm {
  full_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  pin: string;
  confirmPin: string;
  phone: string;
  address: string;
  gender: string;
  dob: string;
  role: string;
}

const initialForm: UserForm = {
  full_name: "",
  email: "",
  password: "",
  confirmPassword: "",
  pin: "",
  confirmPin: "",
  phone: "",
  address: "",
  gender: "",
  dob: "",
  role: "customer",
};

export function CreateUserModal({ open, onOpenChange, onUserCreated }: CreateUserModalProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [form, setForm] = useState<UserForm>(initialForm);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdUser, setCreatedUser] = useState<{ username: string; password: string; role: string } | null>(null);

  const isAdmin = user?.role === "super_admin" || user?.role === "branch_manager";
  const isEmployee = ["teller", "customer_service", "accountant", "ict_staff"].includes(user?.role || "");

  // Employee can only create customers
  const availableRoles = isAdmin
    ? ["customer", "teller", "customer_service", "accountant", "ict_staff", "branch_manager", "super_admin"]
    : ["customer"];

  const passwordChecks = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthColors = ["", "text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-emerald-500"];
  const strengthBarColors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"];

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.full_name || form.full_name.trim().length < 3) {
      errors.full_name = "Full name must be at least 3 characters";
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Valid email is required";
    }
    if (!form.phone || form.phone.trim().length < 6) {
      errors.phone = "Valid phone number is required";
    }
    if (!form.password || form.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
      errors.password = "Password must include uppercase, lowercase, number, and special character";
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    if (!form.pin || !/^\d{4,6}$/.test(form.pin)) {
      errors.pin = "PIN must be 4-6 digits";
    }
    if (form.pin !== form.confirmPin) {
      errors.confirmPin = "PINs do not match";
    }
    if (form.dob && new Date(form.dob) > new Date()) {
      errors.dob = "Date of birth cannot be in the future";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // If profile picture exists, convert to base64
      let profilePicture = "";
      if (profileFile) {
        const reader = new FileReader();
        profilePicture = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(profileFile);
        });
      }

      const payload = {
        full_name: form.full_name.trim(),
        email: form.email,
        password: form.password,
        phone: form.phone.trim(),
        address: form.address,
        gender: form.gender,
        dob: form.dob,
        role: form.role,
        pin: form.pin,
        profile_picture: profilePicture,
      };

      const res = await api.post("/admin/users", payload);
      const username = res.data?.username || form.email.split("@")[0];
      setCreatedUser({
        username,
        password: form.password,
        role: form.role,
      });
      success(`Account created successfully for ${form.full_name}`);
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(initialForm);
    setProfileFile(null);
    setProfilePreview("");
    setShowPassword(false);
    setShowPin(false);
    setFieldErrors({});
    setCreatedUser(null);
    onUserCreated?.();
    onOpenChange(false);
  };

  const updateForm = (field: keyof UserForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const getRoleColor = (role: string) => {
    if (role === "super_admin" || role === "branch_manager") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (["teller", "customer_service", "accountant", "ict_staff"].includes(role)) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {createdUser ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                Account Created Successfully
              </DialogTitle>
              <DialogDescription>
                Please save these credentials and share them with the user securely.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950">
                <div className="text-center mb-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    Login credentials for <span className="font-bold">{form.full_name || "the user"}</span>
                  </p>
                </div>
                <div className="space-y-3 bg-white dark:bg-gray-900 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Username:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md text-sm font-mono font-bold text-gray-900 dark:text-white">
                        {createdUser.username}
                      </code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(createdUser.username)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Password:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md text-sm font-mono font-bold text-gray-900 dark:text-white">
                        {createdUser.password}
                      </code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(createdUser.password)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Role:</span>
                    <span className="text-sm font-medium capitalize">{createdUser.role.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Important:</strong> Share these credentials securely with the user. The password cannot be retrieved later.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                Add New User
              </DialogTitle>
              <DialogDescription>
                Create a new bank account securely.
                {isEmployee && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400 text-xs">
                    Employee accounts can only create Customer accounts.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profile Photo */}
              <div className="flex justify-center">
                <ProfileUpload
                  value={profilePreview}
                  onChange={(file, preview) => {
                    setProfileFile(file);
                    setProfilePreview(preview);
                  }}
                  size="lg"
                />
              </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="Enter full name"
              value={form.full_name}
              onChange={(e) => updateForm("full_name", e.target.value)}
              className={fieldErrors.full_name ? "border-red-500" : ""}
            />
            {fieldErrors.full_name && (
              <p className="text-xs text-red-500">{fieldErrors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              className={fieldErrors.email ? "border-red-500" : ""}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          {/* Phone & Gender */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="+252 61 234 5678"
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
                className={fieldErrors.phone ? "border-red-500" : ""}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-red-500">{fieldErrors.phone}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => updateForm("gender", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          {/* Address & DOB */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-sm font-medium">Address</Label>
              <Input
                id="address"
                placeholder="City, Country"
                value={form.address}
                onChange={(e) => updateForm("address", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob" className="text-sm font-medium">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dob}
                onChange={(e) => updateForm("dob", e.target.value)}
                className={fieldErrors.dob ? "border-red-500" : ""}
              />
              {fieldErrors.dob && (
                <p className="text-xs text-red-500">{fieldErrors.dob}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters"
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                className={fieldErrors.password ? "border-red-500 pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-red-500">{fieldErrors.password}</p>
            )}

            {/* Password Strength */}
            {form.password && (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Password strength</span>
                  <span className={`text-xs font-bold ${strengthColors[passwordStrength]}`}>
                    {strengthLabels[passwordStrength]}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength ? strengthBarColors[passwordStrength] : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-0.5 pt-0.5">
                  {[
                    { label: "8+ characters", check: passwordChecks.length },
                    { label: "Uppercase", check: passwordChecks.uppercase },
                    { label: "Lowercase", check: passwordChecks.lowercase },
                    { label: "Number", check: passwordChecks.number },
                    { label: "Special char", check: passwordChecks.special },
                  ].map(({ label, check }) => (
                    <div key={label} className="flex items-center gap-1">
                      {check ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300" />
                      )}
                      <span className={`text-[10px] ${check ? "text-emerald-600" : "text-gray-400"}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(e) => updateForm("confirmPassword", e.target.value)}
                className={fieldErrors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
              />
              {form.confirmPassword && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {form.password === form.confirmPassword ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
              )}
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* PIN */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pin" className="text-sm font-medium">
                Transaction PIN <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  placeholder="4-6 digit PIN"
                  value={form.pin}
                  onChange={(e) => updateForm("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className={fieldErrors.pin ? "border-red-500 pr-10 tracking-[0.5em]" : "pr-10 tracking-[0.5em]"}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.pin && (
                <p className="text-xs text-red-500">{fieldErrors.pin}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPin" className="text-sm font-medium">
                Confirm PIN <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPin"
                  type={showPin ? "text" : "password"}
                  placeholder="Confirm PIN"
                  value={form.confirmPin}
                  onChange={(e) => updateForm("confirmPin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className={fieldErrors.confirmPin ? "border-red-500 pr-10 tracking-[0.5em]" : "pr-10 tracking-[0.5em]"}
                />
                {form.confirmPin && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {form.pin === form.confirmPin ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                )}
              </div>
              {fieldErrors.confirmPin && (
                <p className="text-xs text-red-500">{fieldErrors.confirmPin}</p>
              )}
            </div>
          </div>

          {/* Role */}
          {isAdmin && availableRoles.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select value={form.role} onValueChange={(v) => updateForm("role", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="teller">Teller</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="ict_staff">ICT Staff</SelectItem>
                  <SelectItem value="branch_manager">Branch Manager</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(form.role)}`}>
                <Shield className="h-3 w-3" />
                {form.role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </div>
            </div>
          )}

          {/* Employee role indicator */}
          {isEmployee && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Creating Customer Account
                </span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Employee accounts can only create Customer accounts.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create Account
            </Button>
          </DialogFooter>
        </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
