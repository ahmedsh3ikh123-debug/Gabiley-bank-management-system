"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { useDataRefresh } from "@/contexts/data-refresh-context";
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getRoleLabel } from "@/lib/utils";
import type { User } from "@/types";
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  ShieldCheck,
  XCircle,
  Download,
  Loader2,
  Plus,
  Lock,
  KeyRound,
  FileText,
  CreditCard,
  Shield,
  MapPin,
  Hash,
  Building2,
  Clock,
  Globe,
  Smartphone,
  AlertTriangle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  History,
  Settings,
  Filter,
  UserIcon,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Ban,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";

interface CustomerDetail {
  user: User & {
    profile_picture?: string;
    mother_name?: string;
    gender?: string;
    branch?: string;
    details?: {
      account_number?: string;
      account_type?: string;
    };
  };
  accounts: {
    id: number;
    account_number: string;
    account_type: string;
    balance: number;
    status: string;
    currency: string;
    created_at: string;
  }[];
  transactions: {
    id: number;
    type: string;
    amount: number;
    description: string;
    status: string;
    created_at: string;
    from_account_number?: string;
    to_account_number?: string;
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
  failed_login_attempts?: number;
  documents?: {
    name: string;
    type: string;
    uploaded_at: string;
  }[];
  timeline?: {
    action: string;
    description: string;
    date: string;
    icon: string;
  }[];
}

interface CustomerForm {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  gender: string;
  mother_name: string;
  account_type: string;
}

const ACCOUNT_TYPES = [
  { value: "savings", label: "Savings" },
  { value: "current", label: "Current" },
  { value: "fixed_deposit", label: "Fixed Deposit" },
  { value: "customer", label: "Customer" },
];

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

const initialForm: CustomerForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  gender: "",
  mother_name: "",
  account_type: "savings",
};

const ITEMS_PER_PAGE = 10;

