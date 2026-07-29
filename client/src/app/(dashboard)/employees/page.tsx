"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { useDataRefresh } from "@/contexts/data-refresh-context";
import { formatDate, formatCurrency, getStatusColor, DEPARTMENTS } from "@/lib/utils";
import type { Employee } from "@/types";
import {
  UserCog,
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Users,
  ShieldCheck,
  XCircle,
  Loader2,
  KeyRound,
  AlertTriangle,
  Briefcase,
  DollarSign,
  Clock,
  Activity,
  TrendingUp,
  BarChart3,
  Hash,
  MapPin,
  Star,
  X,
  Settings,
  User,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Target,
  Award,
  Zap,
} from "lucide-react";

const MAX_EMPLOYEES = 3;

const POSITIONS = [
  { value: "Teller", label: "Teller", department: "Operations" },
  { value: "Customer Service Officer", label: "Customer Service Officer", department: "Customer Service" },
  { value: "Accountant", label: "Accountant", department: "Finance" },
  { value: "Loan Officer", label: "Loan Officer", department: "Loans" },
  { value: "ICT Officer", label: "ICT Officer", department: "IT" },
] as const;

const POSITION_DEPARTMENT_MAP: Record<string, string> = {
  Teller: "Operations",
  "Customer Service Officer": "Customer Service",
  Accountant: "Finance",
  "Loan Officer": "Loans",
  "ICT Officer": "IT",
};

const DEPARTMENT_COLORS: Record<string, string> = {
  Operations: "from-blue-500 to-blue-600",
  "Customer Service": "from-emerald-500 to-emerald-600",
  Finance: "from-amber-500 to-amber-600",
  Loans: "from-purple-500 to-purple-600",
  IT: "from-cyan-500 to-cyan-600",
  "Human Resources": "from-rose-500 to-rose-600",
  Marketing: "from-indigo-500 to-indigo-600",
  Compliance: "from-teal-500 to-teal-600",
  "Risk Management": "from-orange-500 to-orange-600",
};

const DEPARTMENT_AVATAR_COLORS: Record<string, string> = {
  Operations: "bg-blue-500",
  "Customer Service": "bg-emerald-500",
  Finance: "bg-amber-500",
  Loans: "bg-purple-500",
  IT: "bg-cyan-500",
  "Human Resources": "bg-rose-500",
  Marketing: "bg-indigo-500",
  Compliance: "bg-teal-500",
  "Risk Management": "bg-orange-500",
};

interface EmployeePerformance {
  total_transactions: number;
  total_amount_processed: number;
  avg_rating: number;
  customer_feedback_count: number;
  recent_activity: {
    action: string;
    description: string;
    date: string;
  }[];
}

interface EmployeeForm {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  salary: string;
  hire_date: string;
  branch: string;
  password: string;
}

