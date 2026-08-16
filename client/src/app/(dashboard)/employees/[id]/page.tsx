"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { ProfileUpload } from "@/components/ui/profile-upload";
import type { Employee } from "@/types";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  Hash,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Briefcase,
  Activity,
  TrendingUp,
  Clock,
  KeyRound,
  Settings,
  Eye,
  EyeOff,
  UserCog,
  CheckCircle,
  AlertCircle,
  Star,
  Award,
  BarChart3,
  AlertTriangle,
  XCircle,
  Lock,
  Edit,
} from "lucide-react";

interface EmployeeDetail extends Employee {
  user?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    phone: string;
    role: string;
    status: string;
    profile_picture?: string;
    last_login: string;
    created_at: string;
  } | null;
  loginHistory: Array<{
    id: number;
    ip_address: string;
    user_agent: string;
    browser: string;
    device: string;
    status: string;
    created_at: string;
  }>;
  recentAudits: Array<{
    id: number;
    action: string;
    category: string;
    description: string;
    created_at: string;
  }>;
  stats: {
    transactionsToday: number;
    totalTransactions: number;
    totalAmountProcessed: number;
  };
}

const DEPARTMENT_COLORS: Record<string, string> = {
  Operations: "from-blue-500 to-blue-600",
  "Customer Service": "from-emerald-500 to-emerald-600",
  Finance: "from-amber-500 to-amber-600",
  Loans: "from-purple-500 to-purple-600",
  IT: "from-cyan-500 to-cyan-600",
  ICT: "from-cyan-500 to-cyan-600",
};

const POSITIONS = [
  { value: "Teller", department: "Operations" },
  { value: "Customer Service Officer", department: "Customer Service" },
  { value: "Accountant", department: "Finance" },
  { value: "Loan Officer", department: "Loans" },
  { value: "ICT Officer", department: "ICT" },
] as const;

const POSITION_DEPARTMENT_MAP: Record<string, string> = {
  Teller: "Operations",
  "Customer Service Officer": "Customer Service",
  Accountant: "Finance",
  "Loan Officer": "Loans",
  "ICT Officer": "ICT",
};

