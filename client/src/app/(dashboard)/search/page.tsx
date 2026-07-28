"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { formatDate, formatCurrency, getStatusColor, getRoleLabel } from "@/lib/utils";
import type { User } from "@/types";
import {
  Search as SearchIcon,
  Users,
  UserCheck,
  CreditCard,
  ArrowRight,
  Loader2,
  X,
  Hash,
  Phone,
  Mail,
} from "lucide-react";

interface Account {
  id: number;
  user_id: number;
  account_number: string;
  account_type: string;
  balance: number;
  status: string;
  frozen: number;
  created_at: string;
  full_name?: string;
}

interface Employee {
  id: number;
  user_id: number;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: string;
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "customer_service", "teller", "accountant", "ict_staff"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    }>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get("q") || "");

  const [customers, setCustomers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const isAdmin = user?.role === "super_admin" || user?.role === "branch_manager";

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setCustomers([]);
      setEmployees([]);
      setAccounts([]);
      return;
    }

    try {
      setLoading(true);
      const searchPromises: Promise<any>[] = [];

      // Search customers (all roles use this)
      searchPromises.push(
        api.get("/admin/users", { params: { search: debouncedQuery, role: "customer" } })
          .then((res) => setCustomers(res.data))
          .catch(() => setCustomers([]))
      );

      // Search employees (admin only)
      if (isAdmin) {
        searchPromises.push(
          api.get("/admin/employees", { params: { search: debouncedQuery } })
            .then((res) => setEmployees(res.data))
            .catch(() => setEmployees([]))
        );

        // Search accounts (admin only)
        searchPromises.push(
          api.get("/accounts/all")
            .then((res) => {
              const filtered = res.data.filter((acc: Account) =>
                acc.account_number.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
                (acc.full_name && acc.full_name.toLowerCase().includes(debouncedQuery.toLowerCase()))
              );
              setAccounts(filtered);
            })
            .catch(() => setAccounts([]))
        );
      }

      await Promise.all(searchPromises);
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, isAdmin, toast]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery) {
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
    }
  }, [searchParams]);

  const updateUrl = (newQuery: string) => {
    const params = new URLSearchParams(window.location.search);
    if (newQuery) {
      params.set("q", newQuery);
    } else {
      params.delete("q");
    }
    router.replace(`/search?${params.toString()}`);
  };

  const totalResults = customers.length + employees.length + accounts.length;

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500",
      "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
  };

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "customer_service", "teller", "accountant", "ict_staff"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] flex items-center gap-2">
              <SearchIcon className="h-8 w-8 text-[#1F8A4D]" />
              Search
            </h1>
            <p className="text-muted-foreground mt-1">
              Search across customers, employees, and accounts
            </p>
          </div>

          {/* Search Input */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, account number..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    updateUrl(e.target.value);
                  }}
                  className="pl-9 pr-10 h-11 text-base"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      updateUrl("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Results */}
          {!loading && debouncedQuery && (
            <>
              <p className="text-sm text-muted-foreground">
                Found {totalResults} result{totalResults !== 1 ? "s" : ""} for &ldquo;{debouncedQuery}&rdquo;
              </p>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={isAdmin ? "grid w-full grid-cols-3 h-10" : "grid w-full grid-cols-1 h-10"}>
                  <TabsTrigger value="all" className="gap-1">
                    All
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {totalResults}
                    </Badge>
                  </TabsTrigger>
                  {isAdmin && (
                    <>
                      <TabsTrigger value="employees" className="gap-1">
                        Employees
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                          {employees.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="accounts" className="gap-1">
                        Accounts
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                          {accounts.length}
                        </Badge>
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                {/* All Results */}
                <TabsContent value="all" className="space-y-4">
                  {/* Customers */}
                  {customers.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Customers ({customers.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Customer</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Joined</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customers.slice(0, 5).map((c) => (
                              <TableRow key={c.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className={`h-9 w-9 rounded-full ${getAvatarColor(c.full_name)} flex items-center justify-center text-white text-xs font-bold`}>
                                      {getInitials(c.full_name)}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{c.full_name}</p>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {c.email}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    {c.phone || "N/A"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${getStatusColor(c.status)} font-medium`}>
                                    {c.status === "frozen" ? "Suspended" : c.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {formatDate(c.created_at)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <button
                                    onClick={() => router.push("/customers")}
                                    className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 ml-auto"
                                  >
                                    View <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {customers.length > 5 && (
                          <div className="px-4 py-3 border-t">
                            <button
                              onClick={() => router.push("/customers")}
                              className="text-sm text-primary hover:underline"
                            >
                              View all {customers.length} customers
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Employees */}
                  {isAdmin && employees.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Employees ({employees.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Employee</TableHead>
                              <TableHead>Employee ID</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employees.slice(0, 5).map((e) => (
                              <TableRow key={e.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className={`h-9 w-9 rounded-full ${getAvatarColor(e.full_name)} flex items-center justify-center text-white text-xs font-bold`}>
                                      {getInitials(e.full_name)}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{e.full_name}</p>
                                      <p className="text-xs text-muted-foreground">{e.email}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm font-mono flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                    {e.employee_id}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{e.department}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${getStatusColor(e.status)} font-medium`}>
                                    {e.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <button
                                    onClick={() => router.push("/employees")}
                                    className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 ml-auto"
                                  >
                                    View <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {employees.length > 5 && (
                          <div className="px-4 py-3 border-t">
                            <button
                              onClick={() => router.push("/employees")}
                              className="text-sm text-primary hover:underline"
                            >
                              View all {employees.length} employees
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Accounts */}
                  {isAdmin && accounts.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Accounts ({accounts.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Account Number</TableHead>
                              <TableHead>Account Holder</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accounts.slice(0, 5).map((a) => (
                              <TableRow key={a.id}>
                                <TableCell>
                                  <span className="text-sm font-mono font-medium">{a.account_number}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{a.full_name || "N/A"}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm capitalize">{a.account_type.replace("_", " ")}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm font-medium">{formatCurrency(a.balance)}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${getStatusColor(a.frozen ? "frozen" : a.status)} font-medium`}>
                                    {a.frozen ? "Frozen" : a.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <button
                                    onClick={() => router.push("/accounts")}
                                    className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 ml-auto"
                                  >
                                    View <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {accounts.length > 5 && (
                          <div className="px-4 py-3 border-t">
                            <button
                              onClick={() => router.push("/accounts")}
                              className="text-sm text-primary hover:underline"
                            >
                              View all {accounts.length} accounts
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* No results */}
                  {totalResults === 0 && (
                    <Card>
                      <CardContent className="py-16">
                        <div className="flex flex-col items-center">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <SearchIcon className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <p className="text-muted-foreground font-medium mb-1">No results found</p>
                          <p className="text-sm text-muted-foreground/70">
                            Try adjusting your search terms
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Employees Tab */}
                {isAdmin && (
                  <TabsContent value="employees">
                    <Card>
                      <CardContent className="p-0">
                        {employees.length === 0 ? (
                          <div className="py-16 text-center">
                            <p className="text-muted-foreground">No employees found</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Employee</TableHead>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {employees.map((e) => (
                                <TableRow key={e.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className={`h-9 w-9 rounded-full ${getAvatarColor(e.full_name)} flex items-center justify-center text-white text-xs font-bold`}>
                                        {getInitials(e.full_name)}
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{e.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{e.email}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm font-mono">{e.employee_id}</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{e.department}</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{e.position}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={`${getStatusColor(e.status)} font-medium`}>
                                      {e.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <button
                                      onClick={() => router.push("/employees")}
                                      className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 ml-auto"
                                    >
                                      View <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Accounts Tab */}
                {isAdmin && (
                  <TabsContent value="accounts">
                    <Card>
                      <CardContent className="p-0">
                        {accounts.length === 0 ? (
                          <div className="py-16 text-center">
                            <p className="text-muted-foreground">No accounts found</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Account Number</TableHead>
                                <TableHead>Account Holder</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {accounts.map((a) => (
                                <TableRow key={a.id}>
                                  <TableCell>
                                    <span className="text-sm font-mono font-medium">{a.account_number}</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{a.full_name || "N/A"}</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm capitalize">{a.account_type.replace("_", " ")}</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm font-medium">{formatCurrency(a.balance)}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={`${getStatusColor(a.frozen ? "frozen" : a.status)} font-medium`}>
                                      {a.frozen ? "Frozen" : a.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <button
                                      onClick={() => router.push("/accounts")}
                                      className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 ml-auto"
                                    >
                                      View <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}

          {/* Empty State - No Query */}
          {!loading && !debouncedQuery && (
            <Card>
              <CardContent className="py-16">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <SearchIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-1">Start typing to search</p>
                  <p className="text-sm text-muted-foreground/70">
                    Search across customers, employees, and accounts
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
