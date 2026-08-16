"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useLanguage } from "@/contexts/language-context";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  saveLoanOffline,
  getLoansOffline,
  updateLoanOffline,
  addToPendingSync,
  getPendingSyncCount,
} from "@/lib/offline-db";
import { syncData } from "@/lib/sync-engine";
import {
  Banknote,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  CreditCard,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
  Mail,
  Search,
  X,
} from "lucide-react";
import type { Loan } from "@/types";

interface LoanWithUser extends Loan {
  full_name?: string;
  email?: string;
  phone?: string;
  account_balance?: number;
}

interface AccountData {
  account_id: number;
  account_number: string;
  balance: number;
  account_type: string;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
}

const LOAN_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="h-3.5 w-3.5" /> },
  disbursed: { label: "Disbursed", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  paid: { label: "Paid", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  syncing: { label: "Syncing", color: "bg-purple-100 text-purple-800 border-purple-200", icon: <RefreshCw className="h-3.5 w-3.5" /> },
};

export default function LoansPage() {
  const router = useRouter();
  const { user, isAdmin, isStaff, isCustomer } = useAuth();
  const { success, error } = useToast();
  const { isOnline, setSyncing, setPendingItems } = useOnlineStatus();
  const { t } = useLanguage();

  const [loans, setLoans] = useState<LoanWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanWithUser | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
    setPendingItems(count);
  }, [setPendingItems]);

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      if (!isOnline) {
        const offlineLoans = await getLoansOffline(user?.id);
        setLoans(offlineLoans);
        return;
      }
      const endpoint = isStaff ? "/employee/loans" : "/loans";
      const res = await api.get(endpoint);
      const serverLoans = res.data.data || res.data;
      setLoans(serverLoans);
      for (const loan of serverLoans) {
        await saveLoanOffline(loan);
      }
    } catch (err: any) {
      const offlineLoans = await getLoansOffline(user?.id);
      setLoans(offlineLoans);
    } finally {
      setLoading(false);
    }
  }, [isStaff, isOnline, user?.id]);

  useEffect(() => {
    fetchLoans();
    updatePendingCount();
  }, [fetchLoans, updatePendingCount]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      (async () => {
        if (isSyncing) return;
        try {
          setIsSyncing(true);
          setSyncing(true);
          await syncData();
          await fetchLoans();
          await updatePendingCount();
          success("Offline data synced successfully");
        } catch (err) {
          error("Failed to sync offline data");
        } finally {
          setIsSyncing(false);
          setSyncing(false);
        }
      })();
    }
  }, [isOnline, pendingCount]);

  const handleReview = async (loanId: number, status: "approved" | "rejected") => {
    try {
      setSubmitting(true);
      const action = status === "approved" ? "approve" : "reject";
      const reviewData = { review_notes: reviewNotes };

      if (!isOnline) {
        await updateLoanOffline(loanId, { status, review_notes: reviewNotes });
        await addToPendingSync(action, "loan", String(loanId), reviewData);
        await updatePendingCount();
        success(`Loan ${status} offline. Will sync when online.`);
        setShowReviewDialog(false);
        setSelectedLoan(null);
        setReviewNotes("");
        await fetchLoans();
        return;
      }

      const endpoint = isStaff ? `/employee/loans/${loanId}/${action}` : `/admin/loans/${loanId}/${action}`;
      await api.put(endpoint, reviewData);
      success(`Loan ${status} successfully`);
      setShowReviewDialog(false);
      setSelectedLoan(null);
      setReviewNotes("");
      await fetchLoans();
    } catch (err: any) {
      error(err.response?.data?.error || `Failed to ${status} loan`);
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (loan: LoanWithUser) => {
    setSelectedLoan(loan);
    setReviewNotes("");
    setShowReviewDialog(true);
  };

  const openDetailDialog = (loan: LoanWithUser) => {
    setSelectedLoan(loan);
    setShowDetailDialog(true);
  };

  const filteredLoans = loans.filter((loan) => {
    if (!(loan as any).account_number) return false;
    if (statusFilter !== "all" && loan.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (loan.full_name || "").toLowerCase();
      const purpose = (loan.purpose || "").toLowerCase();
      const acctNum = ((loan as any).account_number || "").toLowerCase();
      if (!name.includes(q) && !purpose.includes(q) && !acctNum.includes(q) && !String(loan.amount).includes(q)) return false;
    }
    return true;
  });

  const loanStats = {
    total: loans.length,
    pending: loans.filter((l) => l.status === "pending").length,
    approved: loans.filter((l) => l.status === "approved").length,
    disbursed: loans.filter((l) => l.status === "disbursed").length,
    rejected: loans.filter((l) => l.status === "rejected").length,
    totalAmount: loans.reduce((sum, l) => sum + l.amount, 0),
  };

  const loanStatsCards = [
    { label: "Total Loans", value: loanStats.total, icon: <FileText className="h-5 w-5" />, color: "from-blue-500 to-indigo-600" },
    { label: "Pending", value: loanStats.pending, icon: <Clock className="h-5 w-5" />, color: "from-amber-500 to-orange-600" },
    { label: "Disbursed", value: loanStats.disbursed, icon: <CheckCircle className="h-5 w-5" />, color: "from-emerald-500 to-green-600" },
    { label: "Rejected", value: loanStats.rejected, icon: <XCircle className="h-5 w-5" />, color: "from-red-500 to-rose-600" },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 dark:bg-black">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">Loans</h1>
              <p className="mt-1 text-gray-500">
                {isStaff ? "Manage and review customer loan applications" : "View your loan applications"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1.5 px-3 py-1.5">
                  <WifiOff className="h-3.5 w-3.5" />
                  Offline
                </Badge>
              )}
              {isOnline && pendingCount > 0 && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 gap-1.5 px-3 py-1.5">
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {pendingCount} pending sync
                </Badge>
              )}
              {isOnline && pendingCount === 0 && (
                <Badge className="bg-green-100 text-green-800 border-green-200 gap-1.5 px-3 py-1.5">
                  <Wifi className="h-3.5 w-3.5" />
                  Online
                </Badge>
              )}
              {(isCustomer || ["super_admin", "branch_manager", "customer_service"].includes(user?.role || "")) && (
                <Button
                  className="bg-gradient-to-r from-[#1F8A4D] to-[#176B3D] text-white shadow-lg shadow-[#1F8A4D]/20 hover:from-[#1F8A4D]/90 hover:to-[#176B3D]/90"
                  onClick={() => router.push("/loans/apply")}
                >
                  <Banknote className="mr-1.5 h-4 w-4" />
                  Apply Loan
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loanStatsCards.map((stat) => (
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

          <div className="space-y-4">
              {/* Search and Filter */}
              {loans.length > 0 && (
                <Card className="shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name, purpose, account, or amount..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {["all", "pending", "approved", "rejected"].map((status) => (
                          <Button
                            key={status}
                            variant={statusFilter === status ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter(status)}
                            className={statusFilter === status ? "bg-blue-600 text-white" : ""}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loading ? (
                <div className="grid gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="shadow-md">
                      <CardContent className="p-6 dark:bg-black">
                        <div className="animate-pulse space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gray-200" />
                            <div className="space-y-2">
                              <div className="h-4 w-40 rounded bg-gray-200" />
                              <div className="h-3 w-24 rounded bg-gray-200" />
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            {[...Array(4)].map((_, j) => (
                              <div key={j} className="h-16 rounded-lg bg-gray-100" />
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredLoans.length === 0 ? (
                <Card className="shadow-md">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
                      <Banknote className="h-10 w-10 text-blue-400" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                      {searchQuery || statusFilter !== "all" ? "No loans match your search" : "No loan applications yet"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {isStaff ? "Create a loan application for a customer" : "Apply for your first loan"}
                    </p>
                    {!searchQuery && statusFilter === "all" && (isCustomer || ["super_admin", "branch_manager", "customer_service"].includes(user?.role || "")) && (
                      <Button
                        className="mt-4 bg-gradient-to-r from-[#1F8A4D] to-[#176B3D] text-white shadow-lg shadow-[#1F8A4D]/20 hover:from-[#1F8A4D]/90 hover:to-[#176B3D]/90"
                        onClick={() => router.push("/loans/apply")}
                      >
                        <Banknote className="mr-1.5 h-4 w-4" />
                        Apply Loan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredLoans.map((loan) => {
                    const statusConfig = LOAN_STATUS_CONFIG[loan.status] || LOAN_STATUS_CONFIG.pending;
                    return (
                      <Card key={loan.id} className={`group shadow-md hover:shadow-lg transition-all duration-300 ${
                        loan.status === "rejected" ? "border-l-4 border-l-red-400 bg-red-50/30" :
                        loan.status === "approved" || loan.status === "disbursed" ? "border-l-4 border-l-green-400 bg-green-50/30" :
                        loan.status === "pending" ? "border-l-4 border-l-amber-400 bg-amber-50/30" :
                        ""
                      }`}>
                        <CardContent className="p-6 dark:bg-black">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`flex h-14 w-14 items-center justify-center rounded-xl text-white shadow-md ${
                                loan.status === "rejected" ? "bg-gradient-to-br from-red-400 to-rose-600" :
                                loan.status === "approved" || loan.status === "disbursed" ? "bg-gradient-to-br from-green-400 to-emerald-600" :
                                loan.status === "pending" ? "bg-gradient-to-br from-amber-400 to-orange-600" :
                                "bg-gradient-to-br from-blue-500 to-indigo-600"
                              }`}>
                                <Banknote className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(loan.amount)}
                                  </h3>
                                  <Badge className={`${statusConfig.color} border text-xs font-medium gap-1`}>
                                    {statusConfig.icon}
                                    {statusConfig.label}
                                  </Badge>
                                  {"sync_status" in loan && (loan as any).sync_status === "pending" && (
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs gap-1">
                                      <RefreshCw className="h-3 w-3" />
                                      Pending Sync
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
                                  {isStaff && loan.full_name && (
                                    <>
                                      <User className="h-3.5 w-3.5" />
                                      <span className="font-medium">{loan.full_name}</span>
                                      <span className="h-1 w-1 rounded-full bg-gray-300" />
                                    </>
                                  )}
                                  {isStaff && loan.email && (
                                    <>
                                      <Mail className="h-3.5 w-3.5" />
                                      <span>{loan.email}</span>
                                      <span className="h-1 w-1 rounded-full bg-gray-300" />
                                    </>
                                  )}
                                  <span>Applied {formatDate(loan.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-200"
                                onClick={() => openDetailDialog(loan)}
                              >
                                <FileText className="mr-1.5 h-3.5 w-3.5" />
                                View
                              </Button>
                              {["super_admin", "branch_manager", "customer_service"].includes(user?.role || "") && loan.status === "pending" && (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                                  onClick={() => openReviewDialog(loan)}
                                >
                                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                  Review
                                </Button>
                              )}
                              {["super_admin", "branch_manager", "customer_service"].includes(user?.role || "") && loan.status === "rejected" && (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-200"
                                  onClick={() => openReviewDialog(loan)}
                                >
                                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                  Re-Review
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Amount</p>
                              <p className="mt-0.5 font-semibold text-black dark:text-white">{formatCurrency(loan.amount)}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Term</p>
                              <p className="mt-0.5 font-semibold text-black dark:text-white">{loan.term_months} months</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Purpose</p>
                              <p className="mt-0.5 truncate font-semibold text-black dark:text-white">{loan.purpose || "N/A"}</p>
                            </div>
                            {(loan as any).account_number && (
                              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Account</p>
                                <p className="mt-0.5 truncate font-semibold text-black dark:text-white">{(loan as any).account_number}</p>
                              </div>
                            )}
                          </div>

                          {loan.status === "disbursed" && (loan as any).disbursed_at && (
                            <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                <p className="text-sm font-medium text-emerald-800">
                                  Disbursed to {(loan as any).account_number || "account"} on {formatDate((loan as any).disbursed_at)}
                                </p>
                              </div>
                            </div>
                          )}

                          {loan.status === "rejected" && loan.review_notes && (
                            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
                              <p className="text-xs font-medium text-red-700">Rejection Reason</p>
                              <p className="mt-1 text-sm text-red-600">{loan.review_notes}</p>
                            </div>
                          )}
                          {loan.status === "approved" && loan.review_notes && (
                            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3">
                              <p className="text-xs font-medium text-green-700">Approval Notes</p>
                              <p className="mt-1 text-sm text-green-600">{loan.review_notes}</p>
                            </div>
                          )}
                          {loan.status !== "rejected" && loan.status !== "approved" && loan.review_notes && (
                            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3">
                              <p className="text-xs font-medium text-blue-800">Review Notes</p>
                              <p className="mt-1 text-sm text-blue-700">{loan.review_notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
          </div>
        </div>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${
                  selectedLoan?.status === "rejected"
                    ? "bg-gradient-to-br from-amber-500 to-orange-600"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600"
                }`}>
                  {selectedLoan?.status === "rejected" ? <RefreshCw className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-lg">
                    {selectedLoan?.status === "rejected" ? "Re-Review Loan Application" : "Review Loan Application"}
                  </DialogTitle>
                  <p className="text-sm text-gray-500">
                    {selectedLoan?.status === "rejected"
                      ? "This loan was previously rejected. Approve or reject again."
                      : "Approve or reject this loan request"}
                  </p>
                </div>
              </div>
            </DialogHeader>
            {selectedLoan && (
              <div className="space-y-4">
                {selectedLoan.status === "rejected" && selectedLoan.review_notes && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-xs font-medium text-red-700">Previous Rejection Reason</p>
                    <p className="mt-1 text-sm text-red-600">{selectedLoan.review_notes}</p>
                  </div>
                )}
                <div className={`rounded-xl p-5 text-white ${
                  selectedLoan.status === "rejected"
                    ? "bg-gradient-to-br from-amber-500 to-orange-600"
                    : "bg-gradient-to-br from-blue-600 to-indigo-700"
                }`}>
                  <p className="text-sm font-medium text-white/80">Loan Amount</p>
                  <p className="mt-1 text-2xl font-bold">{formatCurrency(selectedLoan.amount)}</p>
                  <div className="mt-3 flex items-center gap-3 text-sm text-white/80">
                    <span>{selectedLoan.term_months} months</span>
                    <span className="h-1 w-1 rounded-full bg-white/50" />
                    <span>{selectedLoan.purpose || "No purpose specified"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {selectedLoan.full_name && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Applicant</p>
                      <p className="mt-0.5 font-semibold text-black">{selectedLoan.full_name}</p>
                    </div>
                  )}
                  {selectedLoan.email && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Email</p>
                      <p className="mt-0.5 font-semibold text-black">{selectedLoan.email}</p>
                    </div>
                  )}
                  {selectedLoan.phone && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Phone</p>
                      <p className="mt-0.5 font-semibold text-black">{selectedLoan.phone}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Monthly Income</p>
                    <p className="mt-0.5 font-semibold text-black">{formatCurrency(selectedLoan.monthly_income || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Applied Date</p>
                    <p className="mt-0.5 font-semibold text-black">{formatDate(selectedLoan.created_at)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Review Notes</Label>
                  <Textarea
                    placeholder="Add notes about this decision..."
                    className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 min-h-[80px] resize-none"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowReviewDialog(false)} className="border-gray-200 hover:bg-gray-50">
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={submitting}
                onClick={() => selectedLoan && handleReview(selectedLoan.id, "rejected")}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <XCircle className="mr-1.5 h-4 w-4" />
                Reject
              </Button>
              <Button
                disabled={submitting}
                className="bg-gradient-to-r from-[#1F8A4D] to-[#176B3D] text-white hover:from-[#1F8A4D]/90 hover:to-[#176B3D]/90 shadow-lg shadow-[#1F8A4D]/20"
                onClick={() => selectedLoan && handleReview(selectedLoan.id, "approved")}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${
                  selectedLoan?.status === "rejected" ? "bg-gradient-to-br from-red-400 to-rose-600" :
                  selectedLoan?.status === "approved" || selectedLoan?.status === "disbursed" ? "bg-gradient-to-br from-green-400 to-emerald-600" :
                  "bg-gradient-to-br from-blue-500 to-indigo-600"
                }`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Loan Details</DialogTitle>
                  <p className="text-sm text-gray-500">Full information about this loan application</p>
                </div>
              </div>
            </DialogHeader>
            {selectedLoan && (
              <div className="space-y-4">
                <div className={`rounded-xl p-6 text-white ${
                  selectedLoan.status === "rejected" ? "bg-gradient-to-br from-red-400 to-rose-600" :
                  selectedLoan.status === "approved" || selectedLoan.status === "disbursed" ? "bg-gradient-to-br from-green-400 to-emerald-600" :
                  "bg-gradient-to-br from-blue-600 to-indigo-700"
                }`}>
                  <p className="text-sm font-medium text-white/80">Loan Amount</p>
                  <p className="mt-1 text-3xl font-bold">{formatCurrency(selectedLoan.amount)}</p>
                  <Badge className={`mt-3 ${LOAN_STATUS_CONFIG[selectedLoan.status]?.color || ""} border-0`}>
                    {LOAN_STATUS_CONFIG[selectedLoan.status]?.label || selectedLoan.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {selectedLoan.full_name && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Applicant</p>
                      <p className="mt-0.5 font-semibold text-black">{selectedLoan.full_name}</p>
                    </div>
                  )}
                  {selectedLoan.email && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Email</p>
                      <p className="mt-0.5 font-semibold text-black">{selectedLoan.email}</p>
                    </div>
                  )}
                  {selectedLoan.phone && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Phone</p>
                      <p className="mt-0.5 font-semibold text-black">{selectedLoan.phone}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Term</p>
                    <p className="mt-0.5 font-semibold text-black">{selectedLoan.term_months} months</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Purpose</p>
                    <p className="mt-0.5 font-semibold text-black">{selectedLoan.purpose || "N/A"}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Monthly Income</p>
                    <p className="mt-0.5 font-semibold text-black">{formatCurrency(selectedLoan.monthly_income || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Applied Date</p>
                    <p className="mt-0.5 font-semibold text-black">{formatDate(selectedLoan.created_at)}</p>
                  </div>
                  {(selectedLoan as any).account_number && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Account Number</p>
                      <p className="mt-0.5 font-semibold text-black">{(selectedLoan as any).account_number}</p>
                    </div>
                  )}
                </div>
                {selectedLoan.status === "disbursed" && (selectedLoan as any).disbursed_at && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                    <p className="text-xs font-medium text-emerald-800">Disbursed</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">
                      ${selectedLoan.amount.toLocaleString()} sent to {(selectedLoan as any).account_number || "account"} on {formatDate((selectedLoan as any).disbursed_at)}
                    </p>
                  </div>
                )}
                {selectedLoan.status === "rejected" && selectedLoan.review_notes && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-xs font-medium text-red-700">Rejection Reason</p>
                    <p className="mt-1 text-sm text-red-600">{selectedLoan.review_notes}</p>
                  </div>
                )}
                {selectedLoan.status === "approved" && selectedLoan.review_notes && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                    <p className="text-xs font-medium text-green-700">Approval Notes</p>
                    <p className="mt-1 text-sm text-green-600">{selectedLoan.review_notes}</p>
                  </div>
                )}
                {selectedLoan.status !== "rejected" && selectedLoan.status !== "approved" && selectedLoan.review_notes && (
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs font-medium text-blue-800">Review Notes</p>
                    <p className="mt-1 text-sm text-blue-700">{selectedLoan.review_notes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="border-gray-200">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
