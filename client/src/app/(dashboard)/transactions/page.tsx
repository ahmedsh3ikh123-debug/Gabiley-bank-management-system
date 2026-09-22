"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { API } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  saveTransactionOffline,
  getAllTransactionsOffline,
  addToPendingSync,
  getPendingSyncCount,
} from "@/lib/offline-db";
import { syncData } from "@/lib/sync-engine";
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Send,
  Loader2,
  Receipt,
  Search,
  CreditCard,
  UserCheck,
  WifiOff,
  RefreshCw,
  Shield,
} from "lucide-react";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
}

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
}

interface Transaction {
  id: number;
  transaction_id: string;
  type: string;
  amount: number;
  fee: number;
  description: string;
  status: string;
  created_at: string;
  from_account_number?: string;
  to_account_number?: string;
  balance_after?: number;
  processed_by?: string;
  from_customer_name?: string;
}

interface TransactionReceipt {
  id: string;
  type: string;
  amount: number;
  fee: number;
  date: string;
  account_number: string;
  balance_after: number;
  processed_by?: string;
  description?: string;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const isAdmin = (user?.role === "super_admin" || user?.role === "branch_manager" || user?.role === "manager");
  const isEmployee = (user?.role !== "customer");
  const isCustomer = user?.role === "customer";

  const [activeTab, setActiveTab] = useState("deposit");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [customerAccounts, setCustomerAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [customerPin, setCustomerPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [step, setStep] = useState(1);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");

  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transferToAccount, setTransferToAccount] = useState("");
  const [balanceInquiryResult, setBalanceInquiryResult] = useState<any>(null);

  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");

  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<TransactionReceipt | null>(null);

  const [myAccounts, setMyAccounts] = useState<Account[]>([]);
  const [selectedMyAccount, setSelectedMyAccount] = useState<string>("");

  const [pendingDeposits, setPendingDeposits] = useState<Transaction[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const { isOnline, setSyncing, setPendingItems } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get("/employee/users", {
        params: { role: "customer", search: searchQuery },
      });
      setCustomers(response.data?.users || response.data || []);
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, success, showError]);

  const fetchCustomerAccounts = useCallback(
    async (userId: string) => {
      try {
        setLoading(true);
        const response = await API.get(`/employee/users/${userId}/details`);
        setCustomerAccounts(response.data?.accounts || []);
      } catch (err: any) {
        showError(err.response?.data?.message || "Failed to fetch accounts");
      } finally {
        setLoading(false);
      }
    },
    [success, showError]
  );

