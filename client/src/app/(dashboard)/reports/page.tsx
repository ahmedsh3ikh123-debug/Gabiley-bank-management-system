"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/contexts/toast-context";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Printer,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface DailyReport {
  date: string;
  total_deposits: number;
  total_withdrawals: number;
  total_transfers: number;
  total_fees: number;
  transaction_count: number;
  new_accounts: number;
}

interface MonthlyReport {
  month: string;
  total_deposits: number;
  total_withdrawals: number;
  total_transfers: number;
  total_fees: number;
  transaction_count: number;
  new_accounts: number;
  loan_disbursements: number;
  loan_repayments: number;
}

interface AnalyticsData {
  trends: { date: string; deposits: number; withdrawals: number; transfers: number; count: number }[];
  top_accounts: { id: number; account_number: string; balance: number; full_name: string }[];
  loan_summary: { total_pending: number; total_approved: number; total_rejected: number; total_amount: number };
  growth: { users: { month: string; count: number }[]; accounts: { month: string; count: number }[] };
}

const PIE_COLORS = ["#1F8A4D", "#F8CC58", "#1A1918", "#E4B155", "#EBD6A3"];

export default function ReportsPage() {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState("daily");

  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const fetchDailyReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/daily?date=${dailyDate}`);
      setDailyReport(response.data);
    } catch (err: any) {
      toastError(err.response?.data?.message || "Failed to fetch daily report");
    } finally {
      setLoading(false);
    }
  }, [dailyDate, toastError]);

  const fetchMonthlyReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/monthly?month=${monthlyMonth}`);
      setMonthlyReport(response.data);
    } catch (err: any) {
      toastError(err.response?.data?.message || "Failed to fetch monthly report");
    } finally {
      setLoading(false);
    }
  }, [monthlyMonth, toastError]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/reports/analytics");
      setAnalyticsData(response.data);
    } catch (err: any) {
      toastError(err.response?.data?.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (activeTab === "daily") fetchDailyReport();
  }, [activeTab, fetchDailyReport]);

  useEffect(() => {
    if (activeTab === "monthly") fetchMonthlyReport();
  }, [activeTab, fetchMonthlyReport]);

  useEffect(() => {
    if (activeTab === "analytics") fetchAnalytics();
  }, [activeTab, fetchAnalytics]);

  const handleExport = async (type: string) => {
    setExportLoading(type);
    try {
      const response = await api.get(`/reports/export/${type}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      success(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully`);
    } catch (err: any) {
      toastError(err.response?.data?.message || "Failed to export report");
    } finally {
      setExportLoading(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const generateChartData = (report: DailyReport | null) => {
    if (!report) return [];
    return [
      { name: "Deposits", value: report.total_deposits, color: "#1F8A4D" },
      { name: "Withdrawals", value: report.total_withdrawals, color: "#dc2626" },
      { name: "Transfers", value: report.total_transfers, color: "#1F8A4D" },
      { name: "Fees", value: report.total_fees, color: "#F8CC58" },
    ];
  };

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "accountant"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918]">Reports & Analytics</h1>
              <p className="mt-1 text-gray-500">View detailed reports and analytics for your banking operations</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePrint} className="border-gray-200">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Select onValueChange={(value) => handleExport(value)}>
                <SelectTrigger className="w-[180px] border-gray-200 bg-white">
                  <Download className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Export Report" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="accounts">Accounts</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-gray-200 shadow-sm">
              <TabsTrigger value="daily" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Calendar className="h-4 w-4" />
                Daily
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4" />
                Monthly
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Daily Report */}
            <TabsContent value="daily" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      Daily Report
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={dailyDate}
                        onChange={(e) => setDailyDate(e.target.value)}
                        className="w-[200px] border-gray-200 bg-gray-50"
                      />
                      <Button variant="outline" size="icon" onClick={fetchDailyReport} disabled={loading} className="border-gray-200">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="rounded-xl bg-gray-50 p-4 animate-pulse">
                          <div className="h-4 w-20 rounded bg-gray-200" />
                          <div className="mt-2 h-8 w-24 rounded bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  ) : dailyReport ? (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        {[
                          { label: "Total Transactions", value: dailyReport.transaction_count, icon: <CreditCard className="h-4 w-4" />, color: "from-blue-500 to-indigo-600" },
                          { label: "Total Deposits", value: formatCurrency(dailyReport.total_deposits), icon: <TrendingUp className="h-4 w-4" />, color: "from-emerald-500 to-green-600", isCurrency: true, positive: true },
                          { label: "Total Withdrawals", value: formatCurrency(dailyReport.total_withdrawals), icon: <TrendingDown className="h-4 w-4" />, color: "from-rose-500 to-red-600", isCurrency: true, negative: true },
                          { label: "Fees Collected", value: formatCurrency(dailyReport.total_fees), icon: <DollarSign className="h-4 w-4" />, color: "from-amber-500 to-orange-600", isCurrency: true },
                          { label: "New Accounts", value: dailyReport.new_accounts, icon: <Users className="h-4 w-4" />, color: "from-violet-500 to-purple-600" },
                        ].map((stat) => (
                          <Card key={stat.label} className="relative overflow-hidden shadow-md">
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
                            <CardContent className="relative p-4">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                                  {stat.icon}
                                </div>
                              </div>
                              <p className={`mt-2 text-xl font-bold ${stat.negative ? "text-red-600" : stat.positive ? "text-green-600" : "text-gray-900"}`}>
                                {stat.value}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="shadow-md">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Transaction Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie
                                  data={generateChartData(dailyReport)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {generateChartData(dailyReport).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-2 flex flex-wrap justify-center gap-4">
                              {generateChartData(dailyReport).map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }} />
                                  <span className="text-xs text-gray-600">{entry.name}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="shadow-md">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Summary</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {[
                              { label: "Deposits", value: dailyReport.total_deposits, icon: <ArrowUpRight className="h-4 w-4 text-green-500" />, positive: true },
                              { label: "Withdrawals", value: dailyReport.total_withdrawals, icon: <ArrowDownRight className="h-4 w-4 text-red-500" />, negative: true },
                              { label: "Transfers", value: dailyReport.total_transfers, icon: <Activity className="h-4 w-4 text-blue-500" /> },
                              { label: "Fees Collected", value: dailyReport.total_fees, icon: <DollarSign className="h-4 w-4 text-amber-500" /> },
                            ].map((item) => (
                              <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                                <div className="flex items-center gap-3">
                                  {item.icon}
                                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                </div>
                                <span className={`text-sm font-bold ${item.positive ? "text-green-600" : item.negative ? "text-red-600" : "text-gray-900"}`}>
                                  {formatCurrency(item.value)}
                                </span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
                        <Calendar className="h-10 w-10 text-blue-300" />
                      </div>
                      <p className="mt-4 text-sm text-gray-500">Select a date and click refresh to view the daily report</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Monthly Report */}
            <TabsContent value="monthly" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Monthly Report
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Input
                        type="month"
                        value={monthlyMonth}
                        onChange={(e) => setMonthlyMonth(e.target.value)}
                        className="w-[200px] border-gray-200 bg-gray-50"
                      />
                      <Button variant="outline" size="icon" onClick={fetchMonthlyReport} disabled={loading} className="border-gray-200">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="grid gap-4 md:grid-cols-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl bg-gray-50 p-4 animate-pulse">
                          <div className="h-4 w-20 rounded bg-gray-200" />
                          <div className="mt-2 h-8 w-24 rounded bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  ) : monthlyReport ? (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: "Transactions", value: monthlyReport.transaction_count, icon: <CreditCard className="h-4 w-4" />, color: "from-blue-500 to-indigo-600" },
                          { label: "Deposits", value: formatCurrency(monthlyReport.total_deposits), icon: <TrendingUp className="h-4 w-4" />, color: "from-emerald-500 to-green-600" },
                          { label: "Withdrawals", value: formatCurrency(monthlyReport.total_withdrawals), icon: <TrendingDown className="h-4 w-4" />, color: "from-rose-500 to-red-600" },
                          { label: "Fees Collected", value: formatCurrency(monthlyReport.total_fees), icon: <DollarSign className="h-4 w-4" />, color: "from-amber-500 to-orange-600" },
                        ].map((stat) => (
                          <Card key={stat.label} className="relative overflow-hidden shadow-md">
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
                            <CardContent className="relative p-4">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                                  {stat.icon}
                                </div>
                              </div>
                              <p className="mt-2 text-xl font-bold text-gray-900">{stat.value}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: "New Accounts", value: monthlyReport.new_accounts, icon: <Users className="h-4 w-4 text-blue-500" /> },
                          { label: "Loan Disbursements", value: monthlyReport.loan_disbursements, icon: <TrendingUp className="h-4 w-4 text-green-500" /> },
                          { label: "Loan Repayments", value: monthlyReport.loan_repayments, icon: <TrendingDown className="h-4 w-4 text-blue-500" /> },
                          { label: "Net Flow", value: formatCurrency(monthlyReport.total_deposits - monthlyReport.total_withdrawals), icon: <DollarSign className="h-4 w-4 text-violet-500" />, positive: (monthlyReport.total_deposits - monthlyReport.total_withdrawals) >= 0 },
                        ].map((stat) => (
                          <Card key={stat.label} className="shadow-md">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {stat.icon}
                                  <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                                </div>
                              </div>
                              <p className={`mt-2 text-xl font-bold ${stat.positive === true ? "text-green-600" : stat.positive === false ? "text-red-600" : "text-gray-900"}`}>
                                {stat.value}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <Card className="shadow-md">
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Monthly Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border border-blue-100">
                              <p className="text-sm font-medium text-blue-800">Total Transfers</p>
                              <p className="mt-1 text-2xl font-bold text-blue-900">{formatCurrency(monthlyReport.total_transfers)}</p>
                            </div>
                            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-4 border border-green-100">
                              <p className="text-sm font-medium text-green-800">Loan Disbursements</p>
                              <p className="mt-1 text-2xl font-bold text-green-900">{monthlyReport.loan_disbursements}</p>
                            </div>
                            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 border border-amber-100">
                              <p className="text-sm font-medium text-amber-800">Loan Repayments</p>
                              <p className="mt-1 text-2xl font-bold text-amber-900">{monthlyReport.loan_repayments}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
                        <BarChart3 className="h-10 w-10 text-blue-300" />
                      </div>
                      <p className="mt-4 text-sm text-gray-500">Select a month and click refresh to view the monthly report</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Analytics Dashboard
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading} className="border-gray-200">
                      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="grid gap-4 md:grid-cols-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl bg-gray-50 p-4 animate-pulse">
                          <div className="h-4 w-20 rounded bg-gray-200" />
                          <div className="mt-2 h-8 w-24 rounded bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  ) : analyticsData ? (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: "Pending Loans", value: analyticsData.loan_summary.total_pending, icon: <Clock className="h-4 w-4" />, color: "from-amber-500 to-orange-600" },
                          { label: "Approved Loans", value: analyticsData.loan_summary.total_approved, icon: <CheckCircle className="h-4 w-4" />, color: "from-emerald-500 to-green-600" },
                          { label: "Rejected Loans", value: analyticsData.loan_summary.total_rejected, icon: <XCircle className="h-4 w-4" />, color: "from-rose-500 to-red-600" },
                          { label: "Total Loan Value", value: formatCurrency(analyticsData.loan_summary.total_amount), icon: <DollarSign className="h-4 w-4" />, color: "from-violet-500 to-purple-600" },
                        ].map((stat) => (
                          <Card key={stat.label} className="relative overflow-hidden shadow-md">
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
                            <CardContent className="relative p-4">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                                  {stat.icon}
                                </div>
                              </div>
                              <p className="mt-2 text-xl font-bold text-gray-900">{stat.value}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="shadow-md">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Transaction Trends (30 Days)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <AreaChart data={analyticsData.trends}>
                                <defs>
                                  <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1F8A4D" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#1F8A4D" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="colorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Area type="monotone" dataKey="deposits" name="Deposits" stroke="#1F8A4D" fillOpacity={1} fill="url(#colorDeposits)" strokeWidth={2} />
                                <Area type="monotone" dataKey="withdrawals" name="Withdrawals" stroke="#dc2626" fillOpacity={1} fill="url(#colorWithdrawals)" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card className="shadow-md">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Top Accounts by Balance</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                              {analyticsData.top_accounts.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No accounts found</p>
                              ) : (
                                analyticsData.top_accounts.slice(0, 10).map((account, index) => (
                                  <div key={account.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{account.full_name}</p>
                                        <p className="text-xs text-gray-500">{account.account_number}</p>
                                      </div>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900">{formatCurrency(account.balance)}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="shadow-md">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">User Growth</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={280}>
                              <BarChart data={analyticsData.growth.users}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short" })} tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" name="New Users" fill="#1F8A4D" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card className="shadow-md">
                          <CardHeader>
                            <CardTitle className="text-sm font-medium">Account Growth</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={280}>
                              <BarChart data={analyticsData.growth.accounts}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short" })} tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="count" name="New Accounts" fill="#F8CC58" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
                        <TrendingUp className="h-10 w-10 text-blue-300" />
                      </div>
                      <p className="mt-4 text-sm text-gray-500">Click refresh to load analytics data</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
