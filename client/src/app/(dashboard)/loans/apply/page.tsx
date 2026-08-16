"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ProtectedRoute from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { saveLoanOffline, addToPendingSync } from "@/lib/offline-db";
import {
  Banknote, Loader2, ArrowLeft, DollarSign, Calendar,
  FileText, WifiOff, CheckCircle, CreditCard, Lock,
  Wallet,
} from "lucide-react";
import type { Loan } from "@/types";

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

function LoanApplyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isStaff } = useAuth();
  const { success, error } = useToast();

  const [isOnline, setIsOnline] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    amount: searchParams.get("amount") || "",
    term_months: searchParams.get("term") || "",
    purpose: "",
  });

  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const preSelectedAccountNumber = searchParams.get("account_number") || "";
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState("");
  const [customerPin, setCustomerPin] = useState("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const isStaffUser = isStaff && user?.role !== "customer";

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (isStaff && !["super_admin", "branch_manager", "manager", "customer_service"].includes(user?.role || "")) {
      router.push("/loans");
    }
  }, [isStaff, user, router]);

  const fetchCustomers = useCallback(async () => {
    if (!isStaffUser) return;
    try {
      setLoadingCustomers(true);
      const res = await api.get("/employee/users", { params: { role: "customer", status: "active" } });
      setCustomers(res.data || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, [isStaffUser]);

  useEffect(() => {
    if (isStaffUser) fetchCustomers();
  }, [isStaffUser, fetchCustomers]);

  const fetchAccounts = useCallback(async (customerId?: string) => {
    try {
      setLoadingAccounts(true);
      setAccountsError("");
      if (!user) {
        setAccountsError("Loading user info...");
        return;
      }
      let res;
      if (isStaffUser && customerId) {
        res = await api.get(`/employee/users/${customerId}/accounts`, { params: { t: Date.now() } });
      } else {
        res = await api.get("/accounts/my-accounts", { params: { t: Date.now() } });
      }
      const myAccounts = (res.data || []).map((acc: any) => ({
        account_id: acc.id,
        account_number: acc.account_number,
        balance: acc.balance,
        account_type: acc.account_type,
        user_id: acc.user_id,
        full_name: user?.full_name || "",
        email: user?.email || "",
        phone: user?.phone || "",
      }));
      setAccounts(myAccounts);
      if (myAccounts.length === 0) {
        setAccountsError("No active accounts found for this customer.");
      } else if (preSelectedAccountNumber) {
        const match = myAccounts.find((a: any) => a.account_number === preSelectedAccountNumber);
        setSelectedAccountId(match ? String(match.account_id) : String(myAccounts[0].account_id));
      } else {
        setSelectedAccountId(String(myAccounts[0].account_id));
      }
    } catch (err: any) {
      setAccounts([]);
      setAccountsError(err.response?.data?.error || "Failed to load accounts. Check server connection.");
    } finally {
      setLoadingAccounts(false);
    }
  }, [user, preSelectedAccountNumber, isStaffUser]);

  useEffect(() => {
    if (isStaff && user?.role !== "customer_service") return;
    if (!isStaffUser) fetchAccounts();
  }, [fetchAccounts, isStaff, user, isStaffUser]);

  const selectedAccount = accounts.find((a) => String(a.account_id) === selectedAccountId) || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) {
      error("Please select an account for this loan");
      return;
    }
    if (!customerPin || customerPin.length < 4) {
      error("Please enter your 4-6 digit PIN");
      return;
    }
    try {
      setSubmitting(true);
      const loanData: Record<string, any> = {
        amount: parseFloat(formData.amount),
        term_months: parseInt(formData.term_months),
        purpose: formData.purpose,
        account_number: selectedAccount.account_number,
        pin: customerPin,
      };

      if (isStaffUser && selectedCustomerId) {
        loanData.customer_id = selectedCustomerId;
      }

      if (!isOnline) {
        const tempId = Date.now();
        const offlineLoan: Loan & { sync_status?: string } = {
          id: tempId,
          user_id: user?.id || 0,
          amount: loanData.amount,
          term_months: loanData.term_months,
          purpose: loanData.purpose,
          loan_type: "",
          monthly_income: 0,
          status: "pending",
          review_notes: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: "pending",
        };
        await saveLoanOffline(offlineLoan);
        await addToPendingSync("create", "loan", String(tempId), loanData);
        success("Loan application saved offline. Will sync when online.");
        setSubmitted(true);
        return;
      }

      await api.post("/loans", loanData);
      success("Loan application submitted successfully");
      setSubmitted(true);
    } catch (err: any) {
      error(err.response?.data?.error || "Failed to submit loan application");
    } finally {
      setSubmitting(false);
    }
  };

  const LOAN_INTEREST_RATE = 0.12;
  const monthlyRate = LOAN_INTEREST_RATE / 12;
  const amount = parseFloat(formData.amount) || 0;
  const months = parseInt(formData.term_months) || 1;
  const estimatedMonthly = amount > 0 && months > 0
    ? (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1)
    : 0;

  if (submitted) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6 dark:bg-black">
            <Button variant="ghost" onClick={() => router.push("/loans")} className="gap-2 text-gray-600 hover:text-gray-900 dark:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to Loans
            </Button>
            <Card className="shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Application Submitted</h2>
                <p className="mt-2 text-sm text-gray-500 text-center max-w-sm">
                  {isOnline
                    ? "Loan application submitted. You will be notified once reviewed."
                    : "Saved offline. Will sync when you're back online."}
                </p>
                {!isOnline && (
                  <Badge className="mt-4 bg-amber-100 text-amber-800 border-amber-200 gap-1.5 px-3 py-1.5">
                    <WifiOff className="h-3.5 w-3.5" /> Will sync when online
                  </Badge>
                )}
                <div className="mt-6 flex gap-3">
                  <Button variant="outline" onClick={() => { setSubmitted(false); setSelectedAccountId(""); setCustomerPin(""); setFormData({ amount: "", term_months: "", purpose: "" }); }}>
                    Apply Another
                  </Button>
                  <Button className="bg-gradient-to-r from-[#1F8A4D] to-[#176B3D] text-white" onClick={() => router.push("/loans")}>
                    View Loans
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/loans")} className="gap-2 text-gray-600 hover:text-gray-900 dark:text-white">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">
                Apply for a Loan
              </h1>
              <p className="mt-1 text-gray-500">
                Fill in the details below to submit your application
              </p>
            </div>
          </div>

          {!isOnline && (
            <Card className="border-amber-200 bg-amber-50 shadow-sm">
              <CardContent className="flex items-center gap-3 py-4">
                <WifiOff className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">You are offline</p>
                  <p className="text-xs text-amber-600">Your application will be saved and submitted when you reconnect.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="h-5 w-5 text-blue-600" />
                Loan Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">

                {isStaffUser && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Select Customer</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setAccounts([]);
                        setSelectedAccountId("");
                        setAccountsError("");
                        if (e.target.value) fetchAccounts(e.target.value);
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">{loadingCustomers ? "Loading customers..." : "Choose a customer"}</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedAccount && (
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-bold text-green-800">Your Account</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <CreditCard className="h-3 w-3" />
                        <span>{selectedAccount.account_number}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Wallet className="h-3 w-3" />
                        <span>{formatCurrency(selectedAccount.balance)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {!selectedAccount && loadingAccounts && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading your account...</span>
                  </div>
                )}

                {accountsError && !loadingAccounts && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-xs text-red-600">{accountsError}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Your PIN
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <Input
                      type="password"
                      maxLength={6}
                      placeholder="Enter 4-6 digit PIN"
                      className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-12"
                      value={customerPin}
                      onChange={(e) => setCustomerPin(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Loan Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <Input type="number" step="0.01" min="1" placeholder="0.00"
                      className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-12"
                      value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Loan Term (Months)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <Input type="number" min="1" max="360" placeholder="e.g. 12"
                      className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-12"
                      value={formData.term_months} onChange={(e) => setFormData({ ...formData, term_months: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Purpose</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <Input placeholder="e.g. Business expansion, Home renovation"
                      className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-12"
                      value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} required />
                  </div>
                </div>

                {amount > 0 && months > 0 && (
                  <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white">
                    <p className="text-sm font-medium text-blue-100">Estimated Monthly Payment</p>
                    <p className="mt-1 text-3xl font-bold">{formatCurrency(estimatedMonthly)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-white/10 p-3">
                        <p className="text-xs text-blue-200">Total Payment</p>
                        <p className="font-semibold">{formatCurrency(estimatedMonthly * months)}</p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-3">
                        <p className="text-xs text-blue-200">Total Interest</p>
                        <p className="font-semibold">{formatCurrency((estimatedMonthly * months) - amount)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-blue-200">
                      <span>Annual Rate: 12%</span>
                      <span className="h-1 w-1 rounded-full bg-blue-300" />
                      <span>{months} months</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => router.push("/loans")} className="border-gray-200">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !selectedAccount || !customerPin}
                    className="flex-1 bg-gradient-to-r from-[#1F8A4D] to-[#176B3D] text-white shadow-lg shadow-[#1F8A4D]/20 hover:from-[#1F8A4D]/90 hover:to-[#176B3D]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitting ? "Submitting..." : isOnline ? "Submit Application" : "Save Offline"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function LoanApplyPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <LoanApplyForm />
    </Suspense>
  );
}
