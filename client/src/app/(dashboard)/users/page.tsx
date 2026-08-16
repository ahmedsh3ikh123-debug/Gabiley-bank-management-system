"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ProfileUpload } from "@/components/ui/profile-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { useDataRefresh } from "@/contexts/data-refresh-context";
import {
  formatDate,
  formatCurrency,
  getStatusColor,
  getRoleLabel,
} from "@/lib/utils";
import type { User } from "@/types";
import { CreateUserModal } from "@/components/users/create-user-modal";
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  Eye,
  Edit,
  Trash2,
  ShieldCheck,
  XCircle,
  Loader2,
  Plus,
  KeyRound,
  FileText,
  CreditCard,
  Building2,
  Clock,
  Activity,
  Settings,
  Filter,
  UserIcon,
  AlertCircle,
  CheckCircle,
  X,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download,
  Crown,
  UserCog,
  Users2,
  Ban,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from "lucide-react";

interface UserDetail {
  user: User & {
    profile_picture?: string;
    mother_name?: string;
    branch?: string;
    employee_id?: string;
    department?: string;
    position?: string;
    salary?: number;
    account_number?: string;
    account_type?: string;
    balance?: number;
  };
  accounts: {
    id: number;
    account_number: string;
    account_type: string;
    balance: number;
    status: string;
  }[];
  transactions: {
    id: number;
    type: string;
    amount: number;
    description: string;
    status: string;
    created_at: string;
  }[];
  loans?: {
    id: number;
    amount: number;
    term_months: number;
    purpose: string;
    status: string;
    created_at: string;
  }[];
  login_history?: {
    ip: string;
    browser: string;
    device: string;
    date: string;
    status: string;
  }[];
}

interface UserWithExtra extends User {
  employee_id?: string;
  department?: string;
  position?: string;
  salary?: number;
  account_number?: string;
  account_type?: string;
  balance?: number;
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
];

const ROLE_TABS = [
  { value: "all", label: "All Users", icon: Users },
  { value: "customer", label: "Customers", icon: UserIcon },
  { value: "employee", label: "Employees", icon: UserCog },
  { value: "admin", label: "Admins", icon: Crown },
];

