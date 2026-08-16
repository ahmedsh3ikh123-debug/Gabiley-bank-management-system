"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useLanguage } from "@/contexts/language-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCurrency,
  getRoleLabel,
} from "@/lib/utils";
import api from "@/lib/api";
import {
  Users,
  TrendingUp,
  Activity,
  Clock,
  UserCheck,
  RefreshCw,
  Shield,
  Star,
  Award,
  BarChart3,
  Loader2,
  Crown,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PIE_COLORS = ["#1F8A4D", "#F8CC58", "#1A1918", "#E4B155", "#EBD6A3", "#3B82F6", "#8B5CF6", "#EC4899"];

interface TopUser {
  id: number;
  full_name: string;
  username: string;
  role: string;
  profile_picture: string;
  branch: string;
  login_count?: number;
  transaction_count?: number;
  processed_count?: number;
  total_amount?: number;
  last_login?: string;
  account_number?: string;
  account_type?: string;
  balance?: number;
}

interface ActivityByRole {
  role: string;
  total_users: number;
  active_this_week: number;
  active_this_month: number;
  ever_logged_in: number;
}

interface TopUsersData {
  topByLogins: TopUser[];
  topByTransactions: TopUser[];
  topEmployees: TopUser[];
  activityByRole: ActivityByRole[];
  topAccounts: TopUser[];
  stats: {
    totalActive: number;
    totalLoginsThisWeek: number;
    totalLoginsThisMonth: number;
    onlineNow: number;
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-80 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
}) {
  return (
    <Card className="relative overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
      <div className={`absolute inset-0 bg-gradient-to-br ${bg} opacity-5`} />
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {value}
            </p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${bg} text-white shadow-lg`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RankedUserRow({
  user,
  rank,
  count,
  countLabel,
  amount,
}: {
  user: TopUser;
  rank: number;
  count: number;
  countLabel: string;
  amount?: number;
}) {
  const rankColors: Record<number, string> = {
    1: "from-yellow-400 to-amber-500 shadow-yellow-500/30",
    2: "from-gray-300 to-gray-400 shadow-gray-400/30",
    3: "from-amber-600 to-amber-700 shadow-amber-600/30",
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/30 p-4 hover:bg-muted/20 transition-all duration-200 group">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
          rankColors[rank] || "from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
        } text-sm font-bold text-white shadow-md`}
      >
        {rank}
      </div>
      <Avatar className="h-10 w-10 border-2 border-white/10">
        <AvatarImage src={user.profile_picture} />
        <AvatarFallback className="bg-gradient-to-br from-[#1F8A4D] to-[#155c34] text-white text-xs font-bold">
          {user.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {user.full_name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {getRoleLabel(user.role)} {user.branch && `• ${user.branch}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-[#1F8A4D]">{count.toLocaleString()}</p>
        <p className="text-xs text-gray-500">{countLabel}</p>
      </div>
      {amount !== undefined && amount > 0 && (
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      )}
    </div>
  );
}

export default function TopUsersPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TopUsersData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/top-users");
      setData(res.data);
    } catch (err: any) {
      error(err.response?.data?.error || "Failed to fetch top users data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const roleChartData = data?.activityByRole.map((r) => ({
    name: getRoleLabel(r.role),
    value: r.total_users,
    active: r.active_this_week,
  })) || [];

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Crown className="h-7 w-7 text-[#F8CC58]" />
                {t("top_users")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("most_active_users")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="border-gray-200"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("refresh")}
            </Button>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : data ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("summary")}</span>
                </TabsTrigger>
                <TabsTrigger value="logins" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("most_active_logins")}</span>
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("most_active_transactions")}</span>
                </TabsTrigger>
                <TabsTrigger value="employees" className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("employee_performance")}</span>
                </TabsTrigger>
              </TabsList>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title={t("active_users")}
                    value={data.stats.totalActive}
                    icon={Users}
                    color="text-[#1F8A4D]"
                    bg="from-[#1F8A4D] to-[#155c34]"
                  />
                  <StatCard
                    title={t("online_now")}
                    value={data.stats.onlineNow}
                    icon={UserCheck}
                    color="text-[#F8CC58]"
                    bg="from-[#F8CC58] to-[#E4B155]"
                  />
                  <StatCard
                    title={t("logins_this_week")}
                    value={data.stats.totalLoginsThisWeek}
                    icon={Zap}
                    color="text-[#3B82F6]"
                    bg="from-[#3B82F6] to-[#2563EB]"
                  />
                  <StatCard
                    title={t("logins_this_month")}
                    value={data.stats.totalLoginsThisMonth}
                    icon={Clock}
                    color="text-[#8B5CF6]"
                    bg="from-[#8B5CF6] to-[#7C3AED]"
                  />
                </div>

                {/* Charts Row */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Role Distribution Chart */}
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#1F8A4D]" />
                        {t("activity_summary")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={roleChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "12px",
                            }}
                          />
                          <Legend />
                          <Bar dataKey="value" name={t("total_users")} fill="#1F8A4D" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="active" name={t("active_this_week")} fill="#F8CC58" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top 3 Users */}
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Crown className="h-4 w-4 text-[#F8CC58]" />
                        {t("user_rankings")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.topByLogins.slice(0, 3).map((user, index) => (
                          <RankedUserRow
                            key={user.id}
                            user={user}
                            rank={index + 1}
                            count={user.login_count || 0}
                            countLabel={t("login_count")}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Accounts */}
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-[#F8CC58]" />
                      {t("top_accounts")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.topAccounts.slice(0, 5).map((account, index) => (
                        <RankedUserRow
                          key={account.id}
                          user={account}
                          rank={index + 1}
                          count={account.balance || 0}
                          countLabel={account.account_number || ""}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* LOGINS TAB */}
              <TabsContent value="logins" className="space-y-6">
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#3B82F6]" />
                      {t("most_active_logins")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.topByLogins.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">{t("no_results")}</p>
                      ) : (
                        data.topByLogins.map((user, index) => (
                          <RankedUserRow
                            key={user.id}
                            user={user}
                            rank={index + 1}
                            count={user.login_count || 0}
                            countLabel={t("login_count")}
                          />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TRANSACTIONS TAB */}
              <TabsContent value="transactions" className="space-y-6">
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[#1F8A4D]" />
                      {t("most_active_transactions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.topByTransactions.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">{t("no_results")}</p>
                      ) : (
                        data.topByTransactions.map((user, index) => (
                          <RankedUserRow
                            key={user.id}
                            user={user}
                            rank={index + 1}
                            count={user.transaction_count || 0}
                            countLabel={t("transaction_count")}
                            amount={user.total_amount}
                          />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* EMPLOYEES TAB */}
              <TabsContent value="employees" className="space-y-6">
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Award className="h-4 w-4 text-[#8B5CF6]" />
                      {t("employee_performance")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.topEmployees.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">{t("no_results")}</p>
                      ) : (
                        data.topEmployees.map((emp, index) => (
                          <RankedUserRow
                            key={emp.id}
                            user={emp}
                            rank={index + 1}
                            count={emp.processed_count || 0}
                            countLabel={t("total_processed")}
                            amount={emp.total_amount}
                          />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
                <Crown className="h-10 w-10 text-blue-300" />
              </div>
              <p className="mt-4 text-sm text-gray-500">{t("no_data")}</p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
