"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  Shield,
  Search,
  Filter,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Activity,

  Clock,
} from "lucide-react";

interface AuditLog {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  module: string;
  details: string;
  ip_address: string;
  status: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 15;

export default function AuditLogsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get("/admin/audit-logs");
      setLogs(res.data?.data || []);
    } catch (err) {
      error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const modules = useMemo(() => {
    const unique = Array.from(new Set(logs.map((l) => l.module)));
    return unique.filter(Boolean);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchQuery === "" ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      const matchesModule = moduleFilter === "all" || log.module === moduleFilter;

      return matchesSearch && matchesStatus && matchesModule;
    });
  }, [logs, searchQuery, statusFilter, moduleFilter]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExport = () => {
    const headers = ["User", "Action", "Module", "Details", "IP", "Status", "Date"];
    const rows = filteredLogs.map((log) => [
      log.user_name || "Unknown",
      log.action,
      log.module,
      log.details || "-",
      log.ip_address || "-",
      log.status,
      formatDate(log.created_at),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    success("Audit logs exported successfully");
  };

  const logStats = {
    total: logs.length,
    success: logs.filter((l) => l.status === "success").length,
    failed: logs.filter((l) => l.status === "failed").length,
    today: logs.filter((l) => {
      const today = new Date().toISOString().split("T")[0];
      return l.created_at.startsWith(today);
    }).length,
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "ict_staff"]}>
        <DashboardLayout>
          <div className="space-y-6">
            <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 w-20 rounded bg-gray-200" />
                      <div className="h-8 w-16 rounded bg-gray-200" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "ict_staff"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918]">Audit Logs</h1>
              <p className="mt-1 text-gray-500">Monitor system activity and security events</p>
            </div>
            <Button variant="outline" onClick={handleExport} className="border-gray-200">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Logs", value: logStats.total, icon: <Activity className="h-5 w-5" />, color: "from-blue-500 to-indigo-600" },
              { label: "Successful", value: logStats.success, icon: <CheckCircle className="h-5 w-5" />, color: "from-emerald-500 to-green-600" },
              { label: "Failed", value: logStats.failed, icon: <XCircle className="h-5 w-5" />, color: "from-rose-500 to-red-600" },
              { label: "Today", value: logStats.today, icon: <Clock className="h-5 w-5" />, color: "from-amber-500 to-orange-600" },
            ].map((stat) => (
              <Card key={stat.label} className="relative overflow-hidden shadow-md">
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

          {/* Filters */}
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by action, module, user, or details..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-10 border-gray-200 bg-gray-50 focus:bg-white"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[160px] border-gray-200 bg-gray-50">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[160px] border-gray-200 bg-gray-50">
                    <SelectValue placeholder="Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {modules.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="shadow-md">
            <CardContent className="p-0">
              {paginatedLogs.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-100">
                        <TableHead className="font-semibold text-gray-700">User</TableHead>
                        <TableHead className="font-semibold text-gray-700">Action</TableHead>
                        <TableHead className="font-semibold text-gray-700">Module</TableHead>
                        <TableHead className="font-semibold text-gray-700 hidden lg:table-cell">Details</TableHead>
                        <TableHead className="font-semibold text-gray-700 hidden md:table-cell">IP</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Date</TableHead>
                        <TableHead className="font-semibold text-gray-700 w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <>
                          <TableRow key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                                  {log.user_name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{log.user_name || "Unknown"}</p>
                                  <p className="text-xs text-gray-500">{log.user_email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-gray-700">{log.action}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-gray-200 text-xs">{log.module}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-gray-500 hidden lg:table-cell">
                              {log.details || "-"}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-gray-500 hidden md:table-cell">{log.ip_address || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                className={`${log.status === "success" ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"} border text-xs font-medium gap-1`}
                              >
                                {log.status === "success" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">{formatDate(log.created_at)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setExpandedRow(expandedRow === String(log.id) ? null : String(log.id))}
                              >
                                {expandedRow === String(log.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedRow === String(log.id) && (
                            <TableRow key={`${log.id}-details`} className="bg-gray-50/50">
                              <TableCell colSpan={8} className="p-4">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">User</p>
                                    <p className="text-sm font-semibold text-gray-900">{log.user_name || "Unknown"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">Email</p>
                                    <p className="text-sm font-semibold text-gray-900">{log.user_email}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">IP Address</p>
                                    <p className="text-sm font-mono font-semibold text-gray-900">{log.ip_address || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">Timestamp</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatDate(log.created_at)}</p>
                                  </div>
                                </div>
                                {log.details && (
                                  <div className="mt-3">
                                    <p className="text-xs font-medium text-gray-500">Details</p>
                                    <p className="mt-1 text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">{log.details}</p>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                    <p className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} entries
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="border-gray-200"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="border-gray-200"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
                    <Shield className="h-10 w-10 text-blue-300" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-gray-900">No audit logs found</p>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
