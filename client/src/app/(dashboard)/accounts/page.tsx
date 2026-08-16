"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useLanguage } from "@/contexts/language-context";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

import {
  CreditCard,
  Plus,
  Search,
  Shield,
  DollarSign,
  Eye,
  Wallet,
  Landmark,
  Snowflake,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  User,
  Banknote,
} from "lucide-react";
import type { Account } from "@/types";

const ACCOUNT_TYPE_CONFIG: Record<string, { label: string; color: string; bgClass: string; icon: React.ReactNode }> = {
  savings: { label: "Savings", color: "bg-blue-100 text-blue-800 border-blue-200", bgClass: "from-blue-500 to-blue-600", icon: <Wallet className="h-5 w-5" /> },
  current: { label: "Current", color: "bg-green-100 text-green-800 border-green-200", bgClass: "from-green-500 to-green-600", icon: <Landmark className="h-5 w-5" /> },
  fixed_deposit: { label: "Fixed Deposit", color: "bg-amber-100 text-amber-800 border-amber-200", bgClass: "from-amber-500 to-amber-600", icon: <DollarSign className="h-5 w-5" /> },
  customer: { label: "Customer", color: "bg-purple-100 text-purple-800 border-purple-200", bgClass: "from-purple-500 to-purple-600", icon: <User className="h-5 w-5" /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: "Active", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-800 border-red-200", icon: <Lock className="h-3.5 w-3.5" /> },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-800 border-gray-200", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

export default function AccountsPage() {
  const router = useRouter();
  const { user, isAdmin, isStaff } = useAuth();
  const { success, error } = useToast();
  const { t } = useLanguage();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    mother_name: "",
  });

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = isStaff ? "/accounts/all" : "/accounts";
      const res = await api.get(endpoint);
      setAccounts(res.data.data || res.data);
    } catch {
      error("Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  }, [isStaff, error]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post("/accounts", { mother_name: formData.mother_name });
      success("Account created successfully");
      setFormData({ mother_name: "" });
      setShowCreateDialog(false);
      fetchAccounts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockAccount = async (accountId: number) => {
    try {
      setSubmitting(true);
      await api.put(`/admin/accounts/${accountId}/block`);
      success("Account blocked successfully");
      fetchAccounts();
    } catch {
      error("Failed to block account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblockAccount = async (accountId: number) => {
    try {
      setSubmitting(true);
      await api.put(`/admin/accounts/${accountId}/unblock`);
      success("Account unblocked successfully");
      fetchAccounts();
    } catch {
      error("Failed to unblock account");
    } finally {
      setSubmitting(false);
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeAccounts = accounts.filter((a) => a.status === "active").length;
  const hasAccount = accounts.length > 0;

  const filteredAccounts = accounts.filter(
    (acc) =>
      (acc.account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.account_type.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (typeFilter === "all" || acc.account_type === typeFilter) &&
      (customerFilter === "all" || (customerFilter === "customer" && acc.account_type === "customer") || (customerFilter === "non_customer" && acc.account_type !== "customer"))
  );

  const accountStats = [
    { label: t("total_accounts"), value: accounts.length, icon: <CreditCard className="h-5 w-5" />, color: "from-blue-500 to-indigo-600" },
    { label: t("total_balance"), value: formatCurrency(totalBalance), icon: <DollarSign className="h-5 w-5" />, color: "from-emerald-500 to-green-600" },
    { label: t("active"), value: activeAccounts, icon: <CheckCircle className="h-5 w-5" />, color: "from-violet-500 to-purple-600" },
    { label: t("inactive"), value: accounts.filter((a) => a.status === "blocked").length, icon: <Lock className="h-5 w-5" />, color: "from-rose-500 to-red-600" },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">
                {t("accounts")}
              </h1>
              <p className="mt-1 text-gray-500">
                {isStaff ? t("management") : t("accounts")}
              </p>
            </div>
            <div className="flex gap-2">
              {!isStaff && !hasAccount && (
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-blue-800"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("create_new")}
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {accountStats.map((stat) => (
              <Card key={stat.label} className="relative overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
                <CardContent className="relative p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t("search_placeholder")}
                    className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm focus:bg-white dark:focus:bg-gray-800 focus:border-[#1F8A4D] focus:ring-2 focus:ring-[#1F8A4D]/20 focus:outline-none pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm focus:bg-white dark:focus:bg-gray-800 focus:border-[#1F8A4D] focus:ring-2 focus:ring-[#1F8A4D]/20 focus:outline-none sm:w-[180px]">
                    <SelectValue placeholder={t("account_type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm focus:bg-white dark:focus:bg-gray-800 focus:border-[#1F8A4D] focus:ring-2 focus:ring-[#1F8A4D]/20 focus:outline-none sm:w-[200px]">
                    <SelectValue placeholder="-- Select customer account --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="customer">Customer Accounts</SelectItem>
                    <SelectItem value="non_customer">Non-Customer Accounts</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setCustomerFilter("all"); setTypeFilter("all"); }}
                  className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm focus:bg-white dark:focus:bg-gray-800 focus:border-[#1F8A4D] focus:ring-2 focus:ring-[#1F8A4D]/20 focus:outline-none sm:w-auto"
                >
                  {t("view_all")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Cards Grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shadow-md">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gray-200" />
                        <div className="space-y-2">
                          <div className="h-4 w-24 rounded bg-gray-200" />
                          <div className="h-3 w-16 rounded bg-gray-200" />
                        </div>
                      </div>
                      <div className="h-8 w-32 rounded bg-gray-200" />
                      <div className="flex gap-2">
                        <div className="h-6 w-16 rounded-full bg-gray-200" />
                        <div className="h-6 w-14 rounded-full bg-gray-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CreditCard className="h-10 w-10 text-blue-400" />
                </div>
                <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{t("no_results")}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || typeFilter !== "all"
                    ? t("no_results")
                    : isStaff
                      ? t("no_data")
                      : t("create_new")}
                </p>
                {!isStaff && !hasAccount && !searchTerm && typeFilter === "all" && (
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("create_new")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAccounts.map((account) => {
                const typeConfig = ACCOUNT_TYPE_CONFIG[account.account_type] || ACCOUNT_TYPE_CONFIG.savings;
                const statusConfig = STATUS_CONFIG[account.status] || STATUS_CONFIG.active;

                return (
                  <Card
                    key={account.id}
                    className="group relative overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${typeConfig.bgClass}`} />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${typeConfig.bgClass} text-white shadow-md`}>
                            {typeConfig.icon}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {typeConfig.label}
                            </p>
                            <p className="mt-0.5 font-mono text-sm font-bold text-gray-900 dark:text-white">
                              {account.account_number}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${statusConfig.color} border text-xs font-medium gap-1`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                      </div>

                      <div className="mt-5">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("balance")}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(account.balance)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>Interest: {account.interest_rate}%</span>
                        <span>{formatDate(account.created_at)}</span>
                      </div>

                      <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => setSelectedAccount(account)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          {t("view")}
                        </Button>
                        {!isStaff && account.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => router.push(`/loans/apply?account_number=${account.account_number}`)}
                          >
                            <Banknote className="mr-1.5 h-3.5 w-3.5" />
                            Request Loan
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            {account.status === "active" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                disabled={submitting}
                                onClick={() => handleBlockAccount(account.id)}
                              >
                                <Lock className="mr-1.5 h-3.5 w-3.5" />
                                Block
                              </Button>
                            ) : account.status === "blocked" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:bg-green-50 hover:text-green-700"
                                disabled={submitting}
                                onClick={() => handleUnblockAccount(account.id)}
                              >
                                <Unlock className="mr-1.5 h-3.5 w-3.5" />
                                Unblock
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Account Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">{t("create_new")}</DialogTitle>
                  <p className="text-sm text-gray-500">{t("accounts")}</p>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleCreateAccount} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Mother's Full Name</Label>
                <Input
                  type="text"
                  placeholder="Enter mother's full name"
                  value={formData.mother_name}
                  onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                  className="h-12 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                  required
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="border-gray-200"
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-blue-800"
                >
                  {submitting && (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                  {t("create_new")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Account Details Dialog */}
        <Dialog open={!!selectedAccount} onOpenChange={(open) => { if (!open) setSelectedAccount(null); }}>
          <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">{t("accounts")}</DialogTitle>
                  <p className="text-sm text-gray-500">{t("details")}</p>
                </div>
              </div>
            </DialogHeader>
            {selectedAccount && (
              <div className="space-y-5">
                {/* Balance Display */}
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
                  <p className="text-sm font-medium text-blue-100">{t("balance")}</p>
                  <p className="mt-1 text-3xl font-bold">{formatCurrency(selectedAccount.balance)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="bg-white/20 text-white border-0 text-xs">
                      {ACCOUNT_TYPE_CONFIG[selectedAccount.account_type]?.label || selectedAccount.account_type}
                    </Badge>
                    <Badge className={`${STATUS_CONFIG[selectedAccount.status]?.color || ""} border-0 text-xs`}>
                      {selectedAccount.status.charAt(0).toUpperCase() + selectedAccount.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-green-50 p-3 border border-green-100">
                    <p className="text-xs font-medium text-green-600">{t("account_number")}</p>
                    <p className="mt-1 font-mono font-semibold text-green-900 dark:text-green-100">{selectedAccount.account_number}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
                    <p className="text-xs font-medium text-blue-600">{t("interest_rate")}</p>
                    <p className="mt-1 font-semibold text-blue-900 dark:text-blue-100">{selectedAccount.interest_rate}% p.a.</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3 border border-purple-100">
                    <p className="text-xs font-medium text-purple-600">{t("created")}</p>
                    <p className="mt-1 font-semibold text-purple-900 dark:text-purple-100">{formatDate(selectedAccount.created_at)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
                    <p className="text-xs font-medium text-amber-600">{t("account_number")}</p>
                    <p className="mt-1 font-mono text-xs text-amber-900 dark:text-amber-100">{selectedAccount.id}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAccount(null)} className="border-gray-200">
                {t("close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


      </DashboardLayout>
    </ProtectedRoute>
  );
}
