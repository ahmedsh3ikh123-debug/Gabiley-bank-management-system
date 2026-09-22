"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import {
  Send,
  Loader2,
  ArrowLeftRight,
  Wallet,
  DollarSign,
  CheckCircle,
  AlertCircle,
  FileText,
  Receipt,
  CreditCard,
  Edit,
  MousePointerClick,
  Lock,
} from "lucide-react";

interface Account {
  id: number;
  account_number: string;
  account_type: string;
  balance: number;
  status: string;
  full_name?: string;
}

export default function TransferPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const TRANSFER_FEE_RATE = 0.015;

  const [fromAccount, setFromAccount] = useState<string | undefined>(undefined);
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transferPin, setTransferPin] = useState("");

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastTransfer, setLastTransfer] = useState<any>(null);

  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);
  const [transferFilter, setTransferFilter] = useState("all");
  const [viewTransfer, setViewTransfer] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewPin, setViewPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    fetchAccounts();
    fetchAllAccounts();
    fetchRecentTransfers();
  }, []);

  const fetchAccounts = async () => {
    try {
      const isStaff = user?.role !== "customer";
      const url = isStaff ? "/accounts/all" : "/accounts";
      const res = await api.get(url);
      setAccounts(Array.isArray(res.data) ? res.data : res.data?.accounts || []);
    } catch (err) {
      error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAccounts = async () => {
    try {
      const res = await api.get("/accounts/all");
      setAllAccounts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // Silently fail - not critical
    }
  };

  const fetchRecentTransfers = async () => {
    try {
      const res = await api.get("/transactions?type=transfer");
      setRecentTransfers(Array.isArray(res.data) ? res.data.slice(0, 10) : []);
    } catch (err) {
      // Silently fail - not critical
    }
  };

  const filteredTransfers = recentTransfers.filter((t) => {
    if (transferFilter === "sent") {
      return accounts.some((a) => a.account_number === t.from_account_number);
    }
    if (transferFilter === "received") {
      return accounts.some((a) => a.account_number === t.to_account_number);
    }
    return true;
  });

  const selectedAccount = allAccounts.find((a) => a.account_number === fromAccount);
  const transferAmount = parseFloat(amount) || 0;
  const fee = transferAmount * TRANSFER_FEE_RATE;
  const totalDeduction = transferAmount + fee;
  const remainingBalance = (selectedAccount?.balance || 0) - totalDeduction;

  const handleTransferSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/transactions/transfer", {
        from_account_number: fromAccount,
        to_account_number: toAccountNumber,
        amount: transferAmount,
        description: description || "Transfer",
        pin: transferPin,
      });
      setLastTransfer({
        from: fromAccount,
        to: toAccountNumber,
        amount: transferAmount,
        fee,
        description: description || "Transfer",
        date: new Date().toISOString(),
        reference: res.data?.reference || `TXN${Date.now()}`,
      });
      setShowConfirmDialog(false);
      setShowReceiptDialog(true);
      success("Transfer completed successfully");
      setAmount("");
      setDescription("");
      setTransferPin("");
      setToAccountNumber("");
      setFromAccount(undefined);
      fetchAccounts();
      fetchRecentTransfers();
    } catch (err: any) {
      error(err.response?.data?.error || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = fromAccount && toAccountNumber && transferAmount > 0 && selectedAccount && remainingBalance >= 0 && transferPin.length >= 4;

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="space-y-6">
            <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
            <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-24 rounded bg-gray-200" />
                        <div className="h-11 rounded bg-gray-100" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="shadow-md">
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 w-24 rounded bg-gray-200" />
                        <div className="space-y-2">
                          {[...Array(3)].map((_, j) => (
                            <div key={j} className="h-14 rounded bg-gray-100" />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">Transfer Funds</h1>
            <p className="mt-1 text-gray-500">Send money to another account securely</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
            {/* Transfer Form */}
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F8A4D] to-[#155c34] text-white">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-extrabold tracking-tight text-[#1A1918] dark:text-white">Make a Transfer</CardTitle>
                    <p className="text-sm text-gray-500">Transfer funds to another GBMS account</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (canSubmit) setShowConfirmDialog(true);
                  }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#1A1918] dark:text-white">From Account</Label>
                    <select
                      value={fromAccount || ""}
                      onChange={(e) => setFromAccount(e.target.value || undefined)}
                      className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm focus:bg-white dark:focus:bg-gray-800 focus:border-[#1F8A4D] focus:ring-2 focus:ring-[#1F8A4D]/20 focus:outline-none"
                    >
                      <option value="">-- Select source account --</option>
                      {allAccounts.map((account) => (
                        <option key={account.id} value={account.account_number}>
                          {account.account_number} — {account.full_name || account.account_type} — {formatCurrency(account.balance)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F8CC58]/20">
                      <ArrowLeftRight className="h-4 w-4 text-[#F8CC58]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#1A1918] dark:text-white">To Account Number</Label>
                    <select
                      value={toAccountNumber}
                      onChange={(e) => setToAccountNumber(e.target.value)}
                      className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm focus:bg-white dark:focus:bg-gray-800 focus:border-[#1F8A4D] focus:ring-2 focus:ring-[#1F8A4D]/20 focus:outline-none"
                    >
                      <option value="">-- Select destination account --</option>
                      {allAccounts
                        .filter((a) => a.account_number !== fromAccount)
                        .map((account) => (
                          <option key={account.id} value={account.account_number}>
                            {account.account_number} — {account.full_name || account.account_type} — {formatCurrency(account.balance)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#1A1918] dark:text-white">Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:border-[#1F8A4D] focus:ring-[#1F8A4D]/20 h-12 text-lg font-semibold"
                      />
                    </div>
                    {selectedAccount && amount && remainingBalance < 0 && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Insufficient balance. You need {formatCurrency(totalDeduction)} but only have {formatCurrency(selectedAccount.balance)}.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#1A1918] dark:text-white">Description (Optional)</Label>
                    <Input
                      placeholder="What is this transfer for?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:border-[#1F8A4D] focus:ring-[#1F8A4D]/20 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#1A1918] dark:text-white">Transaction PIN</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="4-digit PIN"
                        value={transferPin}
                        onChange={(e) => setTransferPin(e.target.value.replace(/\D/g, ""))}
                        className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:border-pink-500 focus:ring-pink-500/20 h-12"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!canSubmit || submitting || transferPin.length < 4}
                    className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-200 hover:from-pink-500/90 hover:to-rose-600/90 text-base font-semibold"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Review Transfer
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Your Accounts */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    Your Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allAccounts.length > 0 ? (
                    <div className="space-y-3">
                      {allAccounts.map((account) => (
                        <div
                          key={account.id}
                          className={`rounded-xl border p-3 transition-all duration-200 ${
                            fromAccount === account.account_number
                              ? "border-blue-200 bg-blue-50 ring-2 ring-blue-100"
                              : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                <CreditCard className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{account.account_number}</p>
                                <p className="text-xs text-gray-500 capitalize">{account.account_type.replace("_", " ")}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(account.balance)}</p>
                              <Badge className={`${getStatusColor(account.status)} border text-[10px]`} variant="outline">
                                {account.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                            <Button
                              variant={fromAccount === account.account_number ? "default" : "outline"}
                              size="sm"
                              className={`flex-1 h-8 gap-1.5 text-xs ${
                                fromAccount === account.account_number
                                  ? "bg-[#1F8A4D] hover:bg-[#176B3D] text-white"
                                  : ""
                              }`}
                              onClick={() => setFromAccount(account.account_number)}
                              disabled={account.status !== "active"}
                            >
                              <MousePointerClick className="h-3 w-3" />
                              {fromAccount === account.account_number ? "Selected" : "Select"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => {
                                setFromAccount(account.account_number);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                              Update
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4 text-sm">No accounts found</p>
                  )}
                </CardContent>
              </Card>

              {/* Transfer Summary */}
              {selectedAccount && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-blue-600" />
                      Transfer Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Available Balance</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedAccount.balance)}</span>
                    </div>
                    {transferAmount > 0 && (
                      <>
                        <Separator />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Transfer Amount</span>
                          <span className="font-medium text-red-600">-{formatCurrency(transferAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Transfer Fee (1.5%)</span>
                          <span className="font-medium text-amber-600">-{formatCurrency(fee)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Remaining Balance</span>
                          <span className={`font-bold ${remainingBalance < 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(remainingBalance)}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Recent Transfers */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-extrabold tracking-tight text-[#1A1918] dark:text-white">Recent Transfers</CardTitle>
                    <p className="text-sm text-gray-500">Your latest transfer activity</p>
                  </div>
                </div>
                <select
                  value={transferFilter}
                  onChange={(e) => setTransferFilter(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm focus:border-[#1F8A4D] focus:ring-2 focus:ring-[#1F8A4D]/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="all">All</option>
                  <option value="sent">Sent</option>
                  <option value="received">Received</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTransfers.length > 0 ? (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="text-xs font-semibold text-gray-500">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500">From</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500">To</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500">Amount</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500">Fee</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransfers.map((txn) => {
                        const isSent = accounts.some((a) => a.account_number === txn.from_account_number);
                        return (
                          <TableRow key={txn.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="text-sm text-gray-600">{formatDate(txn.created_at)}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-mono text-xs font-medium text-gray-900 dark:text-white">{txn.from_account_number || "N/A"}</p>
                                {txn.from_customer_name && <p className="text-xs text-gray-500">{txn.from_customer_name}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-mono text-xs font-medium text-gray-900 dark:text-white">{txn.to_account_number || "N/A"}</p>
                                {txn.to_customer_name && <p className="text-xs text-gray-500">{txn.to_customer_name}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`font-semibold text-sm ${isSent ? "text-red-600" : "text-green-600"}`}>
                                {isSent ? "-" : "+"}{formatCurrency(txn.amount)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-amber-600">{formatCurrency(txn.fee || 0)}</TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(txn.status)} border text-[10px]`} variant="outline">
                                {txn.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => {
                                  setViewTransfer(txn);
                                  setPinVerified(false);
                                  setViewPin("");
                                  setPinError("");
                                  setShowViewDialog(true);
                                }}
                              >
                                <FileText className="h-3 w-3" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No transfers found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Confirm Transfer</DialogTitle>
                  <p className="text-sm text-gray-500">Please review the details below</p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white text-center">
                <p className="text-sm font-medium text-blue-100">Transfer Amount</p>
                <p className="mt-1 text-3xl font-bold">{formatCurrency(transferAmount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">From</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold">{fromAccount}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">To</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold">{toAccountNumber}</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transfer Fee</span>
                  <span className="font-medium">{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Deduction</span>
                  <span className="font-bold">{formatCurrency(totalDeduction)}</span>
                </div>
              </div>
              {description && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                  <p className="text-xs font-medium text-blue-800">Description</p>
                  <p className="mt-1 text-sm text-blue-700">{description}</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="border-gray-200">
                Cancel
              </Button>
              <Button
                onClick={handleTransferSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Confirm Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
          <DialogContent className="sm:max-w-md border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">Transfer Successful</DialogTitle>
                  <p className="text-sm text-gray-500">Your transfer has been completed</p>
                </div>
              </div>
            </DialogHeader>
            {lastTransfer && (
              <div className="space-y-4">
                <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white text-center">
                  <CheckCircle className="mx-auto h-12 w-12 mb-2" />
                  <p className="text-sm font-medium text-green-100">Amount Transferred</p>
                  <p className="mt-1 text-3xl font-bold">{formatCurrency(lastTransfer.amount)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">From</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold">{lastTransfer.from}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">To</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold">{lastTransfer.to}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Fee</p>
                    <p className="mt-0.5 font-semibold">{formatCurrency(lastTransfer.fee)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Reference</p>
                    <p className="mt-0.5 font-mono text-xs font-semibold">{lastTransfer.reference}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Date & Time</p>
                  <p className="mt-0.5 font-semibold">{formatDate(lastTransfer.date)}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => setShowReceiptDialog(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Transfer Detail Dialog */}
        <Dialog open={showViewDialog} onOpenChange={(open) => {
          setShowViewDialog(open);
          if (!open) { setPinVerified(false); setViewPin(""); setPinError(""); }
        }}>
          <DialogContent className="sm:max-w-md border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg">
                    {pinVerified ? "Transfer Details" : "Enter PIN to View"}
                  </DialogTitle>
                  <p className="text-sm text-gray-500">{viewTransfer?.transaction_id}</p>
                </div>
              </div>
            </DialogHeader>

            {!pinVerified ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 p-5 text-white text-center">
                  <p className="text-sm font-medium text-white/80">Enter your 4-digit PIN</p>
                  <div className="mt-3 flex justify-center gap-3">
                    {[0,1,2,3].map((i) => (
                      <div key={i} className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${
                        viewPin.length > i ? "border-white bg-white/20 text-white" : "border-white/40 text-white/60"
                      }`}>
                        {viewPin.length > i ? "•" : ""}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#1A1918] dark:text-white">Transaction PIN</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      maxLength={4}
                      autoFocus
                      placeholder="4-digit PIN"
                      value={viewPin}
                      onChange={async (e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setViewPin(val);
                        setPinError("");
                        if (val.length === 4) {
                          try {
                            const res = await api.post("/transactions/verify-pin", { pin: val });
                            if (res.data.valid) {
                              setPinVerified(true);
                            } else {
                              setPinError(res.data.error || "PIN khaldan. Mar kale isku day.");
                              setViewPin("");
                            }
                          } catch (err: any) {
                            setPinError(err.response?.data?.error || "PIN khaldan. Mar kale isku day.");
                            setViewPin("");
                          }
                        }
                      }}
                      className="flex h-12 w-full rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 pl-10 pr-3 py-2 text-sm focus:bg-white dark:focus:bg-gray-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none"
                    />
                  </div>
                </div>
                {pinError && (
                  <p className="text-sm text-red-600 text-center flex items-center justify-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {pinError}
                  </p>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowViewDialog(false)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </div>
            ) : viewTransfer && (
              <div className="space-y-4">
                <div className={`rounded-xl p-5 text-white text-center ${
                  accounts.some((a) => a.account_number === viewTransfer.from_account_number)
                    ? "bg-gradient-to-br from-red-500 to-rose-600"
                    : "bg-gradient-to-br from-green-500 to-emerald-600"
                }`}>
                  <p className="text-sm font-medium text-white/80">
                    {accounts.some((a) => a.account_number === viewTransfer.from_account_number) ? "You Sent" : "You Received"}
                  </p>
                  <p className="mt-1 text-3xl font-bold">{formatCurrency(viewTransfer.amount)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">From</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold">{viewTransfer.from_account_number || "N/A"}</p>
                    {viewTransfer.from_customer_name && <p className="text-xs text-gray-500 mt-0.5">{viewTransfer.from_customer_name}</p>}
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">To</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold">{viewTransfer.to_account_number || "N/A"}</p>
                    {viewTransfer.to_customer_name && <p className="text-xs text-gray-500 mt-0.5">{viewTransfer.to_customer_name}</p>}
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Fee</p>
                    <p className="mt-0.5 font-semibold">{formatCurrency(viewTransfer.fee || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Status</p>
                    <Badge className={`${getStatusColor(viewTransfer.status)} border text-[10px] mt-0.5`} variant="outline">
                      {viewTransfer.status}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Description</p>
                  <p className="mt-0.5 font-semibold">{viewTransfer.description || "No description"}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Date & Time</p>
                  <p className="mt-0.5 font-semibold">{formatDate(viewTransfer.created_at)}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => setShowViewDialog(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white"
              >
                {pinVerified ? "Close" : "Cancel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