const initialForm: EmployeeForm = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  department: "",
  salary: "",
  hire_date: "",
  branch: "",
  password: "",
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { registerRefresh, notifyChange } = useDataRefresh();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState("");

  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeePerformance, setEmployeePerformance] = useState<EmployeePerformance | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState("overview");

  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (departmentFilter !== "all") params.department = departmentFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/admin/employees", { params });
      setEmployees(res.data);
    } catch {
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, departmentFilter, statusFilter, toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const unsub = registerRefresh("employees", fetchEmployees);
    return unsub;
  }, [registerRefresh, fetchEmployees]);

  const openDetailsDialog = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsDialog(true);
    setPerformanceLoading(true);
    setEmployeePerformance(null);
    setDetailsTab("overview");
    try {
      const res = await api.get(`/admin/employees/${employee.id}/performance`);
      setEmployeePerformance(res.data);
    } catch {
      toast.error("Failed to load performance data");
    } finally {
      setPerformanceLoading(false);
    }
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setForm({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone || "",
      position: employee.position || "",
      department: employee.department || "",
      salary: employee.salary ? String(employee.salary) : "",
      hire_date: employee.hire_date ? employee.hire_date.split("T")[0] : "",
      branch: employee.branch || "",
      password: "",
    });
    setShowEditDialog(true);
  };

  const openResetPasswordDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setResetPassword("");
    setResetPasswordConfirm("");
    setShowResetPasswordDialog(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteDialog(true);
  };

  const openRoleDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewRole("");
    setShowRoleDialog(true);
  };

  const handleRoleChange = async () => {
    if (!selectedEmployee || !newRole) return;
    try {
      setSubmitting(true);
      await api.put(`/admin/employees/${selectedEmployee.id}/role`, { role: newRole });
      toast.success(`Role changed to ${newRole}`);
      setShowRoleDialog(false);
      setSelectedEmployee(null);
      fetchEmployees();
      notifyChange("employees");
      notifyChange("users");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to change role");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePositionChange = (position: string) => {
    const dept = POSITION_DEPARTMENT_MAP[position] || "";
    setForm((prev) => ({ ...prev, position, department: dept }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employees.length >= MAX_EMPLOYEES) {
      toast.error(`Cannot add more employees. Maximum limit of ${MAX_EMPLOYEES} reached.`);
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/admin/employees", {
        ...form,
        salary: form.salary ? Number(form.salary) : undefined,
      });
      toast.success("Employee created successfully");
      setShowCreateDialog(false);
      setForm(initialForm);
      fetchEmployees();
      notifyChange("employees");
      notifyChange("users");
      notifyChange("dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      setSubmitting(true);
      const { password, ...payload } = form;
      const updatePayload = { ...payload, salary: payload.salary ? Number(payload.salary) : undefined };
      await api.put(`/admin/employees/${selectedEmployee.id}`, updatePayload);
      toast.success("Employee updated successfully");
      setShowEditDialog(false);
      setSelectedEmployee(null);
      setForm(initialForm);
      fetchEmployees();
      notifyChange("employees");
      notifyChange("users");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (resetPassword !== resetPasswordConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      setSubmitting(true);
      await api.put(`/admin/employees/${selectedEmployee.id}/reset-password`, {
        password: resetPassword,
      });
      toast.success("Password reset successfully");
      setShowResetPasswordDialog(false);
      setSelectedEmployee(null);
      setResetPassword("");
      setResetPasswordConfirm("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    try {
      setSubmitting(true);
      await api.delete(`/admin/employees/${selectedEmployee.id}`);
      toast.success("Employee deleted successfully");
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
      fetchEmployees();
      notifyChange("employees");
      notifyChange("users");
      notifyChange("dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete employee");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = employees.filter((e) => e.status === "active").length;
  const inactiveCount = employees.filter((e) => e.status === "inactive").length;
  const departmentCount = new Set(employees.map((e) => e.department).filter(Boolean)).size;
  const atMaxCapacity = employees.length >= MAX_EMPLOYEES;
  const capacityPercentage = (employees.length / MAX_EMPLOYEES) * 100;

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  const getDeptColor = (dept: string) => {
    return DEPARTMENT_COLORS[dept] || "from-gray-500 to-gray-600";
  };

  const getDeptAvatarColor = (dept: string) => {
    return DEPARTMENT_AVATAR_COLORS[dept] || "bg-gray-500";
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["super_admin", "branch_manager"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white flex items-center gap-2">
                <UserCog className="h-8 w-8 text-[#1F8A4D]" />
                Employee Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage bank employees, positions, and access
              </p>
            </div>
            <Button
              onClick={() => {
                setForm(initialForm);
                setShowCreateDialog(true);
              }}
              disabled={atMaxCapacity}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </div>

          <Card className="relative overflow-hidden border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950 dark:to-orange-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Capacity</h3>
                    <span className="text-sm font-bold text-amber-700">
                      {employees.length}/{MAX_EMPLOYEES} slots used
                    </span>
                  </div>
                  <Progress value={capacityPercentage} className="h-2.5 bg-amber-100" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {atMaxCapacity
                      ? "Maximum employee limit reached. Delete an employee to add new ones."
                      : `${MAX_EMPLOYEES - employees.length} slots remaining`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{employees.length}</div>
                <p className="text-xs text-muted-foreground mt-1">All staff members</p>
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
                <p className="text-xs text-muted-foreground mt-1">Active employees</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{inactiveCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Inactive employees</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{departmentCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Active departments</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or employee ID..."
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
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {employees.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-1">No employees found</p>
                  <p className="text-sm text-muted-foreground/70">
                    {searchQuery || departmentFilter !== "all" || statusFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : atMaxCapacity
                      ? "Maximum employee limit reached"
                      : "Get started by adding your first employee"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((employee) => (
                <Card key={employee.id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-200">
                  <div className={`h-2 bg-gradient-to-r ${getDeptColor(employee.department)}`} />
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${employee.full_name}&backgroundColor=0a66c2`}
                            alt={employee.full_name}
                          />
                          <AvatarFallback className={`${getDeptAvatarColor(employee.department)} text-white text-lg font-bold`}>
                            {getInitials(employee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-base">{employee.full_name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {employee.email}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(employee.status)}>
                        {employee.status}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{employee.position || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs">
                          {employee.department || "N/A"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-3.5 w-3.5" />
                        <span className="font-mono text-xs">{employee.employee_id || "—"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => openDetailsDialog(employee)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => openEditDialog(employee)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResetPasswordDialog(employee)}
                        className="gap-1.5"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRoleDialog(employee)}
                        className="gap-1.5"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(employee)}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  Add New Employee
                </DialogTitle>
                <DialogDescription>
                  Create a new employee account ({employees.length}/{MAX_EMPLOYEES} slots used).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
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
                    <Label htmlFor="create-phone">Phone</Label>
                    <Input
                      id="create-phone"
                      placeholder="Enter phone number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Position *</Label>
                  <Select
                    value={form.position}
                    onValueChange={handlePositionChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((pos) => (
                        <SelectItem key={pos.value} value={pos.value}>
                          {pos.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={form.department}
                    disabled
                    placeholder="Auto-assigned based on position"
                    className="bg-muted"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-salary">Salary</Label>
                    <Input
                      id="create-salary"
                      type="number"
                      placeholder="0.00"
                      value={form.salary}
                      onChange={(e) => setForm({ ...form, salary: e.target.value })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-hire-date">Hire Date *</Label>
                    <Input
                      id="create-hire-date"
                      type="date"
                      value={form.hire_date}
                      onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-branch">Branch</Label>
                  <Input
                    id="create-branch"
                    placeholder="Enter branch name"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
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
                    minLength={6}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Employee
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
                  Edit Employee
                </DialogTitle>
                <DialogDescription>
                  Update employee information and details.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEdit} className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      placeholder="Enter phone number"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Position *</Label>
                  <Select
                    value={form.position}
                    onValueChange={handlePositionChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((pos) => (
                        <SelectItem key={pos.value} value={pos.value}>
                          {pos.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={form.department}
                    disabled
                    placeholder="Auto-assigned based on position"
                    className="bg-muted"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-salary">Salary</Label>
                    <Input
                      id="edit-salary"
                      type="number"
                      placeholder="0.00"
                      value={form.salary}
                      onChange={(e) => setForm({ ...form, salary: e.target.value })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-hire-date">Hire Date *</Label>
                    <Input
                      id="edit-hire-date"
                      type="date"
                      value={form.hire_date}
                      onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-branch">Branch</Label>
                  <Input
                    id="edit-branch"
                    placeholder="Enter branch name"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
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

          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  Employee Profile
                </DialogTitle>
              </DialogHeader>
              {selectedEmployee && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                    <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedEmployee.full_name}&backgroundColor=0a66c2`}
                        alt={selectedEmployee.full_name}
                      />
                      <AvatarFallback className={`${getDeptAvatarColor(selectedEmployee.department)} text-white text-xl font-bold`}>
                        {getInitials(selectedEmployee.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{selectedEmployee.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedEmployee.email}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className={getStatusColor(selectedEmployee.status)}>
                          {selectedEmployee.status}
                        </Badge>
                        <Badge variant="secondary">
                          {selectedEmployee.position || "N/A"}
                        </Badge>
                        {selectedEmployee.department && (
                          <Badge className="bg-primary/10 text-primary">
                            {selectedEmployee.department}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Tabs value={detailsTab} onValueChange={setDetailsTab}>
                    <TabsList className="grid w-full grid-cols-3 h-10">
                      <TabsTrigger value="overview" className="text-xs gap-1">
                        <User className="h-3 w-3" />
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="performance" className="text-xs gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Performance
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="text-xs gap-1">
                        <Settings className="h-3 w-3" />
                        Settings
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 mt-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          Work Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Employee ID</p>
                            <p className="text-sm font-medium font-mono">{selectedEmployee.employee_id || "—"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {selectedEmployee.phone || "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Department</p>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {selectedEmployee.department || "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Position</p>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                              {selectedEmployee.position || "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Salary</p>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                              {selectedEmployee.salary ? formatCurrency(selectedEmployee.salary) : "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Branch</p>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {selectedEmployee.branch || "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Hire Date</p>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {selectedEmployee.hire_date
                                ? formatDate(selectedEmployee.hire_date)
                                : formatDate(selectedEmployee.created_at)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                            <Badge className={getStatusColor(selectedEmployee.status)}>
                              {selectedEmployee.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="performance" className="space-y-6 mt-4">
                      {performanceLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : employeePerformance ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-3 gap-4">
                            <Card className="text-center">
                              <CardContent className="pt-4 pb-3">
                                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                                  <Activity className="h-5 w-5 text-blue-500" />
                                </div>
                                <p className="text-2xl font-bold">{employeePerformance.total_transactions}</p>
                                <p className="text-xs text-muted-foreground">Transactions</p>
                              </CardContent>
                            </Card>
                            <Card className="text-center">
                              <CardContent className="pt-4 pb-3">
                                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                                  <DollarSign className="h-5 w-5 text-emerald-500" />
                                </div>
                                <p className="text-lg font-bold">{formatCurrency(employeePerformance.total_amount_processed)}</p>
                                <p className="text-xs text-muted-foreground">Amount Processed</p>
                              </CardContent>
                            </Card>
                            <Card className="text-center">
                              <CardContent className="pt-4 pb-3">
                                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                                  <Star className="h-5 w-5 text-amber-500" />
                                </div>
                                <p className="text-2xl font-bold">{employeePerformance?.avg_rating?.toFixed(1) ?? "0.0"}</p>
                                <p className="text-xs text-muted-foreground">Avg Rating</p>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="rounded-lg border p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium">Performance Score</span>
                              <span className="text-sm font-bold">
                                {Math.min(Math.round((employeePerformance?.avg_rating ?? 0) * 20), 100)}%
                              </span>
                            </div>
                            <Progress
                              value={Math.min((employeePerformance?.avg_rating ?? 0) * 20, 100)}
                              className="h-2.5"
                            />
                          </div>

                          <div className="rounded-lg border p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Award className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Customer Feedback</p>
                                <p className="text-xs text-muted-foreground">Total reviews received</p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-lg font-bold">
                              {employeePerformance.customer_feedback_count}
                            </Badge>
                          </div>

                          {employeePerformance.recent_activity?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                Recent Activity
                              </h4>
                              <div className="space-y-2">
                                {employeePerformance.recent_activity.map((activity, idx) => (
                                  <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                                    <div className="mt-0.5">
                                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{activity.action}</p>
                                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      {formatDate(activity.date)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">No performance data available</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDetailsDialog(false);
                            openEditDialog(selectedEmployee);
                          }}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Employee
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDetailsDialog(false);
                            openResetPasswordDialog(selectedEmployee);
                          }}
                          className="gap-2"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDetailsDialog(false);
                          openRoleDialog(selectedEmployee);
                        }}
                        className="w-full gap-2"
                      >
                        <UserCog className="h-4 w-4" />
                        Change Role
                      </Button>
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Account Status</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedEmployee.status === "active"
                                ? "This employee account is currently active"
                                : "This employee account is currently inactive"}
                            </p>
                          </div>
                          <Badge className={getStatusColor(selectedEmployee.status)}>
                            {selectedEmployee.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setShowDetailsDialog(false);
                          openDeleteDialog(selectedEmployee);
                        }}
                        className="w-full gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Employee
                      </Button>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
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
                  Reset the password for{" "}
                  <span className="font-semibold text-foreground">{selectedEmployee?.full_name}</span>.
                  They will need to use the new password to log in.
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
                  <Button type="button" variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting || !resetPassword || resetPassword !== resetPasswordConfirm
                    }
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserCog className="h-4 w-4 text-primary" />
                  </div>
                  Change Role
                </DialogTitle>
                <DialogDescription>
                  Change the role for{" "}
                  <span className="font-semibold text-foreground">{selectedEmployee?.full_name}</span>.
                  This will change their login permissions and access level.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select New Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role" />
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
                </div>
                {newRole && (
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      {newRole === "customer" && "Employee will become a customer with limited access. They will lose all staff privileges."}
                      {newRole === "teller" && "Employee will have teller access — can process transactions for customers."}
                      {newRole === "customer_service" && "Employee will have customer service access — can manage customer accounts."}
                      {newRole === "accountant" && "Employee will have accountant access — can view financial reports and manage accounts."}
                      {newRole === "ict_staff" && "Employee will have ICT staff access — can manage system settings."}
                      {newRole === "branch_manager" && "Employee will become a branch manager with full admin access."}
                      {newRole === "super_admin" && "Employee will become a super admin with unrestricted access to everything."}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowRoleDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRoleChange} disabled={submitting || !newRole}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </div>
                  Delete Employee
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-foreground">{selectedEmployee?.full_name}</span>?
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