export default function EmployeeProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const router = useRouter();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState("");

  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    salary: "",
    hire_date: "",
    branch: "",
    status: "active",
    profile_picture: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  const canViewCredentials = ["super_admin", "branch_manager", "ict_staff"].includes(user?.role || "");
  const canChangeRole = ["super_admin", "branch_manager"].includes(user?.role || "");
  const canEditEmployee = ["super_admin", "branch_manager", "manager"].includes(user?.role || "");

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/employees/${id}`);
      setEmployee(res.data);
    } catch {
      showError("Failed to fetch employee details");
      router.push("/employees");
    } finally {
      setLoading(false);
    }
  }, [id, showError, router]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const fetchCredentials = async () => {
    setCredentialsLoading(true);
    setShowCredentials(true);
    try {
      const endpoint = user?.role === "ict_staff"
        ? `/ict/users/${employee?.user?.id}/credentials`
        : `/admin/users/${employee?.user?.id}/credentials`;
      const res = await api.get(endpoint);
      setCredentials(res.data);
    } catch {
      showError("Failed to fetch credentials");
    } finally {
      setCredentialsLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!newRole || !employee) return;
    try {
      await api.put(`/admin/employees/${employee.id}/role`, { role: newRole });
      success(`Role changed to ${newRole}`);
      setShowRoleDialog(false);
      fetchEmployee();
    } catch {
      showError("Failed to change role");
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassword || !resetPasswordConfirm) return;
    if (resetPassword !== resetPasswordConfirm) {
      showError("Passwords do not match");
      return;
    }
    setResettingPassword(true);
    try {
      const endpoint = user?.role === "ict_staff"
        ? `/ict/users/${employee?.user?.id}/reset-password`
        : `/admin/employees/${employee?.id}/reset-password`;
      await api.put(endpoint, { password: resetPassword });
      success("Password reset successfully");
      setShowResetPasswordDialog(false);
      setResetPassword("");
      setResetPasswordConfirm("");
    } catch {
      showError("Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const openEditDialog = () => {
    if (!employee) return;
    setEditForm({
      full_name: employee.full_name,
      email: employee.user?.email || employee.email,
      phone: employee.user?.phone || employee.phone || "",
      position: employee.position || "",
      department: employee.department || "",
      salary: employee.salary ? String(employee.salary) : "",
      hire_date: employee.hire_date ? employee.hire_date.split("T")[0] : "",
      branch: employee.branch || "",
      status: employee.status || "active",
      profile_picture: employee.user?.profile_picture || employee.profile_picture || "",
    });
    setShowEditDialog(true);
  };

  const handleEditPositionChange = (position: string) => {
    const dept = POSITION_DEPARTMENT_MAP[position] || "";
    setEditForm((prev) => ({ ...prev, position, department: dept }));
  };

  const handleEditEmployee = async () => {
    if (!employee) return;
    try {
      setEditSaving(true);
      await api.put(`/admin/employees/${employee.id}`, {
        ...editForm,
        salary: editForm.salary ? Number(editForm.salary) : undefined,
        profile_picture: editForm.profile_picture || undefined,
      });
      success("Employee updated successfully");
      setShowEditDialog(false);
      fetchEmployee();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to update employee");
    } finally {
      setEditSaving(false);
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-cyan-500", "bg-rose-500"];
    const index = name?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager", "ict_staff"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!employee) return null;

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager", "ict_staff"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/employees")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">
                Employee Profile
              </h1>
              <p className="text-muted-foreground mt-1">
                Detailed information about {employee.full_name}
              </p>
            </div>
            {canEditEmployee && (
              <div className="flex gap-2">
                <Button onClick={openEditDialog} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
                {employee.user && canViewCredentials && (
                  <Button variant="outline" onClick={fetchCredentials} className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    Credentials
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowResetPasswordDialog(true)} className="gap-2">
                  <Lock className="h-4 w-4" />
                  Reset Password
                </Button>
                {canChangeRole && (
                  <Button variant="outline" onClick={() => { setNewRole(employee.user?.role || ""); setShowRoleDialog(true); }} className="gap-2">
                    <UserCog className="h-4 w-4" />
                    Change Role
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Profile Header Card */}
          <Card className="relative overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${DEPARTMENT_COLORS[employee.department] || "from-gray-500 to-gray-600"}`} />
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage
                    src={employee.user?.profile_picture || employee.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${employee.full_name}&backgroundColor=0a66c2`}
                    alt={employee.full_name}
                  />
                  <AvatarFallback className={`${getAvatarColor(employee.full_name)} text-white text-2xl font-bold`}>
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{employee.full_name}</h2>
                  <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail className="h-4 w-4" />
                    {employee.user?.email || employee.email}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className={getStatusColor(employee.status)}>
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      {employee.status}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Briefcase className="h-3 w-3" />
                      {employee.position}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary gap-1">
                      <Building2 className="h-3 w-3" />
                      {employee.department}
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-mono">
                      <Hash className="h-3 w-3" />
                      {employee.employee_id}
                    </Badge>
                  </div>
                </div>
                {employee.user && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Linked Account</p>
                    <p className="text-sm font-medium">{employee.user.username}</p>
                    <Badge variant="outline" className="mt-1 gap-1">
                      <User className="h-3 w-3" />
                      {employee.user.role}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Transactions</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{employee.stats.transactionsToday}</div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{employee.stats.totalTransactions}</div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Amount Processed</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatCurrency(employee.stats.totalAmountProcessed)}</div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Salary</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatCurrency(employee.salary)}</div>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full h-10 ${canViewCredentials ? "grid-cols-4" : "grid-cols-3"}`}>
              <TabsTrigger value="overview" className="text-xs gap-1">
                <User className="h-3 w-3" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs gap-1">
                <Activity className="h-3 w-3" />
                Activity
              </TabsTrigger>
              {canViewCredentials && (
                <TabsTrigger value="credentials" className="text-xs gap-1">
                  <KeyRound className="h-3 w-3" />
                  Credentials
                </TabsTrigger>
              )}
              <TabsTrigger value="settings" className="text-xs gap-1">
                <Settings className="h-3 w-3" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    Work Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Employee ID</p>
                      <p className="text-sm font-medium font-mono">{employee.employee_id || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {employee.phone || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Department</p>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {employee.department || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Position</p>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        {employee.position || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Salary</p>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        {employee.salary ? formatCurrency(employee.salary) : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Branch</p>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {employee.branch || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Hire Date</p>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {employee.hire_date ? formatDate(employee.hire_date) : formatDate(employee.created_at)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                      <Badge className={getStatusColor(employee.status)}>
                        {employee.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
                      <p className="text-sm font-medium">{formatDate(employee.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {employee.user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Username</p>
                        <p className="text-sm font-medium font-mono">{employee.user.username}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Role</p>
                        <Badge variant="outline" className="gap-1">
                          <UserCog className="h-3 w-3" />
                          {employee.user.role}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Status</p>
                        <Badge className={getStatusColor(employee.user.status)}>
                          {employee.user.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Login</p>
                        <p className="text-sm font-medium">
                          {employee.user.last_login ? formatDate(employee.user.last_login) : "Never"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Account Created</p>
                        <p className="text-sm font-medium">{formatDate(employee.user.created_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Login History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employee.loginHistory.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No login history available</p>
                  ) : (
                    <div className="space-y-3">
                      {employee.loginHistory.map((login) => (
                        <div key={login.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${login.status === "success" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                              {login.status === "success" ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{login.browser} on {login.device}</p>
                              <p className="text-xs text-muted-foreground">IP: {login.ip_address}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(login.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employee.recentAudits.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No recent activity</p>
                  ) : (
                    <div className="space-y-3">
                      {employee.recentAudits.map((audit) => (
                        <div key={audit.id} className="flex items-start gap-3 rounded-lg border p-3">
                          <div className="mt-0.5">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{audit.action}</p>
                            <p className="text-xs text-muted-foreground truncate">{audit.description}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(audit.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Credentials Tab */}
            {canViewCredentials && (
              <TabsContent value="credentials" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-muted-foreground" />
                      Login Credentials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!employee.user ? (
                      <p className="text-center py-8 text-muted-foreground">No linked user account</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Username</p>
                          <p className="text-sm font-medium font-mono">{employee.user.username}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</p>
                          <p className="text-sm font-medium">{employee.user.full_name}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Password</p>
                          <p className="text-sm font-medium font-mono">
                            {showPassword ? (credentials?.password || "••••••••") : "••••••••"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">PIN</p>
                          <p className="text-sm font-medium font-mono">
                            {showPin ? (credentials?.pin || "••••") : "••••"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Reset Password</p>
                        <p className="text-xs text-muted-foreground">Change the employee&apos;s login password</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setShowResetPasswordDialog(true)}>
                      Reset
                    </Button>
                  </div>

                  {canChangeRole && employee.user && (
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <UserCog className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Change Role</p>
                          <p className="text-xs text-muted-foreground">Current: {employee.user.role}</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => { setNewRole(employee.user!.role); setShowRoleDialog(true); }}>
                        Change
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Account Status</p>
                        <p className="text-xs text-muted-foreground">Current: {employee.status}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(employee.status)}>
                      {employee.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Credentials Dialog */}
        <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Login Credentials
              </DialogTitle>
              <DialogDescription>
                Sensitive login information for {employee.full_name}
              </DialogDescription>
            </DialogHeader>
            {credentialsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : credentials ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                    <span className="text-sm font-mono flex-1">{credentials.username}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                    <span className="text-sm font-mono flex-1">
                      {showPassword ? credentials.password : "••••••••"}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>PIN</Label>
                  <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
                    <span className="text-sm font-mono flex-1">
                      {showPin ? credentials.pin : "••••"}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPin(!showPin)}>
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">No credentials available</p>
            )}
          </DialogContent>
        </Dialog>

        {/* Role Change Dialog */}
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Change Role
              </DialogTitle>
              <DialogDescription>
                Change the role for {employee.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teller">Teller</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="ict_staff">ICT Staff</SelectItem>
                  <SelectItem value="branch_manager">Branch Manager</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
              <Button onClick={handleRoleChange}>Change Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Reset Password
              </DialogTitle>
              <DialogDescription>
                Set a new password for {employee.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>Cancel</Button>
              <Button onClick={handleResetPassword} disabled={resettingPassword}>
                {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Employee Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Employee Profile
              </DialogTitle>
              <DialogDescription>
                Update all employee information including profile picture.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 pb-2">
                <ProfileUpload
                  value={editForm.profile_picture}
                  onChange={(_file, preview) => {
                    if (preview && _file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditForm({ ...editForm, profile_picture: reader.result as string });
                      };
                      reader.readAsDataURL(_file);
                    } else {
                      setEditForm({ ...editForm, profile_picture: "" });
                    }
                  }}
                  size="lg"
                />
                <p className="text-xs text-muted-foreground">Click to upload profile picture</p>
              </div>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="Enter phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Position *</Label>
                <Select value={editForm.position} onValueChange={handleEditPositionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={editForm.department} disabled className="bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salary</Label>
                  <Input
                    type="number"
                    value={editForm.salary}
                    onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hire Date *</Label>
                  <Input
                    type="date"
                    value={editForm.hire_date}
                    onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input
                    value={editForm.branch}
                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                    placeholder="Enter branch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleEditEmployee} disabled={editSaving}>
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
