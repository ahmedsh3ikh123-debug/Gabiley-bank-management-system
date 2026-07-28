"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
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
  Calculator,
  TrendingUp,
  FileText,
  AlertCircle,
  DollarSign,
  Calendar,
  Percent,
  ArrowRight,
  Info,
  Plus,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import type { Loan } from "@/types";

const LOAN_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="h-3.5 w-3.5" /> },
  paid: { label: "Paid", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  syncing: { label: "Syncing", color: "bg-purple-100 text-purple-800 border-purple-200", icon: <RefreshCw className="h-3.5 w-3.5" /> },
};

function calculateLoanDetails(amount: number, termMonths: number) {
  const annualRate = 0.12;
  const monthlyRate = annualRate / 12;
  const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = totalPayment - amount;

  return {
    monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
    totalPayment: isNaN(totalPayment) ? 0 : totalPayment,
    totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
    annualRate,
  };
}

export default function LoansPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();
  const { isOnline, setSyncing, setPendingItems } = useOnlineStatus();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("loans");
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [calculatorData, setCalculatorData] = useState({
    amount: "",
    term_months: "",
  });

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
      const endpoint = isAdmin ? "/admin/loans" : "/loans";
      const res = await api.get(endpoint);
      const serverLoans = res.data.data || res.data;
      setLoans(serverLoans);
      for (const loan of serverLoans) {
        await saveLoanOffline(loan);
      }
    } catch (err: any) {
      console.error("Failed to fetch loans:", err);
      const offlineLoans = await getLoansOffline(user?.id);
      setLoans(offlineLoans);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isOnline, user?.id]);

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
          console.error("Sync failed:", err);
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

      await api.put(`/admin/loans/${loanId}/${action}`, reviewData);
      success(`Loan ${status} successfully`);
      setShowReviewDialog(false);
      setSelectedLoan(null);
      setReviewNotes("");
      fetchLoans();
    } catch (err: any) {
      error(err.response?.data?.error || `Failed to ${status} loan`);
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setReviewNotes("");
    setShowReviewDialog(true);
  };

  const openDetailDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDetailDialog(true);
  };

  const loanStats = {
    total: loans.length,
    pending: loans.filter((l) => l.status === "pending").length,
    approved: loans.filter((l) => l.status === "approved").length,
    rejected: loans.filter((l) => l.status === "rejected").length,
    totalAmount: loans.reduce((sum, l) => sum + l.amount, 0),
  };

  const loanStatsCards = [
    { label: "Total Applications", value: loanStats.total, icon: <FileText className="h-5 w-5" />, color: "from-blue-500 to-indigo-600" },
    { label: "Pending Review", value: loanStats.pending, icon: <Clock className="h-5 w-5" />, color: "from-amber-500 to-orange-600" },
    { label: "Approved", value: loanStats.approved, icon: <CheckCircle className="h-5 w-5" />, color: "from-emerald-500 to-green-600" },
    { label: "Total Value", value: formatCurrency(loanStats.totalAmount), icon: <DollarSign className="h-5 w-5" />, color: "from-violet-500 to-purple-600" },
  ];

  const calculatorDetails = calculateLoanDetails(
    parseFloat(calculatorData.amount) || 0,
    parseInt(calculatorData.term_months) || 1
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918]">Loans</h1>
              <p className="mt-1 text-gray-500">
                {isAdmin ? "Review and manage loan applications" : "Apply for loans and track your applications"}
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
              {!isAdmin && (
                <Button
                  onClick={() => router.push("/loans/apply")}
                  className="bg-gradient-to-r from-[#1F8A4D] to-[#176B3D] text-white shadow-lg shadow-[#1F8A4D]/20 hover:from-[#1F8A4D]/90 hover:to-[#176B3D]/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Apply for Loan
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
                      <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-gray-200 shadow-sm">
              <TabsTrigger value="loans" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <FileText className="h-4 w-4" />
                Loan Applications
              </TabsTrigger>
              {!isAdmin && (
                <TabsTrigger value="calculator" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Calculator className="h-4 w-4" />
                  Loan Calculator
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="loans" className="space-y-4">
              {loading ? (
                <div className="grid gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="shadow-md">
                      <CardContent className="p-6">
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
              ) : loans.length === 0 ? (
                <Card className="shadow-md">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
                      <Banknote className="h-10 w-10 text-blue-400" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-gray-900">No loan applications</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {isAdmin ? "No loan applications to review yet" : "Apply for a loan to get started"}
                    </p>
                    {!isAdmin && (
                      <Button
                        onClick={() => router.push("/loans/apply")}
                        className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Apply for Loan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {loans.map((loan) => {
                    const statusConfig = LOAN_STATUS_CONFIG[loan.status] || LOAN_STATUS_CONFIG.pending;
                    return (
                      <Card key={loan.id} className="group shadow-md hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                                <Banknote className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-bold text-gray-900">
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
                                <p className="mt-0.5 text-sm text-gray-500">
                                  Applied on {formatDate(loan.created_at)}
                                </p>
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
                                Details
                              </Button>
                              {isAdmin && loan.status === "pending" && (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                                  onClick={() => openReviewDialog(loan)}
                                >
                                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                  Review
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-lg bg-gray-50 p-3">
                              <p className="text-xs font-medium text-gray-500">Amount</p>
                              <p className="mt-0.5 font-semibold text-gray-900">{formatCurrency(loan.amount)}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                              <p className="text-xs font-medium text-gray-500">Term</p>
                              <p className="mt-0.5 font-semibold text-gray-900">{loan.term_months} months</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                              <p className="text-xs font-medium text-gray-500">Purpose</p>
                              <p className="mt-0.5 truncate font-semibold text-gray-900">{loan.purpose}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                              <p className="text-xs font-medium text-gray-500">Monthly Income</p>
                              <p className="mt-0.5 font-semibold text-gray-900">{formatCurrency(loan.monthly_income)}</p>
                            </div>
                          </div>

                          {loan.review_notes && (
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
            </TabsContent>

            {/* Calculator Tab */}
            {!isAdmin && (
              <TabsContent value="calculator" className="space-y-4">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Calculator className="h-5 w-5 text-blue-600" />
                        Loan Calculator
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Loan Amount</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-10 border-gray-200 bg-gray-50 focus:bg-white h-12"
                            value={calculatorData.amount}
                            onChange={(e) => setCalculatorData({ ...calculatorData, amount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Loan Term (Months)</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            type="number"
                            min="1"
                            max="360"
                            placeholder="e.g. 12"
                            className="pl-10 border-gray-200 bg-gray-50 focus:bg-white h-12"
                            value={calculatorData.term_months}
                            onChange={(e) => setCalculatorData({ ...calculatorData, term_months: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-3 flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 text-blue-600 flex-shrink-0" />
                        <p className="text-xs text-blue-700">
                          Annual interest rate: 12%. This is an estimate. Actual rates may vary based on your credit profile.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Calculation Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
                        <p className="text-sm font-medium text-blue-100">Estimated Monthly Payment</p>
                        <p className="mt-1 text-3xl font-bold">{formatCurrency(calculatorDetails.monthlyPayment)}</p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-gray-50 p-4">
                          <p className="text-xs font-medium text-gray-500">Total Interest</p>
                          <p className="mt-1 text-lg font-bold text-amber-600">{formatCurrency(calculatorDetails.totalInterest)}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-4">
                          <p className="text-xs font-medium text-gray-500">Total Payment</p>
                          <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(calculatorDetails.totalPayment)}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg bg-green-50 p-4">
                        <div className="flex items-center gap-3">
                          <Percent className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-900">Annual Interest Rate</p>
                            <p className="text-2xl font-bold text-green-700">{(calculatorDetails.annualRate * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                        onClick={() => router.push(`/loans/apply?amount=${calculatorData.amount}&term=${calculatorData.term_months}`)}
                        disabled={!calculatorData.amount || !calculatorData.term_months}
                      >
                        Apply for This Loan
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Review Loan Application</DialogTitle>
                  <p className="text-sm text-gray-500">Approve or reject this application</p>
                </div>
              </div>
            </DialogHeader>
            {selectedLoan && (
              <div className="space-y-4">
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white">
                  <p className="text-sm font-medium text-blue-100">Loan Amount</p>
                  <p className="mt-1 text-2xl font-bold">{formatCurrency(selectedLoan.amount)}</p>
                  <div className="mt-3 flex items-center gap-3 text-sm text-blue-100">
                    <span>{selectedLoan.term_months} months</span>
                    <span className="h-1 w-1 rounded-full bg-blue-300" />
                    <span>{selectedLoan.purpose}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Monthly Income</p>
                    <p className="mt-0.5 font-semibold">{formatCurrency(selectedLoan.monthly_income)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Applied</p>
                    <p className="mt-0.5 font-semibold">{formatDate(selectedLoan.created_at)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Review Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add notes about this decision..."
                    className="border-gray-200 bg-gray-50 focus:bg-white min-h-[80px] resize-none"
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Loan Details</DialogTitle>
                  <p className="text-sm text-gray-500">Complete application information</p>
                </div>
              </div>
            </DialogHeader>
            {selectedLoan && (
              <div className="space-y-4">
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
                  <p className="text-sm font-medium text-blue-100">Loan Amount</p>
                  <p className="mt-1 text-3xl font-bold">{formatCurrency(selectedLoan.amount)}</p>
                  <Badge className={`mt-3 ${LOAN_STATUS_CONFIG[selectedLoan.status]?.color || ""} border-0`}>
                    {LOAN_STATUS_CONFIG[selectedLoan.status]?.label || selectedLoan.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Term</p>
                    <p className="mt-0.5 font-semibold">{selectedLoan.term_months} months</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Purpose</p>
                    <p className="mt-0.5 font-semibold">{selectedLoan.purpose}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Monthly Income</p>
                    <p className="mt-0.5 font-semibold">{formatCurrency(selectedLoan.monthly_income)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Applied</p>
                    <p className="mt-0.5 font-semibold">{formatDate(selectedLoan.created_at)}</p>
                  </div>
                </div>
                {selectedLoan.review_notes && (
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
