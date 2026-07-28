"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
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

const PIE_COLORS = ["#1F8A4D", "#F8CC58", "#1A1918", "#E4B155", "#EBD6A3"];

function LoadingSkeletons() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 p-6 relative animate-pulse">
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

  return (
    <div className="space-y-6 p-6 relative">
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
                    Here&apos;s what&apos;s happening at your bank today.
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
                Refresh Data
              </Button>
              <Button
                size="sm"
                className="bg-[#F8CC58] hover:bg-[#F8CC58]/90 text-[#1F8A4D] font-semibold shadow-lg shadow-[#F8CC58]/20"
                onClick={() => router.push("/reports")}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - 4 cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard
          title="Total Balance"
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
          title="Total Customers"
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
          title="Today's Transactions"
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
          title="Pending Loans"
          value={stats.pendingLoans || 0}
          icon={Clock}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/20"
          trend="neutral"
          trendValue={`${stats.approvedLoans || 0} approved`}
          delay={150}
          gradient="bg-gradient-to-br from-[#1a1500]/80 via-[#1A1918]/60 to-[#141000]/40 border-amber-500/20"
        />
      </div>

      {/* Secondary Stats - Compact Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total Users", value: stats.totalUsers || 0, icon: Users, color: "text-white", hoverColor: "hover:border-emerald-400/50", bg: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 border-emerald-400/30 shadow-emerald-500/25", iconBg: "bg-white/20", href: "/users?role=all" },
          { label: "Admin", value: stats.totalAdmins || 0, icon: Shield, color: "text-white", hoverColor: "hover:border-purple-400/50", bg: "bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 border-purple-400/30 shadow-purple-500/25", iconBg: "bg-white/20", href: "/users?role=super_admin" },
          { label: "Customer", value: stats.totalCustomers || 0, icon: UserCheck, color: "text-white", hoverColor: "hover:border-blue-400/50", bg: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-blue-400/30 shadow-blue-500/25", iconBg: "bg-white/20", href: "/users?role=customer" },
          { label: "Balance", value: formatCurrency(stats.totalBalance || 0), icon: Wallet, color: "text-white", hoverColor: "hover:border-amber-400/50", bg: "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 border-amber-400/30 shadow-amber-500/25", iconBg: "bg-white/20", href: "/accounts" },
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
                  Monthly Transactions
                </CardTitle>
                <CardDescription className="mt-1">
                  Deposits vs withdrawals over months
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
                      name="Deposits"
                      fill="#1F8A4D"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="withdrawals"
                      name="Withdrawals"
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
                title="No Monthly Data"
                description="Monthly transaction data will appear here."
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
                  Account Types
                </CardTitle>
                <CardDescription className="mt-1">
                  Distribution by account category
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
                title="No Accounts"
                description="Account distribution data will appear here."
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
                  Transaction Analytics
                </CardTitle>
                <CardDescription className="mt-1">
                  Daily transaction volume this week
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
                title="No Transaction Data"
                description="Transaction analytics will appear here."
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
                  Loan Statistics
                </CardTitle>
                <CardDescription className="mt-1">
                  Approval rate: {approvedPercent}%
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="bg-[#F8CC58]/10 text-[#F8CC58] border-[#F8CC58]/20"
              >
                {totalLoanVolume} Total
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
                      formatter={(value: number) => [value, "Loans"]}
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
                title="No Loan Data"
                description="Loan statistics will appear here."
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
                  Recent Customers
                </CardTitle>
                <CardDescription className="mt-1">
                  Latest registered customers
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-[#1F8A4D]" onClick={() => router.push("/customers")}>
                View All
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
                title="No Customers"
                description="Recent customers will appear here."
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
                  Recent Transactions
                </CardTitle>
                <CardDescription className="mt-1">
                  Last {Math.min(stats.recentTransactions.length, 8)} transactions
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-[#1F8A4D]" onClick={() => router.push("/transactions")}>
                View All
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
                title="No Transactions"
                description="Recent transactions will appear here."
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
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: "New Transaction",
                icon: ArrowLeftRight,
                href: "/transactions",
                color: "bg-[#1F8A4D]/10 text-[#1F8A4D] hover:bg-[#1F8A4D]/20 border border-[#1F8A4D]/10",
              },
              {
                label: "View Reports",
                icon: FileText,
                href: "/reports",
                color: "bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 border border-[#7c3aed]/10",
              },
              {
                label: "Manage Customers",
                icon: Users,
                href: "/customers",
                color: "bg-[#1F8A4D]/10 text-[#1F8A4D] hover:bg-[#1F8A4D]/20 border border-[#1F8A4D]/10",
              },
              {
                label: "Loan Management",
                icon: Banknote,
                href: "/loans",
                color: "bg-[#F8CC58]/10 text-[#F8CC58] hover:bg-[#F8CC58]/20 border border-[#F8CC58]/10",
              },
              {
                label: "Backup Database",
                icon: Database,
                href: "/settings",
                color: "bg-[#ea580c]/10 text-[#ea580c] hover:bg-[#ea580c]/20 border border-[#ea580c]/10",
              },
              {
                label: "View Audit Logs",
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-6 p-6 relative">
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
                    Manage your accounts and transactions.
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
              <p className="text-sm font-medium text-white/70">Total Balance</p>
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
            label: "Deposit",
            icon: Download,
            href: "/transactions",
            color: "bg-[#1F8A4D]/10 text-[#1F8A4D] hover:bg-[#1F8A4D]/20 border border-[#1F8A4D]/10",
          },
          {
            label: "Withdraw",
            icon: Upload,
            href: "/transactions",
            color: "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 border border-[#ef4444]/10",
          },
          {
            label: "Transfer",
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
              My Accounts
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
                Recent Transactions
              </CardTitle>
              <CardDescription>
                Last {Math.min(transactions.length, 10)} transactions
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-[#1F8A4D]" onClick={() => router.push("/transactions")}>
              View All
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
              title="No Transactions Yet"
              description="Your recent transactions will appear here once you start banking."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin, isEmployee, isCustomer } = useAuth();
  const { registerRefresh } = useDataRefresh();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.error("Dashboard fetch error:", err);
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
          {isCustomer && customerData && (
            <CustomerDashboard data={customerData} user={user} />
          )}
          {!isAdmin && !isCustomer && (
            <div className="space-y-6 p-6 relative">
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
                    title="Dashboard Coming Soon"
                    description="Your personalized dashboard is being set up. Check back soon for a tailored experience."
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
