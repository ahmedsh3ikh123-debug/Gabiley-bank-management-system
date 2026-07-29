"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import api from "@/lib/api";
import { formatDate, getRoleLabel } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Save,
  Loader2,
  Shield,
  Camera,
  Key,
  CreditCard,
  Clock,
  CheckCircle,
  Edit3,
} from "lucide-react";

function ProfileContent() {
  const { user, updateUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [settingPin, setSettingPin] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    dob: user?.dob ? user.dob.split("T")[0] : "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [pinForm, setPinForm] = useState({
    current_pin: "",
    new_pin: "",
    confirm_pin: "",
  });

  const handleProfileUpdate = async () => {
    try {
      setSaving(true);
      const res = await api.put("/auth/profile", profileForm);
      const updatedUser = res.data.user || res.data.data;
      if (updatedUser) {
        updateUser({ ...user!, ...updatedUser });
      }
      success("Profile updated successfully");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to update profile";
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toastError("Please fill in both password fields");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toastError("New passwords do not match");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toastError("Password must be at least 6 characters");
      return;
    }
    try {
      setChangingPassword(true);
      await api.post("/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      success("Password changed successfully");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to change password";
      toastError(message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePinSet = async () => {
    if (!pinForm.new_pin || !pinForm.confirm_pin) {
      toastError("Please fill in both PIN fields");
      return;
    }
    if (pinForm.new_pin !== pinForm.confirm_pin) {
      toastError("PINs do not match");
      return;
    }
    if (pinForm.new_pin.length !== 4) {
      toastError("PIN must be exactly 4 digits");
      return;
    }
    try {
      setSettingPin(true);
      await api.post("/auth/set-pin", {
        current_pin: pinForm.current_pin || undefined,
        new_pin: pinForm.new_pin,
      });
      success(user?.hasPin ? "Transaction PIN updated" : "Transaction PIN set successfully");
      setPinForm({ current_pin: "", new_pin: "", confirm_pin: "" });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to set PIN";
      toastError(message);
    } finally {
      setSettingPin(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">My Profile</h1>
          <p className="mt-1 text-gray-500">Manage your account settings and personal information.</p>
        </div>
        <Badge variant="outline" className="gap-1 border-gray-200 w-fit">
          <Shield className="h-3 w-3" />
          {getRoleLabel(user.role)}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Overview */}
        <Card className="md:col-span-1 shadow-md overflow-hidden">
          <div className="bg-gradient-to-br from-[#1F8A4D] to-[#155c34] p-6 text-center">
            <div className="relative inline-block">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-white text-3xl font-bold border-4 border-white/30 overflow-hidden">
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.full_name}
                    className="h-24 w-24 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <span className={user.profile_picture ? 'sr-only' : ''}>
                  {user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-3 text-xl font-bold text-white">{user.full_name}</h2>
            <p className="text-sm text-blue-100">@{user.username}</p>
            <Badge className="mt-2 bg-white/20 text-white border-0 text-xs">
              {getRoleLabel(user.role)}
            </Badge>
          </div>

          <CardContent className="p-5 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.address && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{user.address}</span>
                </div>
              )}
              {user.dob && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(user.dob)}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge
                  className={`${user.status === "active" ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"} border text-xs`}
                >
                  {user.status}
                </Badge>
              </div>
              {user.branch && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Branch</span>
                  <span className="font-medium text-gray-900 dark:text-white">{user.branch}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Member Since</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatDate(user.created_at)}</span>
              </div>
              {user.last_login && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Login</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(user.last_login)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction PIN</span>
                <Badge className={user.hasPin ? "bg-green-100 text-green-800 border-green-200 border text-xs" : "bg-gray-100 text-gray-800 border-gray-200 border text-xs"}>
                  {user.hasPin ? "Set" : "Not Set"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700 w-full justify-start">
              <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </TabsTrigger>
              <TabsTrigger value="password" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Lock className="h-4 w-4" />
                Password
              </TabsTrigger>
              <TabsTrigger value="pin" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Key className="h-4 w-4" />
                Transaction PIN
              </TabsTrigger>
            </TabsList>

            {/* Edit Profile */}
            <TabsContent value="profile">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Personal Information</CardTitle>
                      <CardDescription>Update your personal details and contact information.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={profileForm.full_name}
                          onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                          placeholder="Enter your full name"
                          className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="Enter your email"
                          className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          placeholder="Enter your phone number"
                          className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Date of Birth</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="date"
                          value={profileForm.dob}
                          onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                          className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        placeholder="Enter your address"
                        className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-gray-100 pt-4">
                  <Button
                    onClick={handleProfileUpdate}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-blue-800 h-11 px-8"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Change Password */}
            <TabsContent value="password">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Change Password</CardTitle>
                      <CardDescription>Update your account password for security.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Current Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="password"
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                        placeholder="Enter current password"
                        className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="password"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        placeholder="Enter new password"
                        className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                        placeholder="Confirm new password"
                        className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-sm text-amber-800">Password must be at least 6 characters long.</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-gray-100 pt-4">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200 hover:from-amber-600 hover:to-orange-700 h-11 px-8"
                  >
                    {changingPassword ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    Change Password
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Transaction PIN */}
            <TabsContent value="pin">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      <Key className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Transaction PIN</CardTitle>
                      <CardDescription>
                        {user.hasPin ? "Update your 4-digit transaction PIN." : "Set a 4-digit transaction PIN for secure transfers."}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {user.hasPin && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Current PIN</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="password"
                          maxLength={4}
                          value={pinForm.current_pin}
                          onChange={(e) => setPinForm({ ...pinForm, current_pin: e.target.value })}
                          placeholder="Enter current PIN"
                          className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">New PIN</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="password"
                        maxLength={4}
                        value={pinForm.new_pin}
                        onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value })}
                        placeholder="Enter 4-digit PIN"
                        className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Confirm New PIN</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="password"
                        maxLength={4}
                        value={pinForm.confirm_pin}
                        onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value })}
                        placeholder="Confirm 4-digit PIN"
                        className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                    <p className="text-sm text-violet-800">Your PIN must be exactly 4 digits. It will be used for transaction authorization.</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-gray-100 pt-4">
                  <Button
                    onClick={handlePinSet}
                    disabled={settingPin}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200 hover:from-violet-600 hover:to-purple-700 h-11 px-8"
                  >
                    {settingPin ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Key className="mr-2 h-4 w-4" />
                    )}
                    {user.hasPin ? "Update PIN" : "Set PIN"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ProfileContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