const ITEMS_PER_PAGE = 12;

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { registerRefresh, notifyChange } = useDataRefresh();
  const [users, setUsers] = useState<UserWithExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    gender: "",
    mother_name: "",
    branch: "",
  });
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState("overview");
  const [userCredentials, setUserCredentials] = useState<any>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      const endpoint = ["teller", "customer_service", "accountant", "ict_staff"].includes(user?.role || "") ? "/employee/users" : "/admin/users";
      const res = await api.get(endpoint, { params });
      setUsers(res.data);
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, toast, user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, activeTab]);

  useEffect(() => {
    const unsub = registerRefresh("users", fetchUsers);
    return unsub;
  }, [registerRefresh, fetchUsers]);

  const openDetailsDialog = async (u: User) => {
    setSelectedUser(u);
    setShowDetailsDialog(true);
    setDetailsLoading(true);
    setDetailsTab("overview");
    setUserCredentials(null);
    try {
      const endpoint = ["teller", "customer_service", "accountant", "ict_staff"].includes(user?.role || "") ? `/employee/users/${u.id}/details` : `/admin/users/${u.id}/details`;
      const res = await api.get(endpoint);
      setUserDetails(res.data);
    } catch {
      toast.error("Failed to fetch user details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchUserCredentials = async (userId: number) => {
    setCredentialsLoading(true);
    try {
      const endpoint = ["teller", "customer_service", "ict_staff"].includes(user?.role || "") ? `/employee/users/${userId}/credentials` : `/admin/users/${userId}/credentials`;
      const res = await api.get(endpoint);
      setUserCredentials(res.data);
    } catch {
      toast.error("Failed to fetch credentials");
    } finally {
      setCredentialsLoading(false);
    }
  };

  const openEditDialog = (u: User) => {
    setSelectedUser(u);
    setForm({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || "",
      address: u.address || "",
      gender: u.gender || "",
      mother_name: u.mother_name || "",
      branch: u.branch || "",
    });
    setProfilePreview(u.profile_picture || "");
    setProfileFile(null);
    setShowEditDialog(true);
  };

  const openResetPasswordDialog = (u: User) => {
    setSelectedUser(u);
    setResetPassword("");
    setResetPasswordConfirm("");
    setShowResetPasswordDialog(true);
  };

  const openDeleteDialog = (u: User) => {
    setSelectedUser(u);
    setShowDeleteDialog(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      await api.put(`/admin/users/${selectedUser.id}`, form);

      if (profileFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          await api.put(`/admin/users/${selectedUser.id}/profile-picture`, { profile_picture: base64 });
          toast.success("Profile picture updated");
          fetchUsers();
          notifyChange("users");
          notifyChange("employees");
          notifyChange("customers");
        };
        reader.readAsDataURL(profileFile);
      }

      toast.success("User updated successfully");
      setShowEditDialog(false);
      setSelectedUser(null);
      fetchUsers();
      notifyChange("users");
      notifyChange("employees");
      notifyChange("customers");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPassword !== resetPasswordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      setSubmitting(true);
      const endpoint = user?.role === "ict_staff" ? `/ict/users/${selectedUser.id}/reset-password` : `/admin/users/${selectedUser.id}/reset-password`;
      await api.put(endpoint, {
        password: resetPassword,
      });
      toast.success("Password reset successfully");
      setShowResetPasswordDialog(false);
      setSelectedUser(null);
      setResetPassword("");
      setResetPasswordConfirm("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlock = async (u: User) => {
    try {
      await api.put(`/admin/users/${u.id}/block`);
      toast.success("User blocked successfully");
      fetchUsers();
      notifyChange("users");
      notifyChange("customers");
    } catch {
      toast.error("Failed to block user");
    }
  };

  const handleUnblock = async (u: User) => {
    try {
      await api.put(`/admin/users/${u.id}/unblock`);
      toast.success("User unblocked successfully");
      fetchUsers();
      notifyChange("users");
      notifyChange("customers");
    } catch {
      toast.error("Failed to unblock user");
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      await api.delete(`/admin/users/${selectedUser.id}`);
      toast.success("User deleted successfully");
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchUsers();
      notifyChange("users");
      notifyChange("employees");
      notifyChange("customers");
      notifyChange("dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/admin/users/export", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "users-export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    } catch {
      toast.error("Failed to export users");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (activeTab === "all") return true;
    if (activeTab === "admin")
      return u.role === "super_admin" || u.role === "branch_manager" || u.role === "manager";
    if (activeTab === "employee")
      return [
        "teller",
        "customer_service",
        "accountant",
        "ict_staff",
      ].includes(u.role);
    if (activeTab === "customer") return u.role === "customer";
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getAvatarColor = (name: string) => {
    const index = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  const getRoleBadge = (role: string) => {
    if (role === "super_admin" || role === "branch_manager" || role === "manager")
      return "bg-red-100 text-red-800 border-red-200";
    if (
      ["teller", "customer_service", "accountant", "ict_staff"].includes(role)
    )
      return "bg-green-100 text-green-800 border-green-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getRoleIcon = (role: string) => {
    if (role === "super_admin" || role === "branch_manager" || role === "manager")
      return <Crown className="h-3 w-3" />;
    if (
      ["teller", "customer_service", "accountant", "ict_staff"].includes(role)
    )
      return <UserCog className="h-3 w-3" />;
    return <UserIcon className="h-3 w-3" />;
  };

  const adminCount = users.filter(
    (u) => u.role === "super_admin" || u.role === "branch_manager" || u.role === "manager"
  ).length;
  const employeeCount = users.filter(
    (u) =>
      ["teller", "customer_service", "accountant", "ict_staff"].includes(
        u.role
      )
  ).length;
  const customerCount = users.filter((u) => u.role === "customer").length;
  const activeCount = users.filter((u) => u.status === "active").length;

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager", "teller", "customer_service", "accountant", "ict_staff"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager", "teller", "customer_service", "accountant", "ict_staff"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Users className="h-7 w-7 text-[#1F8A4D]" />
                User Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage all user accounts, roles, and permissions
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {user?.role !== "customer_service" && user?.role !== "accountant" && user?.role !== "ict_staff" && user?.role !== "teller" && (
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              )}
              {user?.role !== "customer_service" && user?.role !== "accountant" && user?.role !== "ict_staff" && user?.role !== "teller" && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card
              className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
              onClick={() => router.push("/employees")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Employees
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <UserCog className="h-5 w-5 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">
                  {employeeCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Staff accounts
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 group-hover:h-1.5 transition-all" />
            </Card>
            <Card
              className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
              onClick={() => router.push("/customers")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Customers
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <Users2 className="h-5 w-5 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">
                  {customerCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Customer accounts
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 group-hover:h-1.5 transition-all" />
            </Card>
            <Card
              className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
              onClick={() => {
                setActiveTab("admin");
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Admins
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <Crown className="h-5 w-5 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {adminCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin accounts
                </p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 group-hover:h-1.5 transition-all" />
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700">
              {ROLE_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="frozen">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold">
                          User
                        </TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="font-semibold">
                          ID / Account
                        </TableHead>
                        <TableHead className="font-semibold">Phone</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">
                          Branch
                        </TableHead>
                        <TableHead className="font-semibold">
                          Joined
                        </TableHead>
                        <TableHead className="text-right font-semibold">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-16"
                          >
                            <div className="flex flex-col items-center">
                              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Users className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                              <p className="text-muted-foreground font-medium mb-1">
                                No users found
                              </p>
                              <p className="text-sm text-muted-foreground/70">
                                {searchQuery || statusFilter !== "all"
                                  ? "Try adjusting your search or filters"
                                  : "Get started by adding your first user"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedUsers.map((u) => {
                          return (
                            <TableRow key={u.id} className="group">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                                    {u.profile_picture ? (
                                      <AvatarImage
                                        src={u.profile_picture}
                                        alt={u.full_name}
                                        onError={(e) => {
                                          (
                                            e.target as HTMLImageElement
                                          ).style.display = "none";
                                        }}
                                      />
                                    ) : (
                                      <AvatarImage
                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name}&backgroundColor=0a66c2`}
                                        alt={u.full_name}
                                      />
                                    )}
                                    <AvatarFallback
                                      className={`${getAvatarColor(u.full_name)} text-white text-sm font-semibold`}
                                    >
                                      {getInitials(u.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-sm">
                                      {u.full_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {u.email}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${getRoleBadge(u.role)} border text-xs font-medium gap-1`}
                                >
                                  {getRoleIcon(u.role)}
                                  {getRoleLabel(u.role)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {u.employee_id ? (
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-mono font-medium text-emerald-700">
                                      {u.employee_id}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {u.department || "—"} · {u.position || "—"}
                                    </p>
                                  </div>
                                ) : u.account_number ? (
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-mono font-medium text-blue-700">
                                      {u.account_number}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {u.account_type || "savings"}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  {u.phone || "N/A"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`${getStatusColor(u.status)} font-medium`}
                                >
                                  {u.status === "frozen"
                                    ? "Suspended"
                                    : u.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                  <Building2 className="h-3.5 w-3.5" />
                                  {u.branch || "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(u.created_at)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onClick={() => openDetailsDialog(u)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-48"
                                    >
                                      <DropdownMenuItem
                                        onClick={() => openDetailsDialog(u)}
                                        className="gap-2"
                                      >
                                        <Eye className="h-4 w-4" />
                                        View Details
                                      </DropdownMenuItem>
                                      {user?.role !== "customer_service" && user?.role !== "accountant" && user?.role !== "teller" && user?.role !== "ict_staff" && (
                                        <DropdownMenuItem
                                          onClick={() => openEditDialog(u)}
                                          className="gap-2"
                                        >
                                          <Edit className="h-4 w-4" />
                                          Edit User
                                        </DropdownMenuItem>
                                      )}
                                    {user?.role !== "customer_service" && user?.role !== "accountant" && user?.role !== "teller" && user?.role !== "ict_staff" && (
                                      <>
                                    <DropdownMenuSeparator />
                                    {u.status === "active" ? (
                                      <DropdownMenuItem
                                        onClick={() => handleBlock(u)}
                                        className="gap-2 text-amber-600"
                                      >
                                        <Ban className="h-4 w-4" />
                                        Block User
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => handleUnblock(u)}
                                        className="gap-2 text-emerald-600"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                        Unblock User
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openResetPasswordDialog(u)
                                      }
                                      className="gap-2"
                                    >
                                      <KeyRound className="h-4 w-4" />
                                      Reset Password
                                    </DropdownMenuItem>
                                    {u.role !== "super_admin" && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => openDeleteDialog(u)}
                                          className="gap-2 text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Delete User
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                      </>
                                    )}
                                    {user?.role === "ict_staff" && (
                                      <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        openResetPasswordDialog(u)
                                      }
                                      className="gap-2"
                                    >
                                      <KeyRound className="h-4 w-4" />
                                      Reset Password
                                    </DropdownMenuItem>
                                      </>
                                    )}
                                   </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                        {Math.min(
                          currentPage * ITEMS_PER_PAGE,
                          filteredUsers.length
                        )}{" "}
                        of {filteredUsers.length} users
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from(
                          { length: Math.min(5, totalPages) },
                          (_, i) => {
                            let page: number;
                            if (totalPages <= 5) {
                              page = i + 1;
                            } else if (currentPage <= 3) {
                              page = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              page = totalPages - 4 + i;
                            } else {
                              page = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={page}
                                variant={
                                  currentPage === page ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="h-8 w-8 p-0"
                              >
                                {page}
                              </Button>
                            );
                          }
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <CreateUserModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onUserCreated={() => {
            fetchUsers();
            notifyChange("users");
            notifyChange("employees");
            notifyChange("customers");
            notifyChange("dashboard");
          }}
        />

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Edit className="h-4 w-4 text-primary" />
                </div>
                Edit User
              </DialogTitle>
              <DialogDescription>
                Update user information and details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              {["super_admin", "branch_manager", "manager", "ict_staff"].includes(user?.role || "") && (
              <div className="flex justify-center">
                <ProfileUpload
                  value={profilePreview}
                  onChange={(file, preview) => { setProfileFile(file); setProfilePreview(preview); }}
                  size="lg"
                />
              </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter full name"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="Enter email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(value) =>
                      setForm({ ...form, gender: value })
                    }
                  >
                    <SelectTrigger id="edit-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mother">Mother's Full Name</Label>
                <Input
                  id="edit-mother"
                  placeholder="Enter mother's full name"
                  value={form.mother_name}
                  onChange={(e) =>
                    setForm({ ...form, mother_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  placeholder="Enter address"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showResetPasswordDialog}
          onOpenChange={setShowResetPasswordDialog}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                Reset Password
              </DialogTitle>
              <DialogDescription>
                Reset the password for {selectedUser?.full_name}. They will
                need to use the new password to log in.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  required
                />
              </div>
              {resetPassword &&
                resetPasswordConfirm &&
                resetPassword !== resetPasswordConfirm && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Passwords do not match
                  </p>
                )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResetPasswordDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !resetPassword ||
                    resetPassword !== resetPasswordConfirm
                  }
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Reset Password
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                Delete User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-foreground">
                  {selectedUser?.full_name}
                </span>
                ? This action cannot be undone and will remove all associated
                data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                User Profile
              </DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userDetails ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                    {userDetails.user.profile_picture ? (
                      <AvatarImage
                        src={userDetails.user.profile_picture}
                        alt={userDetails.user.full_name}
                        onError={(e) => {
                          (
                            e.target as HTMLImageElement
                          ).style.display = "none";
                        }}
                      />
                    ) : (
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${userDetails.user.full_name}&backgroundColor=0a66c2`}
                        alt={userDetails.user.full_name}
                      />
                    )}
                    <AvatarFallback
                      className={`${getAvatarColor(userDetails.user.full_name)} text-white text-xl font-bold`}
                    >
                      {getInitials(userDetails.user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">
                      {userDetails.user.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {userDetails.user.email}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge
                        className={`${getStatusColor(userDetails.user.status)} font-medium`}
                      >
                        {userDetails.user.status === "frozen"
                          ? "Suspended"
                          : userDetails.user.status}
                      </Badge>
                      <Badge className={`${getRoleBadge(userDetails.user.role)} border text-xs font-medium gap-1`}>
                        {getRoleIcon(userDetails.user.role)}
                        {getRoleLabel(userDetails.user.role)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Tabs value={detailsTab} onValueChange={setDetailsTab}>
                  <TabsList className="grid w-full grid-cols-5 h-10">
                    <TabsTrigger
                      value="overview"
                      className="text-xs gap-1"
                    >
                      <UserIcon className="h-3 w-3" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="accounts"
                      className="text-xs gap-1"
                    >
                      <CreditCard className="h-3 w-3" />
                      Accounts
                    </TabsTrigger>
                    <TabsTrigger
                      value="transactions"
                      className="text-xs gap-1"
                    >
                      <Activity className="h-3 w-3" />
                      Transactions
                    </TabsTrigger>
                    <TabsTrigger
                      value="credentials"
                      className="text-xs gap-1"
                    >
                      <KeyRound className="h-3 w-3" />
                      Credentials
                    </TabsTrigger>
                    <TabsTrigger
                      value="settings"
                      className="text-xs gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      Settings
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="overview"
                    className="space-y-6 mt-4"
                  >
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Phone
                          </p>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {userDetails.user.phone || "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Gender
                          </p>
                          <p className="text-sm font-medium capitalize">
                            {userDetails.user.gender || "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Mother's Name
                          </p>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {userDetails.user.mother_name || "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Branch
                          </p>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {userDetails.user.branch || "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Joined
                          </p>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDate(userDetails.user.created_at)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Status
                          </p>
                          <Badge
                            className={`${getStatusColor(userDetails.user.status)} font-medium`}
                          >
                            {userDetails.user.status === "frozen"
                              ? "Suspended"
                              : userDetails.user.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {userDetails.accounts &&
                      userDetails.accounts.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            Accounts ({userDetails.accounts.length})
                          </h4>
                          <div className="space-y-2">
                            {userDetails.accounts.map((acc) => (
                              <div
                                key={acc.id}
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <CreditCard className="h-5 w-5 text-blue-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-mono font-medium">
                                      {acc.account_number}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {acc.account_type}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold">
                                    {formatCurrency(acc.balance)}
                                  </p>
                                  <Badge
                                    className={`${getStatusColor(acc.status)} text-xs`}
                                  >
                                    {acc.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    {userDetails.loans &&
                      userDetails.loans.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Loans ({userDetails.loans.length})
                          </h4>
                          <div className="space-y-2">
                            {userDetails.loans.map((loan) => (
                              <div
                                key={loan.id}
                                className="flex items-center justify-between rounded-lg border p-3"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {formatCurrency(loan.amount)} -{" "}
                                    {loan.term_months} months
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {loan.purpose}
                                  </p>
                                </div>
                                <Badge
                                  className={`${getStatusColor(loan.status)} font-medium`}
                                >
                                  {loan.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </TabsContent>

                  <TabsContent
                    value="accounts"
                    className="space-y-4 mt-4"
                  >
                    {userDetails.accounts &&
                    userDetails.accounts.length > 0 ? (
                      userDetails.accounts.map((acc) => (
                        <Card key={acc.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                                  <CreditCard className="h-6 w-6" />
                                </div>
                                <div>
                                  <p className="font-mono font-semibold">
                                    {acc.account_number}
                                  </p>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {acc.account_type} Account
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold">
                                  {formatCurrency(acc.balance)}
                                </p>
                                <Badge
                                  className={`${getStatusColor(acc.status)} font-medium`}
                                >
                                  {acc.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No accounts found</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent
                    value="transactions"
                    className="space-y-4 mt-4"
                  >
                    {userDetails.transactions &&
                    userDetails.transactions.length > 0 ? (
                      <div className="space-y-2">
                        {userDetails.transactions.map((txn) => (
                          <div
                            key={txn.id}
                            className="flex items-center gap-3 rounded-lg border p-3"
                          >
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                txn.type === "deposit"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : txn.type === "withdrawal"
                                    ? "bg-red-500/10 text-red-500"
                                    : "bg-blue-500/10 text-blue-500"
                              }`}
                            >
                              {txn.type === "deposit" ? (
                                <ArrowUpRight className="h-5 w-5" />
                              ) : txn.type === "withdrawal" ? (
                                <ArrowDownLeft className="h-5 w-5" />
                              ) : (
                                <RefreshCw className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium capitalize">
                                {txn.type}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {txn.description || "No description"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm font-bold ${
                                  txn.type === "deposit"
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {txn.type === "deposit" ? "+" : "-"}
                                {formatCurrency(txn.amount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(txn.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No transactions found</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="credentials" className="space-y-6 mt-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                        Login Credentials
                      </h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        View this user's username, password, and PIN
                      </p>
                      {credentialsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : userCredentials ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Username</p>
                              <p className="text-sm font-medium font-mono bg-muted p-2 rounded">{userCredentials.username}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</p>
                              <p className="text-sm font-medium bg-muted p-2 rounded">{userCredentials.full_name}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Password</p>
                              <p className="text-sm font-medium font-mono bg-muted p-2 rounded">{userCredentials.password}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">PIN</p>
                              <p className="text-sm font-medium font-mono bg-muted p-2 rounded">{userCredentials.pin}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => selectedUser && fetchUserCredentials(selectedUser.id)}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Load Credentials
                        </Button>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="settings"
                    className="space-y-4 mt-4"
                  >
                    {user?.role !== "customer_service" && user?.role !== "accountant" && user?.role !== "teller" && user?.role !== "ict_staff" && (
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDetailsDialog(false);
                            if (selectedUser) openEditDialog(selectedUser);
                          }}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit User
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDetailsDialog(false);
                            if (selectedUser) openResetPasswordDialog(selectedUser);
                          }}
                          className="gap-2"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </Button>
                      </div>
                    )}
                    {user?.role === "ict_staff" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDetailsDialog(false);
                          if (selectedUser) openResetPasswordDialog(selectedUser);
                        }}
                        className="w-full gap-2"
                      >
                        <KeyRound className="h-4 w-4" />
                        Reset Password
                      </Button>
                    )}
                    {user?.role !== "customer_service" && user?.role !== "accountant" && user?.role !== "teller" && user?.role !== "ict_staff" && selectedUser?.role !== "super_admin" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDetailsDialog(false);
                          if (selectedUser) openDeleteDialog(selectedUser);
                        }}
                        className="w-full gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete User
                      </Button>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <UserIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No user data available</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}