export default function CustomersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { registerRefresh, notifyChange } = useDataRefresh();
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showResetPinDialog, setShowResetPinDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState("overview");

  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetPin, setResetPin] = useState("");
  const [resetPinConfirm, setResetPinConfirm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { role: "customer" };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/admin/users", { params });
      setCustomers(res.data);
    } catch {
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const unsub = registerRefresh("customers", fetchCustomers);
    return unsub;
  }, [registerRefresh, fetchCustomers]);

  const openDetailsDialog = async (customer: User) => {
    setSelectedCustomer(customer);
    setShowDetailsDialog(true);
    setDetailsLoading(true);
    setDetailsTab("overview");
    try {
      const res = await api.get(`/admin/users/${customer.id}/details`);
      setCustomerDetails(res.data);
    } catch {
      toast.error("Failed to fetch customer details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post("/admin/users", { ...form, role: "customer" });
      toast.success("Customer created successfully");
      setShowCreateDialog(false);
      setForm(initialForm);
      fetchCustomers();
      notifyChange("customers");
      notifyChange("users");
      notifyChange("dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      setSubmitting(true);
      const { password, ...payload } = form;
      await api.put(`/admin/users/${selectedCustomer.id}`, payload);
      toast.success("Customer updated successfully");
      setShowEditDialog(false);
      setSelectedCustomer(null);
      setForm(initialForm);
      fetchCustomers();
      notifyChange("customers");
      notifyChange("users");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update customer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlock = async (customer: User) => {
    try {
      await api.put(`/admin/users/${customer.id}/block`);
      toast.success("Customer blocked successfully");
      fetchCustomers();
      notifyChange("customers");
      notifyChange("users");
    } catch {
      toast.error("Failed to block customer");
    }
  };

  const handleUnblock = async (customer: User) => {
    try {
      await api.put(`/admin/users/${customer.id}/unblock`);
      toast.success("Customer unblocked successfully");
      fetchCustomers();
      notifyChange("customers");
      notifyChange("users");
    } catch {
      toast.error("Failed to unblock customer");
    }
  };

  const handleActivate = async (customer: User) => {
    try {
      await api.put(`/employee/users/${customer.id}/activate`);
      toast.success("Customer activated successfully");
      fetchCustomers();
      notifyChange("customers");
      notifyChange("users");
    } catch {
      toast.error("Failed to activate customer");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (resetPassword !== resetPasswordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      setSubmitting(true);
      await api.put(`/admin/users/${selectedCustomer.id}/reset-password`, {
        password: resetPassword,
      });
      toast.success("Password reset successfully");
      setShowResetPasswordDialog(false);
      setSelectedCustomer(null);
      setResetPassword("");
      setResetPasswordConfirm("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (resetPin !== resetPinConfirm) {
      toast.error("PINs do not match");
      return;
    }
    try {
      setSubmitting(true);
      await api.put(`/admin/users/${selectedCustomer.id}/reset-pin`, {
        pin: resetPin,
      });
      toast.success("PIN reset successfully");
      setShowResetPinDialog(false);
      setSelectedCustomer(null);
      setResetPin("");
      setResetPinConfirm("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset PIN");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    try {
      setSubmitting(true);
      await api.delete(`/admin/users/${selectedCustomer.id}`);
      toast.success("Customer deleted successfully");
      setShowDeleteDialog(false);
      setSelectedCustomer(null);
      fetchCustomers();
      notifyChange("customers");
      notifyChange("users");
      notifyChange("dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete customer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/admin/users/export", {
        params: { role: "customer" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "customers.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    } catch {
      toast.error("Failed to export customers");
    }
  };

  const openEditDialog = (customer: User) => {
    setSelectedCustomer(customer);
    setForm({
      full_name: customer.full_name,
      email: customer.email,
      password: "",
      phone: customer.phone || "",
      address: customer.address || "",
      gender: customer.gender || "",
      mother_name: customer.mother_name || "",
      account_type: "savings",
    });
    setProfilePreview(customer.profile_picture || "");
    setProfileFile(null);
    setShowEditDialog(true);
  };

  const openResetPasswordDialog = (customer: User) => {
    setSelectedCustomer(customer);
    setResetPassword("");
    setResetPasswordConfirm("");
    setShowResetPasswordDialog(true);
  };

  const openResetPinDialog = (customer: User) => {
    setSelectedCustomer(customer);
    setResetPin("");
    setResetPinConfirm("");
    setShowResetPinDialog(true);
  };

  const openDeleteDialog = (customer: User) => {
    setSelectedCustomer(customer);
    setShowDeleteDialog(true);
  };

  const activeCount = customers.filter((c) => c.status === "active").length;
  const blockedCount = customers.filter((c) => c.status === "blocked").length;
  const suspendedCount = customers.filter((c) => c.status === "frozen").length;

  const filteredCustomers = useMemo(() => {
    return customers;
  }, [customers]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getAvatarColor = (name: string) => {
    const index = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "customer_service"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "customer_service"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] flex items-center gap-2">
                <Users className="h-8 w-8 text-[#1F8A4D]" />
                Customer Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage bank customers, accounts, and security settings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => { setForm(initialForm); setProfilePreview(""); setProfileFile(null); setShowCreateDialog(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Customer
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{customers.length}</div>
                <p className="text-xs text-muted-foreground mt-1">All registered customers</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{activeCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Blocked</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{blockedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Blocked accounts</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{suspendedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Suspended accounts</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </Card>
          </div>

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
                    <SelectItem value="pending">Pending</SelectItem>
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
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Account</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Joined</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16">
                        <div className="flex flex-col items-center">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Users className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <p className="text-muted-foreground font-medium mb-1">No customers found</p>
                          <p className="text-sm text-muted-foreground/70">
                            {debouncedSearch || statusFilter !== "all"
                              ? "Try adjusting your search or filters"
                              : "Get started by adding your first customer"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCustomers.map((customer) => (
                      <TableRow key={customer.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                              {customer.profile_picture ? (
                                <AvatarImage
                                  src={customer.profile_picture}
                                  alt={customer.full_name}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${customer.full_name}&backgroundColor=0a66c2`}
                                  alt={customer.full_name}
                                />
                              )}
                              <AvatarFallback className={`${getAvatarColor(customer.full_name)} text-white text-sm font-semibold`}>
                                {getInitials(customer.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{customer.full_name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {customer.phone || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-muted-foreground">
                            {(customer as any).details?.account_number || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(customer.status)} font-medium`}>
                            {customer.status === "frozen" ? "Suspended" : customer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(customer.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => openDetailsDialog(customer)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => openDetailsDialog(customer)} className="gap-2">
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(customer)} className="gap-2">
                                  <Edit className="h-4 w-4" />
                                  Edit Customer
                                </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {customer.status === "pending" ? (
                                <DropdownMenuItem onClick={() => handleActivate(customer)} className="gap-2 text-emerald-600">
                                  <CheckCircle className="h-4 w-4" />
                                  Approve Customer
                                </DropdownMenuItem>
                              ) : customer.status === "active" ? (
                                <DropdownMenuItem onClick={() => handleBlock(customer)} className="gap-2 text-amber-600">
                                  <Ban className="h-4 w-4" />
                                  Block Customer
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleUnblock(customer)} className="gap-2 text-emerald-600">
                                  <CheckCircle className="h-4 w-4" />
                                  Unblock Customer
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openResetPasswordDialog(customer)} className="gap-2">
                                <KeyRound className="h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openResetPinDialog(customer)} className="gap-2">
                                <Lock className="h-4 w-4" />
                                Reset PIN
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDeleteDialog(customer)} className="gap-2 text-destructive">
                                <Trash2 className="h-4 w-4" />
                                Delete Customer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} of{" "}
                    {filteredCustomers.length} customers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                Add New Customer
              </DialogTitle>
              <DialogDescription>
                Create a new customer account in the banking system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex justify-center">
                <ProfileUpload
                  value={profilePreview}
                  onChange={(file, preview) => { setProfileFile(file); setProfilePreview(preview); }}
                  size="lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">Full Name *</Label>
                <Input
                  id="create-name"
                  placeholder="Enter full name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-mother">Mother's Full Name *</Label>
                <Input
                  id="create-mother"
                  placeholder="Enter mother's full name"
                  value={form.mother_name}
                  onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email *</Label>
                  <Input
                    id="create-email"
                    type="email"
                    placeholder="Enter email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">Password *</Label>
                  <Input
                    id="create-password"
                    type="password"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-phone">Phone</Label>
                  <Input
                    id="create-phone"
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-gender">Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(value) => setForm({ ...form, gender: value })}
                  >
                    <SelectTrigger id="create-gender">
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
                <Label htmlFor="create-address">Address</Label>
                <Textarea
                  id="create-address"
                  placeholder="Enter address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select
                  value={form.account_type}
                  onValueChange={(value) => setForm({ ...form, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Customer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Edit className="h-4 w-4 text-primary" />
                </div>
                Edit Customer
              </DialogTitle>
              <DialogDescription>
                Update customer information and details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="flex justify-center">
                <ProfileUpload
                  value={profilePreview}
                  onChange={(file, preview) => { setProfileFile(file); setProfilePreview(preview); }}
                  size="lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter full name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mother">Mother's Full Name *</Label>
                <Input
                  id="edit-mother"
                  placeholder="Enter mother's full name"
                  value={form.mother_name}
                  onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(value) => setForm({ ...form, gender: value })}
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
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  placeholder="Enter address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                Reset Password
              </DialogTitle>
              <DialogDescription>
                Reset the password for {selectedCustomer?.full_name}. They will need to use the new password to log in.
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
              {resetPassword && resetPasswordConfirm && resetPassword !== resetPasswordConfirm && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Passwords do not match
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !resetPassword || resetPassword !== resetPasswordConfirm}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showResetPinDialog} onOpenChange={setShowResetPinDialog}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                Reset PIN
              </DialogTitle>
              <DialogDescription>
                Reset the PIN for {selectedCustomer?.full_name}. This is used for transaction authentication.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pin">New PIN</Label>
                <Input
                  id="new-pin"
                  type="password"
                  placeholder="Enter new PIN"
                  value={resetPin}
                  onChange={(e) => setResetPin(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Confirm PIN</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  placeholder="Confirm new PIN"
                  value={resetPinConfirm}
                  onChange={(e) => setResetPinConfirm(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>
              {resetPin && resetPinConfirm && resetPin !== resetPinConfirm && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  PINs do not match
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowResetPinDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !resetPin || resetPin !== resetPinConfirm}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset PIN
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
                Delete Customer
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-foreground">{selectedCustomer?.full_name}</span>?
                This action cannot be undone and will remove all associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                Customer Profile
              </DialogTitle>
            </DialogHeader>
            {detailsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : customerDetails ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                    {customerDetails.user.profile_picture ? (
                      <AvatarImage
                        src={customerDetails.user.profile_picture}
                        alt={customerDetails.user.full_name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${customerDetails.user.full_name}&backgroundColor=0a66c2`}
                        alt={customerDetails.user.full_name}
                      />
                    )}
                    <AvatarFallback className={`${getAvatarColor(customerDetails.user.full_name)} text-white text-xl font-bold`}>
                      {getInitials(customerDetails.user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{customerDetails.user.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{customerDetails.user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={`${getStatusColor(customerDetails.user.status)} font-medium`}>
                        {customerDetails.user.status === "frozen" ? "Suspended" : customerDetails.user.status}
                      </Badge>
                      <Badge variant="secondary">
                        {getRoleLabel(customerDetails.user.role)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Tabs value={detailsTab} onValueChange={setDetailsTab}>
                  <TabsList className="grid w-full grid-cols-6 h-10">
                    <TabsTrigger value="overview" className="text-xs gap-1">
                      <UserIcon className="h-3 w-3" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="text-xs gap-1">
                      <Activity className="h-3 w-3" />
                      Transactions
                    </TabsTrigger>
                    <TabsTrigger value="loans" className="text-xs gap-1">
                      <CreditCard className="h-3 w-3" />
                      Loans
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="text-xs gap-1">
                      <FileText className="h-3 w-3" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="text-xs gap-1">
                      <History className="h-3 w-3" />
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs gap-1">
                      <Settings className="h-3 w-3" />
                      Settings
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 mt-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {customerDetails.user.phone || "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Gender</p>
                          <p className="text-sm font-medium capitalize">{customerDetails.user.gender || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Mother's Name</p>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {customerDetails.user.mother_name || "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Address</p>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {customerDetails.user.address || "N/A"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Branch</p>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {customerDetails.user.branch || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        Account Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Registration Date</p>
                          <p className="text-sm font-medium">{formatDate(customerDetails.user.created_at)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Login</p>
                          <p className="text-sm font-medium">
                            {customerDetails.user.last_login ? formatDateTime(customerDetails.user.last_login) : "Never"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {customerDetails.accounts.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Accounts</h4>
                        <div className="space-y-2">
                          {customerDetails.accounts.map((acc) => (
                            <div key={acc.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                  <CreditCard className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium font-mono">{acc.account_number}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {acc.account_type.replace(/_/g, " ")} &middot; {acc.currency}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(acc.balance, acc.currency)}</p>
                                <Badge className={getStatusColor(acc.status)} variant="outline">
                                  {acc.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {customerDetails.transactions.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Recent Transactions</h4>
                        <div className="space-y-2">
                          {customerDetails.transactions.slice(0, 5).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between rounded-lg border p-3">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.type === "deposit" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                                  {tx.type === "deposit" ? (
                                    <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium capitalize">{tx.type}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {tx.description || "—"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${tx.type === "deposit" ? "text-emerald-600" : "text-red-600"}`}>
                                  {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="transactions" className="space-y-4 mt-4">
                    {customerDetails.transactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No transactions found</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerDetails.transactions.map((tx) => (
                              <TableRow key={tx.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${tx.type === "deposit" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                                      {tx.type === "deposit" ? (
                                        <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
                                      ) : (
                                        <ArrowUpRight className="h-3 w-3 text-red-500" />
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="capitalize">{tx.type}</Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className={`font-semibold ${tx.type === "deposit" ? "text-emerald-600" : "text-red-600"}`}>
                                    {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                  {tx.description || "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDate(tx.created_at)}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="loans" className="space-y-4 mt-4">
                    {!customerDetails.loans || customerDetails.loans.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No loan history</p>
                        <p className="text-sm mt-1">Customer has no loan records.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerDetails.loans.map((loan) => (
                          <div key={loan.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-semibold">{formatCurrency(loan.amount)}</p>
                                <p className="text-xs text-muted-foreground">{loan.purpose}</p>
                              </div>
                              <Badge className={getStatusColor(loan.status)}>{loan.status}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{loan.term_months} months</span>
                              <span>Applied: {formatDate(loan.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 mt-4">
                    {!customerDetails.documents || customerDetails.documents.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No documents uploaded</p>
                        <p className="text-sm mt-1">Customer documents will appear here once uploaded.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customerDetails.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{doc.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{doc.type}</p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(doc.uploaded_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-4 mt-4">
                    {!customerDetails.timeline || customerDetails.timeline.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No activity timeline</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                        <div className="space-y-4">
                          {customerDetails.timeline.map((event, idx) => (
                            <div key={idx} className="relative flex items-start gap-4 pl-10">
                              <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                              <div className="flex-1 rounded-lg border p-3">
                                <p className="text-sm font-medium">{event.action}</p>
                                <p className="text-xs text-muted-foreground">{event.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">{formatDate(event.date)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-6 mt-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="text-sm font-semibold mb-1">Failed Login Attempts</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Number of consecutive failed login attempts
                      </p>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={Math.min((customerDetails.failed_login_attempts || 0) * 20, 100)}
                          className="h-2 flex-1"
                        />
                        <Badge
                          variant={(customerDetails.failed_login_attempts || 0) > 0 ? "destructive" : "secondary"}
                        >
                          {customerDetails.failed_login_attempts || 0}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDetailsDialog(false);
                          openResetPasswordDialog(customerDetails.user);
                        }}
                        className="gap-2"
                      >
                        <KeyRound className="h-4 w-4" />
                        Reset Password
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDetailsDialog(false);
                          openResetPinDialog(customerDetails.user);
                        }}
                        className="gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        Reset PIN
                      </Button>
                    </div>

                    {customerDetails.login_history && customerDetails.login_history.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Login History</h4>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>IP Address</TableHead>
                                <TableHead>Browser</TableHead>
                                <TableHead>Device</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customerDetails.login_history.map((login, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <span className="text-sm flex items-center gap-1">
                                      <Globe className="h-3 w-3 text-muted-foreground" />
                                      {login.ip}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm">{login.browser}</TableCell>
                                  <TableCell>
                                    <span className="text-sm flex items-center gap-1">
                                      <Smartphone className="h-3 w-3 text-muted-foreground" />
                                      {login.device}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {formatDate(login.date)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(login.status)}>{login.status}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
