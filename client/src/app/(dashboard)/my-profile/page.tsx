'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { profileApi, ProfileData } from '@/lib/profile-api';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { ProfileUpload } from '@/components/ui/profile-upload';
import { formatDate, getRoleLabel, getStatusColor } from '@/lib/utils';
import {
  User,
  Lock,
  Key,
  Save,
  Edit,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Camera,
  Loader2,
  CreditCard,
  Building2,
  BadgeCheck,
  UserCircle,
  Fingerprint,
  X,
} from 'lucide-react';

export default function MyProfilePage() {
  const router = useRouter();
  const { user: authUser, updateUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    dob: '',
    gender: '',
    national_id: '',
    mother_name: '',
  });

  const [usernameForm, setUsernameForm] = useState({
    username: '',
    current_password: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [pinForm, setPinForm] = useState({
    current_pin: '',
    new_pin: '',
    confirm_pin: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileApi.getMyProfile();
      setProfile(data);
      setEditForm({
        full_name: data.user.full_name || '',
        phone: data.user.phone || '',
        email: data.user.email || '',
        address: data.user.address || '',
        dob: data.user.dob ? data.user.dob.split('T')[0] : '',
        gender: data.user.gender || '',
        national_id: data.user.national_id || '',
        mother_name: (data.user as any).mother_name || '',
      });
      setUsernameForm({ username: data.user.username, current_password: '' });
    } catch (error) {
      toastError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      const result = await profileApi.updateMyProfile(editForm);
      toastSuccess('Profile updated successfully');
      if (updateUser && result.user) {
        updateUser(result.user);
      }
      loadProfile();
    } catch (error: any) {
      toastError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!usernameForm.username.trim() || usernameForm.username.length < 3) {
      toastError('Username must be at least 3 characters');
      return;
    }
    if (!usernameForm.current_password) {
      toastError('Current password is required');
      return;
    }
    try {
      setSaving(true);
      const result = await profileApi.changeUsername(usernameForm.username, usernameForm.current_password);
      toastSuccess('Username changed successfully');
      setIsUsernameDialogOpen(false);
      setUsernameForm({ username: result.username, current_password: '' });
      loadProfile();
    } catch (error: any) {
      toastError(error.response?.data?.error || 'Failed to change username');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toastError('All fields are required');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toastError('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toastError('Passwords do not match');
      return;
    }
    try {
      setSaving(true);
      await profileApi.changePassword(passwordForm.current_password, passwordForm.new_password);
      toastSuccess('Password changed successfully');
      setIsPasswordDialogOpen(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      toastError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePin = async () => {
    if (!pinForm.current_pin || !pinForm.new_pin) {
      toastError('All fields are required');
      return;
    }
    if (!/^\d{4,6}$/.test(pinForm.new_pin)) {
      toastError('PIN must be 4-6 digits');
      return;
    }
    if (pinForm.new_pin !== pinForm.confirm_pin) {
      toastError('PINs do not match');
      return;
    }
    try {
      setSaving(true);
      await profileApi.changePin(pinForm.current_pin, pinForm.new_pin);
      toastSuccess('PIN changed successfully');
      setIsPinDialogOpen(false);
      setPinForm({ current_pin: '', new_pin: '', confirm_pin: '' });
    } catch (error: any) {
      toastError(error.response?.data?.error || 'Failed to change PIN');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#1F8A4D]" />
          <span className="text-sm text-gray-500">Loading profile...</span>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="h-24 w-24 animate-pulse rounded-full bg-gray-200" />
                <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                    <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <UserCircle className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">Profile not found</h3>
        <p className="text-sm text-gray-400 mt-1">Unable to load your profile information.</p>
        <Button onClick={loadProfile} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const user = profile.user;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">My Profile</h1>
            <p className="mt-1 text-gray-500">Manage your personal information and security settings.</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 border-gray-200 w-fit">
          <Shield className="h-3 w-3" />
          {getRoleLabel(user.role)}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div className="absolute bottom-0 right-0">
                <ProfileUpload
                  value={user.profile_picture || ''}
                  onChange={async (file) => {
                    if (!file) return;
                    setUploadingPicture(true);
                    try {
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const base64 = reader.result as string;
                        await profileApi.updateMyProfile({ profile_picture: base64 } as any);
                        if (updateUser) {
                          updateUser({ ...user, profile_picture: base64 });
                        }
                        toastSuccess('Profile picture updated');
                        setUploadingPicture(false);
                      };
                      reader.readAsDataURL(file);
                    } catch {
                      toastError('Failed to update profile picture');
                      setUploadingPicture(false);
                    }
                  }}
                  size="sm"
                />
              </div>
            </div>
            <h2 className="mt-3 text-xl font-bold text-white">{user.full_name}</h2>
            <p className="text-sm text-green-100">@{user.username}</p>
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
                <Badge className={`${getStatusColor(user.status)} border text-xs`}>
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
                <Badge className={user.hasPin ? 'bg-green-100 text-green-800 border-green-200 border text-xs' : 'bg-gray-100 text-gray-800 border-gray-200 border text-xs'}>
                  {user.hasPin ? 'Set' : 'Not Set'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700 w-full justify-start">
              <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-[#1F8A4D] data-[state=active]:text-white">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-[#1F8A4D] data-[state=active]:text-white">
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F8A4D] to-[#155c34] text-white">
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
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          placeholder="Enter your full name"
                          className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="Enter your phone number"
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
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="Enter your email"
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
                          value={editForm.dob}
                          onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                          className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Gender</Label>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Select value={editForm.gender} onValueChange={(value) => setEditForm({ ...editForm, gender: value })}>
                          <SelectTrigger className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">National ID</Label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={editForm.national_id}
                          onChange={(e) => setEditForm({ ...editForm, national_id: e.target.value })}
                          placeholder="Enter national ID number"
                          className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Mother's Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={editForm.mother_name}
                          onChange={(e) => setEditForm({ ...editForm, mother_name: e.target.value })}
                          placeholder="Enter mother's name"
                          className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Role</Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={getRoleLabel(user.role)}
                          disabled
                          className="pl-10 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 h-11 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Branch</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={user.branch || 'N/A'}
                          disabled
                          className="pl-10 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 h-11 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Status</Label>
                      <div className="relative">
                        <BadgeCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          value={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          disabled
                          className="pl-10 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 h-11 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        placeholder="Enter your address"
                        className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-gray-100 pt-4">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="bg-gradient-to-r from-[#1F8A4D] to-[#155c34] text-white shadow-lg shadow-green-200 hover:from-[#155c34] hover:to-[#0e4224] h-11 px-8"
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

            <TabsContent value="security">
              <div className="space-y-4">
                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Username</CardTitle>
                          <CardDescription>Your current username for login.</CardDescription>
                        </div>
                      </div>
                      <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Edit className="h-4 w-4" />
                            Change
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Change Username</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>New Username</Label>
                              <Input
                                value={usernameForm.username}
                                onChange={(e) => setUsernameForm({ ...usernameForm, username: e.target.value })}
                                placeholder="Enter new username"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Current Password</Label>
                              <Input
                                type="password"
                                value={usernameForm.current_password}
                                onChange={(e) => setUsernameForm({ ...usernameForm, current_password: e.target.value })}
                                placeholder="Enter current password"
                              />
                            </div>
                            <Button onClick={handleChangeUsername} disabled={saving} className="w-full">
                              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {saving ? 'Changing...' : 'Change Username'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Current username: <span className="font-medium text-gray-900 dark:text-white">@{profile.user.username}</span>
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Password</CardTitle>
                          <CardDescription>Update your account password for security.</CardDescription>
                        </div>
                      </div>
                      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Edit className="h-4 w-4" />
                            Change
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Change Password</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Current Password</Label>
                              <Input
                                type="password"
                                value={passwordForm.current_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                placeholder="Enter current password"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>New Password</Label>
                              <div className="relative">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  value={passwordForm.new_password}
                                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                  placeholder="Enter new password"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Confirm New Password</Label>
                              <Input
                                type="password"
                                value={passwordForm.confirm_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                placeholder="Confirm new password"
                              />
                            </div>
                            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                              <p className="text-sm text-amber-800">Password must be at least 8 characters long.</p>
                            </div>
                            <Button onClick={handleChangePassword} disabled={saving} className="w-full">
                              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {saving ? 'Changing...' : 'Change Password'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Last changed: <span className="font-medium text-gray-900 dark:text-white">Keep your password secure</span>
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                          <Key className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Transaction PIN</CardTitle>
                          <CardDescription>Used for transaction verification and authorization.</CardDescription>
                        </div>
                      </div>
                      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Edit className="h-4 w-4" />
                            Change
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Change PIN</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Current PIN</Label>
                              <Input
                                type="password"
                                value={pinForm.current_pin}
                                onChange={(e) => setPinForm({ ...pinForm, current_pin: e.target.value })}
                                placeholder="Enter current PIN"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>New PIN (4-6 digits)</Label>
                              <Input
                                type="password"
                                value={pinForm.new_pin}
                                onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value })}
                                placeholder="Enter new PIN"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Confirm New PIN</Label>
                              <Input
                                type="password"
                                value={pinForm.confirm_pin}
                                onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value })}
                                placeholder="Confirm new PIN"
                              />
                            </div>
                            <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
                              <p className="text-sm text-violet-800">PIN must be 4-6 digits. It will be used for transaction authorization.</p>
                            </div>
                            <Button onClick={handleChangePin} disabled={saving} className="w-full">
                              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {saving ? 'Changing...' : 'Change PIN'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">
                        PIN Status: <span className="font-medium text-gray-900 dark:text-white">{user.hasPin ? 'Set' : 'Not Set'}</span>
                      </p>
                      <Badge className={user.hasPin ? 'bg-green-100 text-green-800 border-green-200 border text-xs' : 'bg-gray-100 text-gray-800 border-gray-200 border text-xs'}>
                        {user.hasPin ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
