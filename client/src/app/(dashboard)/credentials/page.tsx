"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import {
  KeyRound,
  Search,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  User,
  Mail,
  Phone,
  Lock,
  Copy,
  CheckCircle,
  AlertCircle,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";

interface UserCredential {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  password_plain: string;
  pin_plain: string;
  role: string;
  status: string;
  profile_picture: string;
  created_at: string;
  _viewed?: boolean;
}

const ITEMS_PER_PAGE = 10;

export default function CredentialsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<UserCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCredential | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [viewedUsers, setViewedUsers] = useState<Set<number>>(new Set());
  const [showSetCredentialsDialog, setShowSetCredentialsDialog] = useState(false);
  const [setCredentialsUser, setSetCredentialsUser] = useState<UserCredential | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [settingCredentials, setSettingCredentials] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/ict/credentials", { params });
      setUsers(res.data);
    } catch {
      toast.error("Failed to fetch credentials");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const togglePasswordVisibility = (userId: number) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const openCredentialsDialog = (userCredential: UserCredential) => {
    setSelectedUser(userCredential);
    setShowCredentialsDialog(true);
    setViewedUsers((prev) => new Set(prev).add(userCredential.id));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const openSetCredentialsDialog = (userCredential: UserCredential) => {
    setSetCredentialsUser(userCredential);
    setNewPassword("");
    setNewPin("");
    setShowSetCredentialsDialog(true);
  };

  const handleSetCredentials = async () => {
    if (!setCredentialsUser) return;
    if (!newPassword.trim() && !newPin.trim()) {
      toast.error("Password or PIN is required");
      return;
    }
    setSettingCredentials(true);
    try {
      const endpoint = user?.role === "ict_staff"
        ? `/ict/users/${setCredentialsUser.id}/credentials`
        : `/admin/users/${setCredentialsUser.id}/credentials`;
      await api.put(endpoint, { password: newPassword, pin: newPin });
      toast.success("Credentials updated successfully");
      setShowSetCredentialsDialog(false);
      fetchUsers();
    } catch {
      toast.error("Failed to update credentials");
    } finally {
      setSettingCredentials(false);
    }
  };

  const filteredUsers = users;

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager", "ict_staff"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager", "ict_staff"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white flex items-center gap-2">
                <KeyRound className="h-8 w-8 text-[#1F8A4D]" />
                Customer Credentials
              </h1>
              <p className="text-muted-foreground mt-1">
                View and manage customer credentials (username, password, PIN)
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, username, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="blocked">Blocked</option>
                  <option value="frozen">Suspended</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Username</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Joined</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <KeyRound className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <p className="text-muted-foreground font-medium mb-1">No customers found</p>
                          <p className="text-sm text-muted-foreground/70">
                            {debouncedSearch || statusFilter !== "all"
                              ? "Try adjusting your search or filters"
                              : "No customer credentials available"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((userCredential) => (
                      <TableRow
                        key={userCredential.id}
                        className={`group cursor-pointer ${viewedUsers.has(userCredential.id) ? "bg-muted/30" : ""}`}
                        onClick={() => openCredentialsDialog(userCredential)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F8A4D]/10 text-[#1F8A4D] font-semibold text-sm">
                              {userCredential.profile_picture ? (
                                <img
                                  src={userCredential.profile_picture}
                                  alt={userCredential.full_name}
                                  className="h-10 w-10 rounded-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                userCredential.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??"
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{userCredential.full_name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {userCredential.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-muted-foreground">
                            {userCredential.username}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(userCredential.status)} font-medium`}>
                            {userCredential.status === "frozen" ? "Suspended" : userCredential.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(userCredential.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => openCredentialsDialog(userCredential)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => {
                                openCredentialsDialog(userCredential);
                                setTimeout(() => {
                                  toast.success("Opening message composer...");
                                }, 100);
                              }}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
                    {filteredUsers.length} customers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Credentials Dialog */}
        <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                Customer Credentials
              </DialogTitle>
              <DialogDescription>
                Viewing credentials for {selectedUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F8A4D]/10 text-[#1F8A4D] font-bold text-lg">
                    {selectedUser.profile_picture ? (
                      <img
                        src={selectedUser.profile_picture}
                        alt={selectedUser.full_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      selectedUser.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??"
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedUser.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Username</p>
                      <p className="text-sm font-mono font-medium">{selectedUser.username}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(selectedUser.username, "Username")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Password</p>
                      <p className="text-sm font-mono font-medium">
                        {visiblePasswords.has(selectedUser.id)
                          ? (selectedUser.password_plain && selectedUser.password_plain.trim() ? selectedUser.password_plain : "Not set in database")
                          : "••••••••"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => togglePasswordVisibility(selectedUser.id)}
                      >
                        {visiblePasswords.has(selectedUser.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!selectedUser.password_plain || !selectedUser.password_plain.trim()}
                        onClick={() => copyToClipboard(selectedUser.password_plain || "", "Password")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">PIN</p>
                      <p className="text-sm font-mono font-medium">
                        {visiblePasswords.has(selectedUser.id + 1000)
                          ? (selectedUser.pin_plain && selectedUser.pin_plain.trim() ? selectedUser.pin_plain : "Not set in database")
                          : "••••"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => togglePasswordVisibility(selectedUser.id + 1000)}
                      >
                        {visiblePasswords.has(selectedUser.id + 1000) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!selectedUser.pin_plain || !selectedUser.pin_plain.trim()}
                        onClick={() => copyToClipboard(selectedUser.pin_plain || "", "PIN")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This action has been logged for security purposes. All credential views are audited.
                  </p>
                </div>

                {(!selectedUser.password_plain || !selectedUser.password_plain.trim() || !selectedUser.pin_plain || !selectedUser.pin_plain.trim()) && (
                  <Button
                    onClick={() => { setShowCredentialsDialog(false); openSetCredentialsDialog(selectedUser); }}
                    className="w-full gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    Set Credentials
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Set Credentials Dialog */}
        <Dialog open={showSetCredentialsDialog} onOpenChange={setShowSetCredentialsDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                Set Credentials
              </DialogTitle>
              <DialogDescription>
                Set new password and PIN for {setCredentialsUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password</Label>
                <Input
                  id="newPassword"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPin">PIN</Label>
                <Input
                  id="newPin"
                  type="text"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Enter new PIN (4-6 digits)"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowSetCredentialsDialog(false)}>Cancel</Button>
              <Button onClick={handleSetCredentials} disabled={settingCredentials}>
                {settingCredentials && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Credentials
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