  const fetchMyAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get("/accounts/my-accounts");
      setMyAccounts(response.data?.accounts || response.data || []);
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to fetch your accounts");
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const fetchTransactionHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);

      if (!isOnline) {
        const offlineTxns = await getAllTransactionsOffline();
        let filtered = offlineTxns as Transaction[];
        if (historyFilter !== "all") {
          filtered = filtered.filter((t: any) => t.type === historyFilter);
        }
        if (historySearch) {
          const lower = historySearch.toLowerCase();
          filtered = filtered.filter(
            (t: any) =>
              t.transaction_id?.toLowerCase().includes(lower) ||
              t.description?.toLowerCase().includes(lower)
          );
        }
        setTransactionHistory(filtered);
        return;
      }

      const params: any = {};
      if (historyFilter !== "all") {
        params.type = historyFilter;
      }
      if (historySearch) {
        params.search = historySearch;
      }
      const response = await API.get("/transactions", { params });
      setTransactionHistory(response.data?.transactions || response.data || []);
    } catch (err: any) {
      const offlineTxns = await getAllTransactionsOffline();
      setTransactionHistory(offlineTxns as Transaction[]);
    } finally {
      setHistoryLoading(false);
    }
  }, [isOnline, historyFilter, historySearch, success, showError]);

  const fetchPendingDeposits = useCallback(async () => {
    try {
      setPendingLoading(true);
      if (!isOnline) {
        const offlineTxns = await getAllTransactionsOffline();
        const pending = offlineTxns.filter(
          (t: any) => t.type === "deposit" && t.status === "pending"
        );
        setPendingDeposits(pending as Transaction[]);
        return;
      }
      const response = await API.get("/transactions", { params: { type: "deposit", status: "pending" } });
      setPendingDeposits(response.data?.transactions || response.data || []);
    } catch (err: any) {
      const offlineTxns = await getAllTransactionsOffline();
      const pending = offlineTxns.filter(
        (t: any) => t.type === "deposit" && t.status === "pending"
      );
      setPendingDeposits(pending as Transaction[]);
    } finally {
      setPendingLoading(false);
    }
  }, [isOnline, success, showError]);

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
    setPendingItems(count);
  }, [setPendingItems]);

  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      (async () => {
        if (isSyncing) return;
        try {
          setIsSyncing(true);
          setSyncing(true);
          await syncData();
          fetchTransactionHistory();
          fetchPendingDeposits();
          await updatePendingCount();
          success("Offline transactions synced successfully");
        } catch (err) {
          showError("Failed to sync offline transactions");
        } finally {
          setIsSyncing(false);
          setSyncing(false);
        }
      })();
    }
  }, [isOnline, pendingCount]);

  const handleApproveDeposit = async (transactionId: string) => {
    try {
      setLoading(true);
      await API.post("/transactions/deposit/approve", { transaction_id: transactionId });
      success("Deposit approved successfully");
      fetchPendingDeposits();
      fetchTransactionHistory();
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to approve deposit");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDeposit = async (transactionId: string) => {
    try {
      setLoading(true);
      await API.post("/transactions/deposit/reject", { transaction_id: transactionId });
      success("Deposit rejected");
      fetchPendingDeposits();
      fetchTransactionHistory();
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to reject deposit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin || isEmployee) {
      fetchCustomers();
      fetchPendingDeposits();
    } else {
      fetchMyAccounts();
    }
    fetchTransactionHistory();
  }, [isAdmin, isEmployee, fetchCustomers, fetchMyAccounts, fetchTransactionHistory, fetchPendingDeposits]);

  useEffect(() => {
    if (isAdmin || isEmployee) {
      fetchCustomers();
    }
  }, [searchQuery, isAdmin, isEmployee, fetchCustomers]);

  const handleSelectCustomer = async (customer: User) => {
    setSelectedCustomer(customer);
    setStep(2);
    setPinVerified(false);
    setCustomerPin("");
    setBalanceInquiryResult(null);
    await fetchCustomerAccounts(customer.id);
  };

  const handleSelectAccount = (accountNumber: string) => {
    setSelectedAccount(accountNumber);
    setStep(3);
    setPinVerified(false);
    setCustomerPin("");
    setBalanceInquiryResult(null);
  };

  const handleVerifyPin = async () => {
    if (!customerPin || customerPin.length < 4) {
      showError("Please enter a valid PIN (at least 4 digits)");
      return;
    }

    try {
      setLoading(true);
      const userId = isAdmin || isEmployee ? selectedCustomer?.id : user?.id;
      const res = await API.post("/transactions/verify-pin", {
        user_id: userId,
        pin: customerPin,
      });
      if (res.data.valid) {
        setPinVerified(true);
        setStep(4);
        setIsBlocked(false);
        setBlockMessage("");
        success("PIN verified successfully. You can now proceed.");
      } else {
        if (res.data.blocked) {
          setIsBlocked(true);
          setBlockMessage(res.data.error || "Account is blocked. Contact admin or ICT staff.");
        } else if (res.data.remainingAttempts !== undefined) {
          showError(`Invalid PIN. ${res.data.remainingAttempts} attempt(s) remaining before account is blocked.`);
        } else {
          showError(res.data.error || "Invalid PIN");
        }
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Invalid PIN");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedCustomer(null);
    setCustomerAccounts([]);
    setSelectedAccount("");
    setCustomerPin("");
    setPinVerified(false);
    setIsBlocked(false);
    setBlockMessage("");
    setTransactionAmount("");
    setTransactionDescription("");
    setTransferToAccount("");
    setBalanceInquiryResult(null);
  };

  const getAccountNumber = () => {
    if (isAdmin || isEmployee) {
      return selectedAccount;
    }
    return selectedMyAccount;
  };

  const handleDeposit = async () => {
    const accountNumber = getAccountNumber();
    if (!accountNumber || !transactionAmount) {
      showError("Please select an account and enter an amount");
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive amount");
      return;
    }

    try {
      setLoading(true);

      if (!isOnline) {
        const clientId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const offlineTxn = {
          id: Date.now(),
          transaction_id: clientId,
          to_account_number: accountNumber,
          type: "deposit" as const,
          amount,
          fee: 0,
          description: transactionDescription || "Deposit",
          status: "pending" as const,
          sync_status: "pending" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          processed_by: user?.full_name,
        } as any;

        await saveTransactionOffline(offlineTxn);
        await addToPendingSync("create", "transaction", clientId, {
          type: "deposit",
          account_number: accountNumber,
          amount,
          description: transactionDescription || "Deposit",
          pin: customerPin,
          client_id: clientId,
        });
        await updatePendingCount();

        const receipt: TransactionReceipt = {
          id: clientId,
          type: "Deposit",
          amount,
          fee: 0,
          date: new Date().toISOString(),
          account_number: accountNumber,
          balance_after: 0,
          processed_by: user?.full_name,
          description: transactionDescription || "Deposit",
        };

        setReceiptData(receipt);
        setShowReceipt(true);
        success(`Deposit saved offline. Will sync when online.`);
        resetFlow();
        fetchTransactionHistory();
        fetchPendingDeposits();
        if (isCustomer) fetchMyAccounts();
        return;
      }

      const response = await API.post("/transactions/deposit", {
        account_number: accountNumber,
        amount,
        description: transactionDescription || "Deposit",
        pin: customerPin,
      });

      const receipt: TransactionReceipt = {
        id: response.data?.transaction_id || "N/A",
        type: "Deposit",
        amount,
        fee: response.data?.receipt?.fee || 0,
        date: response.data?.receipt?.created_at || new Date().toISOString(),
        account_number: response.data?.receipt?.account_number || accountNumber,
        balance_after: response.data?.new_balance || 0,
        processed_by: response.data?.receipt?.processed_by ||
            (isAdmin || isEmployee ? `${user?.full_name}` : undefined),
        description: response.data?.receipt?.description || transactionDescription || "Deposit",
      };

      setReceiptData(receipt);
      setShowReceipt(true);

      if (response.data?.new_balance) {
        success(`Deposit of ${formatCurrency(amount)} completed successfully. New balance: ${formatCurrency(response.data.new_balance)}`);
      } else {
        success(`Deposit request submitted for ${formatCurrency(amount)}. Pending approval.`);
      }
      resetFlow();
      fetchTransactionHistory();
      fetchPendingDeposits();
      if (isCustomer) fetchMyAccounts();
      if (isAdmin || isEmployee) {
        fetchCustomerAccounts(selectedCustomer?.id || "");
      }
    } catch (err: any) {
      showError(err.response?.data?.error || err.response?.data?.message || "Failed to process deposit");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    const accountNumber = getAccountNumber();
    if (!accountNumber || !transactionAmount) {
      showError("Please select an account and enter an amount");
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive amount");
      return;
    }

    try {
      setLoading(true);

      if (!isOnline) {
        const clientId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const offlineTxn = {
          id: Date.now(),
          transaction_id: clientId,
          from_account_number: accountNumber,
          type: "withdrawal" as const,
          amount,
          fee: 0,
          description: transactionDescription || "Withdrawal",
          status: "completed" as const,
          sync_status: "pending" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          processed_by: user?.full_name,
        } as any;

        await saveTransactionOffline(offlineTxn);
        await addToPendingSync("create", "transaction", clientId, {
          type: "withdrawal",
          account_number: accountNumber,
          amount,
          description: transactionDescription || "Withdrawal",
          pin: customerPin,
          client_id: clientId,
        });
        await updatePendingCount();

        const receipt: TransactionReceipt = {
          id: clientId,
          type: "Withdrawal",
          amount,
          fee: 0,
          date: new Date().toISOString(),
          account_number: accountNumber,
          balance_after: 0,
          processed_by: user?.full_name,
          description: transactionDescription || "Withdrawal",
        };

        setReceiptData(receipt);
        setShowReceipt(true);
        success(`Withdrawal saved offline. Will sync when online.`);
        resetFlow();
        fetchTransactionHistory();
        if (isCustomer) fetchMyAccounts();
        return;
      }

      const response = await API.post("/transactions/withdraw", {
        account_number: accountNumber,
        amount,
        description: transactionDescription || "Withdrawal",
        pin: customerPin,
      });

      const receipt: TransactionReceipt = {
        id: response.data?.transaction_id || "N/A",
        type: "Withdrawal",
        amount,
        fee: response.data?.receipt?.fee || 0,
        date: response.data?.receipt?.created_at || new Date().toISOString(),
        account_number: response.data?.receipt?.account_number || accountNumber,
        balance_after: response.data?.new_balance || 0,
        processed_by: response.data?.receipt?.processed_by ||
            (isAdmin || isEmployee ? `${user?.full_name}` : undefined),
        description: response.data?.receipt?.description || transactionDescription || "Withdrawal",
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      success(`Successfully withdrew ${formatCurrency(amount)}`);
      resetFlow();
      fetchTransactionHistory();
      if (isCustomer) fetchMyAccounts();
      if (isAdmin || isEmployee) {
        fetchCustomerAccounts(selectedCustomer?.id || "");
      }
    } catch (err: any) {
      showError(err.response?.data?.error || err.response?.data?.message || "Failed to process withdrawal");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    const fromAccountNumber = getAccountNumber();
    if (!fromAccountNumber || !transferToAccount || !transactionAmount) {
      showError("Please fill in all required fields");
      return;
    }

    if (fromAccountNumber === transferToAccount) {
      showError("Cannot transfer to the same account");
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid positive amount");
      return;
    }

    try {
      setLoading(true);

      if (!isOnline) {
        const clientId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const offlineTxn = {
          id: Date.now(),
          transaction_id: clientId,
          from_account_number: fromAccountNumber,
          to_account_number: transferToAccount,
          type: "transfer" as const,
          amount,
          fee: 0,
          description: transactionDescription || "Transfer",
          status: "completed" as const,
          sync_status: "pending" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          processed_by: user?.full_name,
        } as any;

        await saveTransactionOffline(offlineTxn);
        await addToPendingSync("create", "transaction", clientId, {
          type: "transfer",
          from_account_number: fromAccountNumber,
          to_account_number: transferToAccount,
          amount,
          description: transactionDescription || "Transfer",
          pin: customerPin,
          client_id: clientId,
        });
        await updatePendingCount();

        const receipt: TransactionReceipt = {
          id: clientId,
          type: "Transfer",
          amount,
          fee: 0,
          date: new Date().toISOString(),
          account_number: fromAccountNumber,
          balance_after: 0,
          processed_by: user?.full_name,
          description: transactionDescription || "Transfer",
        };

        setReceiptData(receipt);
        setShowReceipt(true);
        success(`Transfer saved offline. Will sync when online.`);
        resetFlow();
        fetchTransactionHistory();
        if (isCustomer) fetchMyAccounts();
        return;
      }

      const response = await API.post("/transactions/transfer", {
        from_account_number: fromAccountNumber,
        to_account_number: transferToAccount,
        amount,
        description: transactionDescription || "Transfer",
        pin: customerPin,
      });

      const receipt: TransactionReceipt = {
        id: response.data?.transaction_id || "N/A",
        type: "Transfer",
        amount,
        fee: response.data?.receipt?.fee || response.data?.fee || 0,
        date: response.data?.receipt?.created_at || new Date().toISOString(),
        account_number: response.data?.receipt?.account_number || fromAccountNumber,
        balance_after: response.data?.new_balance || 0,
        processed_by: response.data?.receipt?.processed_by ||
            (isAdmin || isEmployee ? `${user?.full_name}` : undefined),
        description: response.data?.receipt?.description ||
          `Transfer to ${transferToAccount}${
            transactionDescription ? ` - ${transactionDescription}` : ""
          }`,
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      success(`Successfully transferred ${formatCurrency(amount)}`);
      resetFlow();
      fetchTransactionHistory();
      if (isCustomer) fetchMyAccounts();
      if (isAdmin || isEmployee) {
        fetchCustomerAccounts(selectedCustomer?.id || "");
      }
    } catch (err: any) {
      showError(err.response?.data?.error || err.response?.data?.message || "Failed to process transfer");
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceInquiry = async () => {
    const accountNumber = getAccountNumber();
    if (!accountNumber) {
      showError("Please select an account");
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/transactions/balance-inquiry", {
        account_number: accountNumber,
        pin: customerPin,
      });

      setBalanceInquiryResult(response.data);
      success("Account balance retrieved successfully");
    } catch (err: any) {
      showError(err.response?.data?.error || err.response?.data?.message || "Failed to retrieve balance");
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "deposit":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "withdrawal":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "transfer":
        return <Send className="h-4 w-4 text-blue-500" />;
      default: return <ArrowLeftRight className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderAdminEmployeeStep = () => {
    switch (step) {
      case 1: return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Step 1: Select Customer
              </CardTitle>
              <CardDescription>
                Search and select a customer to perform a transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Searching customers...
                    </p>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No customers found
                  </div>
                ) : (
                  <div className="divide-y">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full p-4 text-left hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {customer.first_name} {customer.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {customer.email}
                            </p>
                            {customer.phone && (
                              <p className="text-sm text-muted-foreground">
                                {customer.phone}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">{customer.role}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 2: return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Step 2: Select Account
              </CardTitle>
              <CardDescription>
                Select an account for{" "}
                <span className="font-semibold">
                  {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={() => setStep(1)} size="sm">
                ← Back to Customer Selection
              </Button>
              <div className="border rounded-lg">
                {loading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Loading accounts...
                    </p>
                  </div>
                ) : customerAccounts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No accounts found for this customer
                  </div>
                ) : (
                  <div className="divide-y">
                    {customerAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() =>
                          handleSelectAccount(account.account_number)
                        }
                        className="w-full p-4 text-left hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {account.account_number}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {account.account_type} Account
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency(account.balance, account.currency)}
                            </p>
                            <Badge
                              variant={
                                account.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {account.status}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 3: return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5" />
                Step 3: Enter Customer PIN
              </CardTitle>
              <CardDescription>
                Enter the customer&apos;s PIN to verify identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={() => setStep(2)} size="sm">
                ← Back to Account Selection
              </Button>
              <div className="space-y-2">
                <Label htmlFor="pin">Customer PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter 4-6 digit PIN"
                  value={customerPin}
                  onChange={(e) => setCustomerPin(e.target.value)}
                  maxLength={6}
                />
              </div>
              <Button
                onClick={handleVerifyPin}
                disabled={loading || !customerPin}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Verify PIN
              </Button>
            </CardContent>
          </Card>
        );

      case 4: return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Step 4: Select Transaction Type
              </CardTitle>
              <CardDescription>
                Account: <span className="font-semibold">{selectedAccount}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                size="sm"
                className="mb-4"
              >
                ← Back to PIN Entry
              </Button>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className={`grid w-full ${(isAdmin || isEmployee) ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  <TabsTrigger value="deposit" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Deposit
                  </TabsTrigger>
                  <TabsTrigger
                    value="withdrawal"
                    className="flex items-center gap-2"
                  >
                    <TrendingDown className="h-4 w-4" />
                    Withdrawal
                  </TabsTrigger>
                  <TabsTrigger value="transfer" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Transfer
                  </TabsTrigger>
                  <TabsTrigger
                    value="balance"
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Balance Inquiry
                  </TabsTrigger>
                  {(isAdmin || isEmployee) && (
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Pending ({pendingDeposits.length})
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="deposit" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Amount</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="0.00"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deposit-description">Description</Label>
                    <Textarea
                      id="deposit-description"
                      placeholder="Optional description"
                      value={transactionDescription}
                      onChange={(e) => setTransactionDescription(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleDeposit}
                    disabled={loading || !transactionAmount}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TrendingUp className="h-4 w-4 mr-2" />
                    )}
                    Process Deposit
                  </Button>
                </TabsContent>

                <TabsContent value="withdrawal" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Amount</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="0.00"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-description">Description</Label>
                    <Textarea
                      id="withdraw-description"
                      placeholder="Optional description"
                      value={transactionDescription}
                      onChange={(e) => setTransactionDescription(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleWithdrawal}
                    disabled={loading || !transactionAmount}
                    className="w-full"
                    variant="destructive"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-2" />
                    )}
                    Process Withdrawal
                  </Button>
                </TabsContent>

                <TabsContent value="transfer" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-to">To Account Number</Label>
                    <Input
                      id="transfer-to"
                      placeholder="Enter destination account number"
                      value={transferToAccount}
                      onChange={(e) => setTransferToAccount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-amount">Amount</Label>
                    <Input
                      id="transfer-amount"
                      type="number"
                      placeholder="0.00"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-description">Description</Label>
                    <Textarea
                      id="transfer-description"
                      placeholder="Optional description"
                      value={transactionDescription}
                      onChange={(e) => setTransactionDescription(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleTransfer}
                    disabled={loading || !transactionAmount || !transferToAccount}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Process Transfer
                  </Button>
                </TabsContent>

                <TabsContent value="balance" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Click the button below to check the account balance.
                  </p>
                  <Button
                    onClick={handleBalanceInquiry}
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Check Balance
                  </Button>
                  {balanceInquiryResult && (
                    <div className="border rounded-lg p-4 space-y-2 bg-accent/50">
                      <h4 className="font-semibold">Account Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Account:</span>
                          <p className="font-medium">
                            {balanceInquiryResult.account_number ||
                              selectedAccount}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Balance:</span>
                          <p className="font-semibold text-lg">
                            {formatCurrency(
                              balanceInquiryResult.balance || 0,
                              balanceInquiryResult.currency
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <Badge
                            variant={
                              balanceInquiryResult.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {balanceInquiryResult.status || "Active"}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Last Transaction: </span>
                          <p className="font-medium">
                            {balanceInquiryResult.last_transaction?.created_at
                              ? formatDate(
                                  balanceInquiryResult.last_transaction.created_at
                                )
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {(isAdmin || isEmployee) && (
                  <TabsContent value="pending" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Pending Deposit Approvals</Label>
                      <p className="text-sm text-muted-foreground">
                        Review and approve or reject customer deposit requests
                      </p>
                    </div>
                    {pendingLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="mt-2 text-sm text-muted-foreground">Loading pending deposits...</p>
                      </div>
                    ) : pendingDeposits.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border rounded-lg">
                        No pending deposits to approve
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingDeposits.map((txn) => (
                          <div key={txn.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">{formatCurrency(txn.amount)}</p>
                                {txn.from_customer_name && (
                                  <p className="text-sm font-medium text-muted-foreground">
                                    Customer: {txn.from_customer_name}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  Account: {txn.to_account_number}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {txn.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(txn.created_at)}
                                </p>
                              </div>
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                Pending
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveDeposit(txn.transaction_id)}
                                disabled={loading}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                {loading ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <UserCheck className="h-4 w-4 mr-2" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectDeposit(txn.transaction_id)}
                                disabled={loading}
                                className="flex-1"
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        );

      default: return null;
    }
  };

  const renderCustomerView = () => {
    const currentAccount = myAccounts.find(
      (a) => a.account_number === selectedMyAccount
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            New Transaction
          </CardTitle>
          <CardDescription>Perform transactions on your accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Account</Label>
            <Select
              value={selectedMyAccount}
              onValueChange={(value) => {
                setSelectedMyAccount(value);
                setPinVerified(false);
                setCustomerPin("");
                setBalanceInquiryResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {myAccounts.map((account) => (
                  <SelectItem
                    key={account.account_number}
                    value={account.account_number}
                  >
                    {account.account_number} - {account.account_type} (
                    {formatCurrency(account.balance, account.currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMyAccount && (
            <>
              <div className="space-y-2">
                <Label htmlFor="customer-pin">Enter your PIN</Label>
                <div className="flex gap-2">
                  <Input
                    id="customer-pin"
                    type="password"
                    placeholder="Enter your PIN"
                    value={customerPin}
                    onChange={(e) => setCustomerPin(e.target.value)}
                    maxLength={6}
                    className="flex-1"
                    disabled={isBlocked}
                  />
                  <Button
                    onClick={handleVerifyPin}
                    disabled={loading || !customerPin || isBlocked}
                    variant="outline"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </div>
              </div>

              {isBlocked && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-medium text-red-800">{blockMessage}</p>
                  </div>
                  <p className="text-xs text-red-600 mt-2">Please contact admin or ICT staff to unblock your account.</p>
                </div>
              )}

              {pinVerified && (
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger
                      value="deposit"
                      className="flex items-center gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Deposit
                    </TabsTrigger>
                    <TabsTrigger
                      value="withdrawal"
                      className="flex items-center gap-2"
                    >
                      <TrendingDown className="h-4 w-4" />
                      Withdrawal
                    </TabsTrigger>
                    <TabsTrigger
                      value="transfer"
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Transfer
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="deposit" className="space-y-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      Deposit requests require admin/employee approval before funds are added to your account.
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-deposit-amount">Amount</Label>
                      <Input
                        id="cust-deposit-amount"
                        type="number"
                        placeholder="0.00"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-deposit-desc">Description</Label>
                      <Textarea
                        id="cust-deposit-desc"
                        placeholder="Optional description"
                        value={transactionDescription}
                        onChange={(e) =>
                          setTransactionDescription(e.target.value)
                        }
                      />
                    </div>
                    <Button
                      onClick={handleDeposit}
                      disabled={loading || !transactionAmount}
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-2" />
                      )}
                      Request Deposit
                    </Button>
                  </TabsContent>

                  <TabsContent value="withdrawal" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="cust-withdraw-amount">Amount</Label>
                      <Input
                        id="cust-withdraw-amount"
                        type="number"
                        placeholder="0.00"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-withdraw-desc">Description</Label>
                      <Textarea
                        id="cust-withdraw-desc"
                        placeholder="Optional description"
                        value={transactionDescription}
                        onChange={(e) =>
                          setTransactionDescription(e.target.value)
                        }
                      />
                    </div>
                    <Button
                      onClick={handleWithdrawal}
                      disabled={loading || !transactionAmount}
                      className="w-full"
                      variant="destructive"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-2" />
                      )}
                      Withdraw
                    </Button>
                  </TabsContent>

                  <TabsContent value="transfer" className="space-y-4 mt-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      Current account: <strong>{selectedMyAccount}</strong>
                      {currentAccount && (
                        <span>
                          {" "}
                          - Balance:{" "}
                          {formatCurrency(
                            currentAccount.balance,
                            currentAccount.currency
                          )}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-transfer-to">
                        To Account Number
                      </Label>
                      <Input
                        id="cust-transfer-to"
                        placeholder="Enter destination account number"
                        value={transferToAccount}
                        onChange={(e) => setTransferToAccount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-transfer-amount">Amount</Label>
                      <Input
                        id="cust-transfer-amount"
                        type="number"
                        placeholder="0.00"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cust-transfer-desc">Description</Label>
                      <Textarea
                        id="cust-transfer-desc"
                        placeholder="Optional description"
                        value={transactionDescription}
                        onChange={(e) =>
                          setTransactionDescription(e.target.value)
                        }
                      />
                    </div>
                    <Button
                      onClick={handleTransfer}
                      disabled={
                        loading || !transactionAmount || !transferToAccount
                      }
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Transfer
                    </Button>
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">
                Transactions
              </h1>
              <p className="text-muted-foreground">
                {isAdmin || isEmployee
                  ? "Process transactions for customers"
                  : "Manage your account transactions"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isOnline && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <WifiOff className="mr-1 h-3 w-3" />
                  Offline Mode
                </Badge>
              )}
              {isSyncing && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  Syncing...
                </Badge>
              )}
              {!isOnline && pendingCount > 0 && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  {pendingCount} pending
                </Badge>
              )}
              {(isAdmin || isEmployee) && step > 1 && (
                <Button variant="outline" onClick={resetFlow}>
                  Start New Transaction
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              {isAdmin || isEmployee
                ? renderAdminEmployeeStep()
                : renderCustomerView()}
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5" />
                    Transaction History
                  </CardTitle>
                  <CardDescription>
                    Recent transactions across all accounts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select
                      value={historyFilter}
                      onValueChange={setHistoryFilter}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="deposit">Deposits</SelectItem>
                        <SelectItem value="withdrawal">Withdrawals</SelectItem>
                        <SelectItem value="transfer">Transfers</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transactions..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                    {historyLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Loading transactions...
                        </p>
                      </div>
                    ) : transactionHistory.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No transactions found
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactionHistory.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getTransactionIcon(
                                    transaction.type
                                  )}
                                  <span className="capitalize">
                                    {transaction.type}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={
                                    transaction.type === "deposit"
                                      ? "text-green-600"
                                      : transaction.type ===
                                        "withdrawal"
                                      ? "text-red-600"
                                      : ""
                                  }
                                >
                                  {transaction.type === "deposit"
                                    ? "+"
                                    : transaction.type ===
                                      "withdrawal"
                                    ? "-"
                                    : ""}
                                  {formatCurrency(transaction.amount)}
                                </span>
                                {transaction.fee > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (Fee: {formatCurrency(transaction.fee)})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getStatusColor(
                                    transaction.status
                                  )}
                                >
                                  {transaction.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(transaction.created_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Transaction Receipt
              </DialogTitle>
            </DialogHeader>
            {receiptData && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3 bg-accent/30">
                  <div className="text-center pb-3 border-b">
                    <p className="text-sm text-muted-foreground">
                      Transaction ID
                    </p>
                    <p className="font-mono font-semibold">{receiptData.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{receiptData.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(receiptData.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fee</p>
                      <p className="font-medium">
                        {receiptData.fee > 0
                          ? formatCurrency(receiptData.fee)
                          : "None"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date & Time</p>
                      <p className="font-medium">
                        {formatDate(receiptData.date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Account Number</p>
                      <p className="font-medium font-mono">
                        {receiptData.account_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">New Balance</p>
                      <p className="font-semibold">
                        {formatCurrency(receiptData.balance_after)}
                      </p>
                    </div>
                  </div>

                  {receiptData.processed_by && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Processed by
                      </p>
                      <p className="font-medium">{receiptData.processed_by}</p>
                    </div>
                  )}

                  {receiptData.description && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Description
                      </p>
                      <p className="font-medium">{receiptData.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowReceipt(false)} className="w-full">
                Close Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
