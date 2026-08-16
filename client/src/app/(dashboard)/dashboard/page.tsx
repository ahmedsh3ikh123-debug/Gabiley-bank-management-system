"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useLanguage } from "@/contexts/language-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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

import {
  formatCurrency,
  formatDate,
  getRoleLabel,
  getStatusColor,
} from "@/lib/utils";
import api from "@/lib/api";
import { useDataRefresh } from "@/contexts/data-refresh-context";
import {
  Users,
  CreditCard,
  ArrowLeftRight,
  Banknote,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Clock,
  UserCheck,
  UserCog,
  Send,
  Download,
  Upload,
  Settings,
  FileText,
  Bell,
  Shield,
  RefreshCw,
  Wallet,
  PiggyBank,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  LayoutGrid,
  Database,
  ClipboardList,
  ArrowUpRight,
  Calendar,
  Sparkles,
  Building2,
  Landmark,
  Loader2,
  KeyRound,
  UserX,
  Mail,
  Eye,
  Lock,
  MessageSquare,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AdminStats {
  totalUsers: number;
  totalCustomers: number;
  totalAdmins: number;
  totalEmployees: number;
  totalAccounts: number;
  activeAccounts: number;
  totalBalance: number;
  totalTransactions: number;
  onlineUsers: number;
  pendingLoans: number;
  approvedLoans: number;
  rejectedLoans: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todayTransfers: number;
  recentTransactions: any[];
  recentCustomers: any[];
}

interface CustomerData {
  accounts: any[];
  transactions: any[];
  totalBalance: number;
  totalAccounts: number;
  totalTransactions: number;
}

interface EmployeeData {
  recentTransactions: any[];
  pendingLoans: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todayTransfers: number;
  totalAccounts: number;
  onlineUsers: number;
}

interface ICTData {
  totalUsers: number;
  totalCustomers: number;
  totalStaff: number;
  pendingUsers: number;
  blockedUsers: number;
  activeUsers: number;
  onlineUsers: number;
  totalAccounts: number;
  blockedAccounts: number;
  totalTransactions: number;
  pendingPasswordRequests: number;
  totalMessages: number;
  unreadMessages: number;
  recentAuditLogs: any[];
  recentPasswordRequests: any[];
  recentCustomers: any[];
}

const PIE_COLORS = ["#1F8A4D", "#F8CC58", "#1A1918", "#E4B155", "#EBD6A3"];

function LoadingSkeletons() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 p-6 relative bg-[#F9FAFB] dark:bg-[#000000] animate-pulse">
          <div className="absolute inset-0 bg-[url('/bank-bg.svg')] bg-cover bg-center opacity-[0.04] pointer-events-none" />
          <div className="h-32 rounded-2xl bg-muted/40" />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted/40" />
            ))}
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/40" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-xl bg-muted/40" />
            <div className="h-80 rounded-xl bg-muted/40" />
            <div className="h-80 rounded-xl bg-muted/40" />
            <div className="h-80 rounded-xl bg-muted/40" />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-gold-500/10 mb-4 border border-primary/10">
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-lg font-semibold text-foreground/80">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {description}
      </p>
    </div>
  );
}

function PremiumStatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  trendValue,
  delay,
  gradient,
}: {
  title: string;
  value: string | number;
  icon: any;
  iconColor: string;
  iconBg: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  delay?: number;
  gradient?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl p-5 hover:shadow-xl transition-all duration-500 group hover:-translate-y-1 ${gradient || "bg-gradient-to-br from-white/[0.07] to-white/[0.02]"}`}
      style={{ animationDelay: `${delay || 0}ms` }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/[0.02] rounded-full translate-y-1/2 -translate-x-1/4 blur-xl" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          {trend && trendValue && (
            <div
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                trend === "up"
                  ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20"
                  : trend === "down"
                  ? "bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/20"
                  : "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              {trend === "neutral" && <Activity className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">
            {title}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ tx, index }: { tx: any; index: number }) {
  const typeConfig: Record<
    string,
    { icon: any; color: string; bg: string; prefix: string; label: string }
  > = {
    deposit: {
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      prefix: "+",
      label: "Deposit",
    },
    withdrawal: {
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
      prefix: "-",
      label: "Withdrawal",
    },
    transfer: {
      icon: ArrowLeftRight,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      prefix: "",
      label: "Transfer",
    },
  };

  const config = typeConfig[tx.type] || typeConfig.transfer;
  const Icon = config.icon;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border/30 p-3 hover:bg-muted/20 transition-all duration-200 group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.bg} transition-transform duration-200 group-hover:scale-110`}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium capitalize truncate">{tx.type}</p>
        <p className="text-xs text-muted-foreground truncate">
          {tx.description || config.label}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${config.color}`}>
          {config.prefix}
          {formatCurrency(tx.amount)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatDate(tx.created_at, { month: "short", day: "numeric" })}
        </p>
      </div>
    </div>
  );
}

function CustomerRow({ customer, index }: { customer: any; index: number }) {
  const initials = customer.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border/30 p-3 hover:bg-muted/20 transition-all duration-200 group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Avatar className="h-9 w-9 border border-border/50">
        {customer.profile_picture && (
          <AvatarImage
            src={customer.profile_picture}
            alt={customer.full_name}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-[#1F8A4D] to-[#1F8A4D]/70 text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {customer.full_name || "Unknown"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {customer.email || customer.username}
        </p>
      </div>
      <Badge
        variant="outline"
        className={`text-[10px] font-medium ${getStatusColor(
          customer.status || "active"
        )} border-0`}
      >
        {customer.status || "active"}
      </Badge>
    </div>
  );
}

function AdminDashboard({ stats, user }: { stats: AdminStats; user: any }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const { success, error: showError } = useToast();
  
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseAction, setResponseAction] = useState("in_progress");
  const [responding, setResponding] = useState(false);

  const monthlyTransactions = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    const baseDeposit = stats.todayDeposits || 50000;
    const baseWithdrawal = stats.todayWithdrawals || 30000;

    return months.slice(0, currentMonth + 1).map((month, i) => {
      const factor = 0.6 + (i / currentMonth) * 0.5;
      return {
        name: month,
        deposits: Math.round(baseDeposit * factor * (0.8 + Math.random() * 0.4)),
        withdrawals: Math.round(baseWithdrawal * factor * (0.7 + Math.random() * 0.5)),
      };
    });
  }, [stats]);

  const accountTypeData = useMemo(() => {
    const total = stats.totalAccounts || 100;
    return [
      { name: "Savings", value: Math.max(1, Math.round(total * 0.45)), color: "#1F8A4D" },
      { name: "Current", value: Math.max(1, Math.round(total * 0.30)), color: "#F8CC58" },
      { name: "Fixed Deposit", value: Math.max(1, Math.round(total * 0.15)), color: "#1F8A4D" },
      { name: "Business", value: Math.max(1, Math.round(total * 0.10)), color: "#7c3aed" },
    ];
  }, [stats]);

  const dailyTransactions = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const base = stats.totalTransactions || 50;
    return days.map((day, i) => ({
      name: day,
      transactions: Math.max(1, Math.round(base * (0.5 + Math.random() * 0.8))),
    }));
  }, [stats]);

  const loanData = useMemo(() => [
    { name: "Pending", value: stats.pendingLoans || 0, fill: "#F8CC58" },
    { name: "Approved", value: stats.approvedLoans || 0, fill: "#1F8A4D" },
    { name: "Rejected", value: stats.rejectedLoans || 0, fill: "#ef4444" },
  ], [stats]);

  const totalLoanVolume = stats.pendingLoans + stats.approvedLoans + stats.rejectedLoans;
  const approvedPercent = totalLoanVolume > 0 ? Math.round((stats.approvedLoans / totalLoanVolume) * 100) : 0;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const handleRespond = async () => {
    if (!selectedRequest || !responseMessage.trim()) {
      showError("Please enter a response message");
      return;
    }
    setResponding(true);
    try {
      await api.put(`/admin/password-requests/${selectedRequest.id}/respond`, { 
        response_message: responseMessage, 
        action: responseAction 
      });
      success("Response sent successfully");
      setRespondDialogOpen(false);
      setSelectedRequest(null);
      setResponseMessage("");
      setResponseAction("in_progress");
      window.location.reload();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to send response");
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="space-y-6 p-6 relative bg-[#F9FAFB] dark:bg-[#000000]">
      <div className="absolute inset-0 bg-[url('/bank-bg.svg')] bg-cover bg-center opacity-[0.04] pointer-events-none" />
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#1F8A4D]/80 text-white shadow-xl shadow-[#1F8A4D]/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzRtMC00djJIMlYyOmgzNG0wLTRWMkgydjJoMzRtMC00VjBoMzR2MmgzMCIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#F8CC58]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-white/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />

        <div className="relative px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-5 mb-3">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-[#F8CC58]/40 via-[#F8CC58]/20 to-[#F8CC58]/40 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500 opacity-75" />
                  <div className="relative h-20 w-20 lg:h-24 lg:w-24 rounded-2xl overflow-hidden bg-white/95 p-2 shadow-2xl border-2 border-[#F8CC58]/30 backdrop-blur-sm">
                    <img
                      src="/logo.png"
                      alt="Gabiley Bank Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-base lg:text-lg font-bold text-[#F8CC58] tracking-wide uppercase drop-shadow-lg">
                    Gabiley Bank
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-1 drop-shadow-md">
                    {greeting}
                  </h1>
                  <p className="text-white/80 text-lg mt-1">
                    {t("welcome_back")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-white/60">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span className="text-[#F8CC58]">|</span>
                <Building2 className="h-4 w-4" />
                <span>{getRoleLabel(user?.role || "admin")}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                {t("refresh")}
              </Button>
              <Button
                size="sm"
                className="bg-[#F8CC58] hover:bg-[#F8CC58]/90 text-[#1F8A4D] font-semibold shadow-lg shadow-[#F8CC58]/20"
                onClick={() => router.push("/reports")}
              >
                <FileText className="h-4 w-4 mr-2" />
                {t("reports")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - 4 cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard
          title={t("total_balance")}
          value={formatCurrency(stats.totalBalance || 0)}
          icon={Landmark}
          iconColor="text-[#F8CC58]"
          iconBg="bg-[#F8CC58]/20"
          trend="up"
          trendValue="+15%"
          delay={0}
          gradient="bg-gradient-to-br from-[#1A1918]/80 via-[#1A1918]/60 to-[#1A1918]/40 border-[#F8CC58]/20"
        />
        <PremiumStatCard
          title={t("customers")}
          value={stats.totalCustomers || 0}
          icon={Users}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/20"
          trend="up"
          trendValue="+12%"
          delay={50}
          gradient="bg-gradient-to-br from-[#001a33]/80 via-[#000d1a]/60 to-[#001426]/40 border-blue-500/20"
        />
        <PremiumStatCard
          title={t("transactions")}
          value={stats.totalTransactions || 0}
          icon={Activity}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/20"
          trend="up"
          trendValue={`+${stats.todayDeposits ? Math.round((stats.todayDeposits / (stats.totalBalance || 1)) * 100) : 0}%`}
          delay={100}
          gradient="bg-gradient-to-br from-[#001a0d]/80 via-[#000d07]/60 to-[#00140a]/40 border-emerald-500/20"
        />
        <PremiumStatCard
          title={t("pending_loans")}
          value={stats.pendingLoans || 0}
          icon={Clock}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/20"
          trend="neutral"
          trendValue={`${stats.approvedLoans || 0} ${t("approved")}`}
          delay={150}
          gradient="bg-gradient-to-br from-[#1a1500]/80 via-[#1A1918]/60 to-[#141000]/40 border-amber-500/20"
        />
      </div>

      {/* Secondary Stats - Compact Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: t("users"), value: stats.totalUsers || 0, icon: Users, color: "text-white", hoverColor: "hover:border-emerald-400/50", bg: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 border-emerald-400/30 shadow-emerald-500/25", iconBg: "bg-white/20", href: "/users?role=all" },
          { label: t("employees"), value: stats.totalAdmins || 0, icon: Shield, color: "text-white", hoverColor: "hover:border-purple-400/50", bg: "bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 border-purple-400/30 shadow-purple-500/25", iconBg: "bg-white/20", href: "/users?role=super_admin" },
          { label: t("customers"), value: stats.totalCustomers || 0, icon: UserCheck, color: "text-white", hoverColor: "hover:border-blue-400/50", bg: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-blue-400/30 shadow-blue-500/25", iconBg: "bg-white/20", href: "/users?role=customer" },
          { label: t("balance"), value: formatCurrency(stats.totalBalance || 0), icon: Wallet, color: "text-white", hoverColor: "hover:border-amber-400/50", bg: "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 border-amber-400/30 shadow-amber-500/25", iconBg: "bg-white/20", href: "/accounts" },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => router.push(item.href)}
            className={`flex items-center gap-3 rounded-2xl border backdrop-blur-sm p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[0.97] cursor-pointer group ${item.bg} ${item.hoverColor}`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-md`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 truncate">{item.label}</p>
              <p className="text-sm font-extrabold text-white drop-shadow-sm">{item.value}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-white/0 group-hover:text-white/60 ml-auto transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
          </button>
        ))}
      </div>

      {/* Charts Section - 2x2 Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Transactions Bar Chart */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/10">
                    <BarChart className="h-4 w-4 text-[#1F8A4D]" />
                  </div>
                  {t("total_transactions")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("deposits")} vs {t("withdrawals")}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyTransactions.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyTransactions}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name.charAt(0).toUpperCase() + name.slice(1),
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    />
                    <Bar
                      dataKey="deposits"
                      name={t("deposits")}
                      fill="#1F8A4D"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="withdrawals"
                      name={t("withdrawals")}
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={BarChart}
                title={t("no_data")}
                description={t("total_transactions")}
              />
            )}
          </CardContent>
        </Card>

        {/* Account Types Donut Chart */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8CC58]/10">
                    <PiggyBank className="h-4 w-4 text-[#F8CC58]" />
                  </div>
                  {t("account_type")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("accounts")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stats.totalAccounts > 0 ? (
              <div className="space-y-4">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={accountTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {accountTypeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        }}
                        formatter={(value: number, name: string) => [
                          value,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {accountTypeData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/20"
                    >
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-muted-foreground flex-1">
                        {item.name}
                      </span>
                      <span className="text-xs font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={PiggyBank}
                title={t("no_data")}
                description={t("accounts")}
              />
            )}
          </CardContent>
        </Card>

        {/* Transaction Analytics Line Chart */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/10">
                    <Activity className="h-4 w-4 text-[#1F8A4D]" />
                  </div>
                  {t("analytics")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("total_transactions")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dailyTransactions.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyTransactions}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="lineGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#1F8A4D"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#1F8A4D"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: number) => [value, "Transactions"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="transactions"
                      stroke="#1F8A4D"
                      strokeWidth={3}
                      dot={{ fill: "#1F8A4D", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "#1F8A4D", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title={t("no_data")}
                description={t("transactions")}
              />
            )}
          </CardContent>
        </Card>

        {/* Loan Statistics Bar Chart */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7c3aed]/10">
                    <Banknote className="h-4 w-4 text-[#7c3aed]" />
                  </div>
                  {t("loans")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("approved")}: {approvedPercent}%
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="bg-[#F8CC58]/10 text-[#F8CC58] border-[#F8CC58]/20"
              >
                {totalLoanVolume} {t("total_accounts")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {totalLoanVolume > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={loanData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: number) => [value, t("loans")]}
                    />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    >
                      {loanData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={Banknote}
                title={t("no_data")}
                description={t("loans")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Customers */}
        <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/10">
                    <UserCheck className="h-4 w-4 text-[#1F8A4D]" />
                  </div>
                  {t("customers")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t("welcome_back")}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-[#1F8A4D]" onClick={() => router.push("/customers")}>
                {t("view_all")}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentCustomers && stats.recentCustomers.length > 0 ? (
              <div className="space-y-2">
                {stats.recentCustomers
                  .slice(0, 6)
                  .map((customer: any, i: number) => (
                    <CustomerRow
                      key={customer.id || i}
                      customer={customer}
                      index={i}
                    />
                  ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title={t("no_data")}
                description={t("customers")}
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-3 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/10">
                    <ArrowLeftRight className="h-4 w-4 text-[#1F8A4D]" />
                  </div>
                  {t("recent_transactions")}
                </CardTitle>
                <CardDescription className="mt-1">
                  {Math.min(stats.recentTransactions.length, 8)} {t("transactions")}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-[#1F8A4D]" onClick={() => router.push("/transactions")}>
                {t("view_all")}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {stats.recentTransactions
                  .slice(0, 8)
                  .map((tx: any, i: number) => (
                    <TransactionRow key={tx.id || i} tx={tx} index={i} />
                  ))}
              </div>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title={t("no_data")}
                description={t("transactions")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <Card className="shadow-sm dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F8CC58]/10">
              <Sparkles className="h-4 w-4 text-[#F8CC58]" />
            </div>
            {t("quick_actions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: t("transactions"),
                icon: ArrowLeftRight,
                href: "/transactions",
                color: "bg-[#1F8A4D]/10 text-[#1F8A4D] hover:bg-[#1F8A4D]/20 border border-[#1F8A4D]/10",
              },
              {
                label: t("reports"),
                icon: FileText,
                href: "/reports",
                color: "bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 border border-[#7c3aed]/10",
              },
              {
                label: t("customers"),
                icon: Users,
                href: "/customers",
                color: "bg-[#1F8A4D]/10 text-[#1F8A4D] hover:bg-[#1F8A4D]/20 border border-[#1F8A4D]/10",
              },
              {
                label: t("loans"),
                icon: Banknote,
                href: "/loans",
                color: "bg-[#F8CC58]/10 text-[#F8CC58] hover:bg-[#F8CC58]/20 border border-[#F8CC58]/10",
              },
              {
                label: t("settings"),
                icon: Database,
                href: "/settings",
                color: "bg-[#ea580c]/10 text-[#ea580c] hover:bg-[#ea580c]/20 border border-[#ea580c]/10",
              },
              {
                label: t("audit_logs"),
                icon: ClipboardList,
                href: "/audit-logs",
                color: "bg-muted/50 text-muted-foreground hover:bg-muted/70 border border-border/50",
              },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className={`flex flex-col items-center gap-2.5 rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${action.color}`}
              >
                <action.icon className="h-6 w-6" />
                <span className="text-xs font-semibold">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerDashboard({
  data,
  user,
}: {
  data: CustomerData;
  user: any;
}) {
  const transactions = data.transactions || [];
  const accounts = data.accounts || [];
  const primaryAccount = accounts[0];
  const router = useRouter();
  const { t } = useLanguage();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-6 p-6 relative bg-[#F9FAFB] dark:bg-[#000000]">
      <div className="absolute inset-0 bg-[url('/bank-bg.svg')] bg-cover bg-center opacity-[0.04] pointer-events-none" />
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#1F8A4D]/80 text-white shadow-xl shadow-[#1F8A4D]/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzRtMC00djJIMlYyOmgzNG0wLTRWMkgydjJoMzRtMC00VjBoMzR2MmgzMCIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#F8CC58]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />

        <div className="relative px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-5 mb-3">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-[#F8CC58]/40 via-[#F8CC58]/20 to-[#F8CC58]/40 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500 opacity-75" />
                  <div className="relative h-20 w-20 lg:h-24 lg:w-24 rounded-2xl overflow-hidden bg-white/95 p-2 shadow-2xl border-2 border-[#F8CC58]/30 backdrop-blur-sm">
                    <img
                      src="/logo.png"
                      alt="Gabiley Bank Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-base lg:text-lg font-bold text-[#F8CC58] tracking-wide uppercase drop-shadow-lg">
                    Gabiley Bank
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-1 drop-shadow-md">
                    {greeting}
                  </h1>
                  <p className="text-white/80 text-lg mt-1">
                    {t("welcome_back")}
                  </p>
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-white/10 border-white/20 text-white w-fit backdrop-blur-sm"
            >
              <Wallet className="h-3 w-3 mr-1.5" />
              {getRoleLabel(user?.role || "customer")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-[#1F8A4D] via-[#1F8A4D]/90 to-[#1F8A4D]/70 text-white shadow-xl shadow-[#1F8A4D]/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#F8CC58]/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
        <CardContent className="p-6 lg:p-8 relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm font-medium text-white/70">{t("total_balance")}</p>
              <p className="text-3xl lg:text-4xl font-bold mt-1">
                {formatCurrency(data.totalBalance)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              <span>
                {data.totalAccounts} Account{data.totalAccounts !== 1 ? "s" : ""}
              </span>
            </div>
            {primaryAccount && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>{primaryAccount.account_number}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: t("deposits"),
            icon: Download,
            href: "/transactions",
            color: "bg-[#1F8A4D]/10 text-[#1F8A4D] hover:bg-[#1F8A4D]/20 border border-[#1F8A4D]/10",
          },
          {
            label: t("withdrawals"),
            icon: Upload,
            href: "/transactions",
            color: "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 border border-[#ef4444]/10",
          },
          {
            label: t("transfers"),
            icon: Send,
            href: "/transfer",
            color: "bg-[#1F8A4D]/10 text-[#1F8A4D] hover:bg-[#1F8A4D]/20 border border-[#1F8A4D]/10",
          },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => router.push(action.href)}
            className={`flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${action.color}`}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-xs font-semibold">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Account Details */}
      {accounts.length > 0 && (
        <Card className="shadow-sm dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/10">
                <CreditCard className="h-4 w-4 text-[#1F8A4D]" />
              </div>
              {t("accounts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accounts.map((account: any) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-xl border border-border/30 p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F8A4D]/10 text-[#1F8A4D]">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {account.account_number}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {account.account_type?.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {formatCurrency(account.balance)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] border-0 ${getStatusColor(
                        account.status
                      )}`}
                    >
                      {account.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="shadow-sm dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/10">
                  <ArrowLeftRight className="h-4 w-4 text-[#1F8A4D]" />
                </div>
                {t("recent_transactions")}
              </CardTitle>
              <CardDescription>
                {Math.min(transactions.length, 10)} {t("transactions")}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-[#1F8A4D]" onClick={() => router.push("/transactions")}>
              {t("view_all")}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.slice(0, 10).map((tx: any, i: number) => (
                <TransactionRow key={tx.id || i} tx={tx} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ArrowLeftRight}
              title={t("no_data")}
              description={t("transactions")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeeDashboard({ data, user }: { data: EmployeeData; user: any }) {
  const router = useRouter();
  const { t } = useLanguage();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-6 p-6 relative bg-[#F9FAFB] dark:bg-[#000000]">
      <div className="absolute inset-0 bg-[url('/bank-bg.svg')] bg-cover bg-center opacity-[0.04] pointer-events-none" />
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F8A4D] via-[#1F8A4D]/90 to-[#1F8A4D]/80 text-white shadow-xl shadow-[#1F8A4D]/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzRtMC00djJIMlYyOmgzNG0wLTRWMkgydjJoMzRtMC00VjBoMzR2MmgzMCIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#F8CC58]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="relative px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-5 mb-3">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-[#F8CC58]/40 via-[#F8CC58]/20 to-[#F8CC58]/40 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500 opacity-75" />
                  <div className="relative h-20 w-20 lg:h-24 lg:w-24 rounded-2xl overflow-hidden bg-white/95 p-2 shadow-2xl border-2 border-[#F8CC58]/30 backdrop-blur-sm">
                    <img src="/logo.png" alt="Gabiley Bank Logo" className="h-full w-full object-contain" />
                  </div>
                </div>
                <div>
                  <span className="text-base lg:text-lg font-bold text-[#F8CC58] tracking-wide uppercase drop-shadow-lg">
                    Gabiley Bank
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-1 drop-shadow-md">
                    {greeting}, {user?.full_name?.split(" ")[0]}
                  </h1>
                  <p className="text-white/80 text-lg mt-1">{t("welcome_back")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-white/60">
                <Calendar className="h-4 w-4" />
                <span>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                <span className="text-[#F8CC58]">|</span>
                <Building2 className="h-4 w-4" />
                <span>{getRoleLabel(user?.role || "employee")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard title={t("today_deposits")} value={formatCurrency(data.todayDeposits)} icon={Download} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" trend="up" trendValue="+12%" gradient="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/5" />
        <PremiumStatCard title={t("today_withdrawals")} value={formatCurrency(data.todayWithdrawals)} icon={Upload} iconColor="text-red-500" iconBg="bg-red-500/10" trend="down" trendValue="-5%" gradient="bg-gradient-to-br from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/5" />
        <PremiumStatCard title={t("today_transfers")} value={data.todayTransfers} icon={ArrowLeftRight} iconColor="text-blue-500" iconBg="bg-blue-500/10" trend="neutral" gradient="bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/5" />
        <PremiumStatCard title={t("pending_loans")} value={data.pendingLoans} icon={FileText} iconColor="text-amber-500" iconBg="bg-amber-500/10" gradient="bg-gradient-to-br from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/5" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("deposits"), icon: Download, href: "/transactions", color: "bg-[#1F8A4D]/10 text-[#1F8A4D] hover:bg-[#1F8A4D]/20 border border-[#1F8A4D]/10" },
          { label: t("withdrawals"), icon: Upload, href: "/transactions", color: "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 border border-[#ef4444]/10" },
          { label: t("transfers"), icon: Send, href: "/transfer", color: "bg-[#1F8A4D]/10 text-[#1F8A4D] hover:bg-[#1F8A4D]/20 border border-[#1F8A4D]/10" },
        ].map((action) => (
          <button key={action.label} onClick={() => router.push(action.href)} className={`flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${action.color}`}>
            <action.icon className="h-5 w-5" />
            <span className="text-xs font-semibold">{action.label}</span>
          </button>
        ))}
      </div>

      <Card className="shadow-sm dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/10">
              <Activity className="h-4 w-4 text-[#1F8A4D]" />
            </div>
            {t("recent_transactions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length === 0 ? (
            <EmptyState icon={Activity} title={t("no_transactions")} description="No recent transactions" />
          ) : (
            <div className="space-y-2">
              {data.recentTransactions.slice(0, 8).map((tx: any, i: number) => (
                <TransactionRow key={tx.id || i} tx={tx} index={i} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ICTDashboard({ data, user }: { data: ICTData; user: any }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { success, error: showError } = useToast();
  
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseAction, setResponseAction] = useState("in_progress");
  const [responding, setResponding] = useState(false);

  const handleRespond = async () => {
    if (!selectedRequest || !responseMessage.trim()) {
      showError("Please enter a response message");
      return;
    }
    setResponding(true);
    try {
      const endpoint = user?.role === 'ict_staff' 
        ? `/ict/password-requests/${selectedRequest.id}/respond`
        : `/admin/password-requests/${selectedRequest.id}/respond`;
      await api.put(endpoint, { 
        response_message: responseMessage, 
        action: responseAction 
      });
      success("Response sent successfully");
      setRespondDialogOpen(false);
      setSelectedRequest(null);
      setResponseMessage("");
      setResponseAction("in_progress");
      window.location.reload();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to send response");
    } finally {
      setResponding(false);
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("good_morning");
    if (hour < 17) return t("good_morning");
    return t("good_morning");
  }, [t]);

  const securityScore = useMemo(() => {
    const blocked = data.blockedUsers || 0;
    const pending = data.pendingPasswordRequests || 0;
    const score = Math.max(0, 100 - (blocked * 5) - (pending * 3));
    return Math.min(100, score);
  }, [data]);

  const securityLevel = securityScore >= 80 ? "Excellent" : securityScore >= 60 ? "Good" : securityScore >= 40 ? "Fair" : "Poor";
  const securityColor = securityScore >= 80 ? "text-emerald-500" : securityScore >= 60 ? "text-blue-500" : securityScore >= 40 ? "text-amber-500" : "text-red-500";
  const securityBg = securityScore >= 80 ? "from-emerald-500/20 to-emerald-500/5" : securityScore >= 60 ? "from-blue-500/20 to-blue-500/5" : securityScore >= 40 ? "from-amber-500/20 to-amber-500/5" : "from-red-500/20 to-red-500/5";

  return (
    <div className="space-y-6 p-6 relative bg-[#F9FAFB] dark:bg-[#000000]">
      <div className="absolute inset-0 bg-[url('/bank-bg.svg')] bg-cover bg-center opacity-[0.04] pointer-events-none" />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white shadow-2xl shadow-slate-900/30">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzRtMC00djJIMlYyOmgzNG0wLTRWMkgydjJoMzRtMC00VjBoMzR2MmgzMCIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#1F8A4D]/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#F8CC58]/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(31,138,77,0.1)_0%,transparent_70%)]" />

        <div className="relative px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-5 mb-4">
                <div className="relative group">
                  <div className="absolute -inset-3 bg-gradient-to-r from-[#1F8A4D]/50 via-[#1F8A4D]/30 to-[#1F8A4D]/50 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-700 opacity-80 animate-pulse" />
                  <div className="relative h-20 w-20 lg:h-24 lg:w-24 rounded-2xl overflow-hidden bg-white/95 p-2 shadow-2xl border-2 border-[#1F8A4D]/40 backdrop-blur-sm">
                    <img src="/logo.png" alt="Gabiley Bank Logo" className="h-full w-full object-contain" />
                  </div>
                </div>
                <div>
                  <span className="text-base lg:text-lg font-bold text-[#1F8A4D] tracking-widest uppercase drop-shadow-lg">
                    Gabiley Bank
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-1 drop-shadow-md">
                    {greeting}, {user?.full_name?.split(" ")[0]}
                  </h1>
                  <p className="text-white/70 text-lg mt-1 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#1F8A4D]" />
                    {t("ict_security_center")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="bg-[#1F8A4D]/15 border-[#1F8A4D]/30 text-[#1F8A4D] backdrop-blur-sm">
                  <Shield className="h-3 w-3 mr-1.5" />
                  {t("ict_staff")}
                </Badge>
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white/80 backdrop-blur-sm">
                  <Calendar className="h-3 w-3 mr-1.5" />
                  {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </Badge>
                <Badge variant="outline" className={`bg-gradient-to-r ${securityBg} border-white/20 ${securityColor} backdrop-blur-sm`}>
                  <Lock className="h-3 w-3 mr-1.5" />
                  Security: {securityLevel}
                </Badge>
              </div>
            </div>

            {/* Security Score Circle */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="42" stroke={securityScore >= 80 ? "#10b981" : securityScore >= 60 ? "#3b82f6" : securityScore >= 40 ? "#f59e0b" : "#ef4444"} strokeWidth="8" fill="none" strokeDasharray={`${securityScore * 2.64} 264`} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-extrabold ${securityColor}`}>{securityScore}%</span>
                  <span className="text-[10px] text-white/50 uppercase tracking-wider">Security</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: t("total_users"), value: data.totalUsers, icon: Users, color: "from-blue-500 to-blue-600", iconColor: "text-blue-500", iconBg: "bg-blue-500/10" },
          { title: t("total_customers"), value: data.totalCustomers, icon: UserCheck, color: "from-emerald-500 to-emerald-600", iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" },
          { title: t("pending_requests"), value: data.pendingPasswordRequests, icon: KeyRound, color: "from-amber-500 to-amber-600", iconColor: "text-amber-500", iconBg: "bg-amber-500/10", alert: data.pendingPasswordRequests > 0 },
          { title: t("online_now"), value: data.onlineUsers, icon: Activity, color: "from-purple-500 to-purple-600", iconColor: "text-purple-500", iconBg: "bg-purple-500/10", pulse: true },
        ].map((stat, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl p-5 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 bg-gradient-to-br from-white/[0.07] to-white/[0.02]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.iconBg} shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                {stat.alert && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                  </span>
                )}
                {stat.pulse && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">{stat.title}</p>
                <p className="text-2xl font-extrabold tracking-tight text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[
          { title: t("active_users"), value: data.activeUsers, icon: UserCheck, iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10", gradient: "from-emerald-500/10 to-emerald-500/5" },
          { title: t("blocked_users"), value: data.blockedUsers, icon: UserX, iconColor: "text-red-500", iconBg: "bg-red-500/10", gradient: "from-red-500/10 to-red-500/5", alert: data.blockedUsers > 0 },
          { title: t("blocked_accounts"), value: data.blockedAccounts, icon: CreditCard, iconColor: "text-red-500", iconBg: "bg-red-500/10", gradient: "from-red-500/10 to-red-500/5", alert: data.blockedAccounts > 0 },
        ].map((stat, i) => (
          <div key={i} className={`group relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl p-5 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 bg-gradient-to-br dark:${stat.gradient}`}>
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.iconBg} shadow-md`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                {stat.alert && (
                  <Badge variant="secondary" className="bg-red-500/10 text-red-500 text-[10px]">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Action Needed
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-2xl font-extrabold tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="shadow-sm dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/10">
              <Sparkles className="h-4 w-4 text-[#1F8A4D]" />
            </div>
            {t("quick_actions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t("manage_customers"), icon: Users, href: "/customers", color: "from-[#1F8A4D] to-[#155c34]", textColor: "text-[#1F8A4D]" },
              { label: t("send_message"), icon: Mail, href: "/messages", color: "from-blue-500 to-blue-600", textColor: "text-blue-500" },
              { label: t("audit_logs"), icon: Shield, href: "/audit-logs", color: "from-purple-500 to-purple-600", textColor: "text-purple-500" },
              { label: t("user_management"), icon: UserCog, href: "/users", color: "from-amber-500 to-amber-600", textColor: "text-amber-500" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border/30 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-transparent active:scale-[0.98]"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Alerts & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Password Requests */}
        <Card className="shadow-sm dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <KeyRound className="h-4 w-4 text-amber-500" />
                </div>
                {t("password_reset_requests")}
              </CardTitle>
              {data.pendingPasswordRequests > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 animate-pulse">
                  {data.pendingPasswordRequests} pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.recentPasswordRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-foreground/80">{t("all_clear")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("no_pending_requests")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentPasswordRequests.map((req: any, i: number) => (
                  <div key={req.id || i} className="flex items-center gap-3 rounded-xl border border-border/30 p-3 hover:bg-muted/20 transition-all duration-200 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 group-hover:scale-110 transition-transform">
                      <KeyRound className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{req.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {req.request_type === 'password' ? 'Password Reset' : 'PIN Reset'} - {req.username}
                      </p>
                      {req.message && (
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">Reason: {req.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-0">
                        Pending
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] bg-[#1F8A4D] hover:bg-[#155c34] text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                          setRespondDialogOpen(true);
                        }}
                      >
                        Respond
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent ICT Activity */}
        <Card className="shadow-sm dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                  <Shield className="h-4 w-4 text-purple-500" />
                </div>
                {t("security_activity_log")}
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-[#1F8A4D] hover:text-[#155c34]" onClick={() => router.push("/audit-logs")}>
                {t("view_all")}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentAuditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 mb-4">
                  <Shield className="h-8 w-8 text-purple-500" />
                </div>
                <p className="text-sm font-semibold text-foreground/80">{t("no_activity_yet")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("security_actions_appear")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentAuditLogs.slice(0, 6).map((log: any, i: number) => {
                  const actionConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
                    password_reset: { icon: KeyRound, color: "text-amber-600", bg: "bg-amber-500/10", label: "Password Reset" },
                    pin_reset: { icon: Lock, color: "text-amber-600", bg: "bg-amber-500/10", label: "PIN Reset" },
                    username_change: { icon: UserCog, color: "text-blue-600", bg: "bg-blue-500/10", label: "Username Changed" },
                    user_block: { icon: UserX, color: "text-red-600", bg: "bg-red-500/10", label: "User Blocked" },
                    user_unblock: { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-500/10", label: "User Unblocked" },
                    view_credentials: { icon: Eye, color: "text-purple-600", bg: "bg-purple-500/10", label: "Credentials Viewed" },
                  };
                  const config = actionConfig[log.action] || { icon: Activity, color: "text-gray-600", bg: "bg-gray-500/10", label: log.action.replace(/_/g, ' ') };
                  const Icon = config.icon;
                  return (
                    <div key={log.id || i} className="flex items-center gap-3 rounded-xl border border-border/30 p-3 hover:bg-muted/20 transition-all duration-200 group">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg} group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{config.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{log.user_name || 'System'}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground shrink-0">
                        {formatDate(log.created_at, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Tips & Recent Customers */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Security Tips */}
        <Card className="shadow-sm bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/20">
                <Lock className="h-4 w-4 text-[#1F8A4D]" />
              </div>
              {t("security_tips")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { icon: Shield, title: "Regular Password Updates", desc: "Encourage users to update passwords monthly" },
                { icon: Eye, title: "Monitor Login Activity", desc: "Review login history for suspicious activity" },
                { icon: Lock, title: "PIN Security", desc: "Ensure PINs are changed after password resets" },
                { icon: UserX, title: "Block Inactive Users", desc: "Block accounts that haven't been used in 90+ days" },
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1F8A4D]/20">
                    <tip.icon className="h-4 w-4 text-[#1F8A4D]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tip.title}</p>
                    <p className="text-xs text-white/60 mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Customers */}
        <Card className="lg:col-span-2 shadow-sm dark:bg-gradient-to-br dark:from-white/[0.07] dark:to-white/[0.02] dark:backdrop-blur-xl dark:border dark:border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8A4D]/10">
                <Users className="h-4 w-4 text-[#1F8A4D]" />
              </div>
              {t("recent_customers")}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-[#1F8A4D] hover:text-[#155c34]" onClick={() => router.push("/customers")}>
              {t("view_all")}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentCustomers.length === 0 ? (
              <EmptyState icon={Users} title="No Customers" description="No customers registered yet" />
            ) : (
              <div className="space-y-2">
                {data.recentCustomers.map((customer: any, i: number) => (
                  <CustomerRow key={customer.id || i} customer={customer} index={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Respond Dialog */}
      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#1F8A4D]" />
              Respond to Password Reset Request
            </DialogTitle>
            <DialogDescription>
              Send a response to {selectedRequest?.full_name} ({selectedRequest?.username})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">Request Details:</p>
              <p className="text-xs text-muted-foreground">
                Type: {selectedRequest?.request_type === 'password' ? 'Password Reset' : 'PIN Reset'}
              </p>
              {selectedRequest?.message && (
                <p className="text-xs text-muted-foreground">Reason: {selectedRequest.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="response-message">Your Response *</Label>
              <Textarea
                id="response-message"
                placeholder="Type your response here... (e.g., 'Your password has been reset to Password@123. Please login and change it.')"
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="response-action">Action Status</Label>
              <Select value={responseAction} onValueChange={setResponseAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress (Working on it)</SelectItem>
                  <SelectItem value="resolved">Resolved (Password reset done)</SelectItem>
                  <SelectItem value="rejected">Rejected (Cannot fulfill request)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRespond} 
              disabled={responding || !responseMessage.trim()}
              className="bg-[#1F8A4D] hover:bg-[#155c34] text-white"
            >
              {responding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Response
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin, isEmployee, isCustomer } = useAuth();
  const { registerRefresh } = useDataRefresh();
  const { t } = useLanguage();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [ictData, setIctData] = useState<ICTData | null>(null);
  const [loading, setLoading] = useState(true);

  const isICT = user?.role === "ict_staff";

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    const unsub = registerRefresh("dashboard", fetchDashboard);
    return unsub;
  }, [registerRefresh]);

  const fetchDashboard = async () => {
    try {
      if (isAdmin) {
        const res = await api.get("/admin/stats");
        setAdminStats({
          totalUsers: res.data.totalUsers || 0,
          totalCustomers: res.data.totalCustomers || 0,
          totalAdmins: res.data.totalAdmins || 0,
          totalEmployees: res.data.totalEmployees || 0,
          totalAccounts: res.data.totalAccounts || 0,
          activeAccounts: res.data.activeAccounts || 0,
          totalBalance: res.data.totalBalance || 0,
          totalTransactions: res.data.totalTransactions || 0,
          onlineUsers: res.data.onlineUsers || 0,
          pendingLoans: res.data.pendingLoans || 0,
          todayDeposits: res.data.todayDeposits || 0,
          todayWithdrawals: res.data.todayWithdrawals || 0,
          todayTransfers: res.data.todayTransfers || 0,
          recentTransactions: res.data.recentTransactions || [],
          recentCustomers: res.data.recentCustomers || [],
          approvedLoans: res.data.approvedLoans || 0,
          rejectedLoans: res.data.rejectedLoans || 0,
        });
      } else if (isICT) {
        const res = await api.get("/ict/stats");
        setIctData({
          totalUsers: res.data.totalUsers || 0,
          totalCustomers: res.data.totalCustomers || 0,
          totalStaff: res.data.totalStaff || 0,
          pendingUsers: res.data.pendingUsers || 0,
          blockedUsers: res.data.blockedUsers || 0,
          activeUsers: res.data.activeUsers || 0,
          onlineUsers: res.data.onlineUsers || 0,
          totalAccounts: res.data.totalAccounts || 0,
          blockedAccounts: res.data.blockedAccounts || 0,
          totalTransactions: res.data.totalTransactions || 0,
          pendingPasswordRequests: res.data.pendingPasswordRequests || 0,
          totalMessages: res.data.totalMessages || 0,
          unreadMessages: res.data.unreadMessages || 0,
          recentAuditLogs: res.data.recentAuditLogs || [],
          recentPasswordRequests: res.data.recentPasswordRequests || [],
          recentCustomers: res.data.recentCustomers || [],
        });
      } else if (isEmployee) {
        const [statsRes, txRes] = await Promise.all([
          api.get("/admin/stats").catch(() => ({ data: {} })),
          api.get("/transactions").catch(() => ({ data: [] })),
        ]);
        setEmployeeData({
          recentTransactions: txRes.data || [],
          pendingLoans: statsRes.data.pendingLoans || 0,
          todayDeposits: statsRes.data.todayDeposits || 0,
          todayWithdrawals: statsRes.data.todayWithdrawals || 0,
          todayTransfers: statsRes.data.todayTransfers || 0,
          totalAccounts: statsRes.data.totalAccounts || 0,
          onlineUsers: statsRes.data.onlineUsers || 0,
        });
      } else if (isCustomer) {
        const [accountsRes, txRes] = await Promise.all([
          api.get("/accounts"),
          api.get("/transactions"),
        ]);
        const accounts = accountsRes.data || [];
        const transactions = txRes.data || [];
        setCustomerData({
          accounts,
          transactions,
          totalBalance: accounts.reduce(
            (sum: number, a: any) => sum + (a.balance || 0),
            0
          ),
          totalAccounts: accounts.length,
          totalTransactions: transactions.length,
        });
      }
    } catch (err) {
      // Dashboard data will show default values on error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeletons />;
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="min-h-[calc(100vh-4rem)]">
          {isAdmin && adminStats && (
            <AdminDashboard stats={adminStats} user={user} />
          )}
          {isICT && ictData && (
            <ICTDashboard data={ictData} user={user} />
          )}
          {isEmployee && !isICT && employeeData && (
            <EmployeeDashboard data={employeeData} user={user} />
          )}
          {isCustomer && customerData && (
            <CustomerDashboard data={customerData} user={user} />
          )}
          {!isAdmin && !isCustomer && !isEmployee && (
            <div className="space-y-6 p-6 relative bg-[#F9FAFB] dark:bg-[#000000]">
              <div className="absolute inset-0 bg-[url('/bank-bg.svg')] bg-cover bg-center opacity-[0.04] pointer-events-none" />
              <div className="relative">
                <div className="relative px-8 py-8">
                  <h1 className="text-3xl font-bold tracking-tight">
                    Welcome, {user?.full_name?.split(" ")[0]}
                  </h1>
                  <p className="text-white/70 mt-1">
                    Your dashboard is being configured.
                  </p>
                </div>
              </div>
              <Card className="shadow-sm">
                <CardContent className="py-16">
                  <EmptyState
                    icon={LayoutGrid}
                    title={t("dashboard")}
                    description={t("loading")}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
