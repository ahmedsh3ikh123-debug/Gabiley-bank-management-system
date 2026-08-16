"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  Megaphone,
  Plus,
  AlertTriangle,
  Info,
  CheckCircle,
  Loader2,
  Pencil,
  Trash2,
  Users,
  User,
  Bell,
  Calendar,
} from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "important" | "urgent";
  target_role: string;
  created_by: number;
  status: string;
  created_at: string;
  creator_name?: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgClass: string; icon: React.ReactNode }> = {
  low: { label: "Low", color: "bg-gray-100 text-gray-800 border-gray-200", bgClass: "from-gray-400 to-gray-500", icon: <Info className="h-4 w-4" /> },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-800 border-blue-200", bgClass: "from-blue-500 to-blue-600", icon: <Info className="h-4 w-4" /> },
  important: { label: "Important", color: "bg-amber-100 text-amber-800 border-amber-200", bgClass: "from-amber-500 to-orange-600", icon: <AlertTriangle className="h-4 w-4" /> },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-800 border-red-200", bgClass: "from-red-500 to-rose-600", icon: <AlertTriangle className="h-4 w-4" /> },
};

const TARGET_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  all: { label: "All Users", icon: <Users className="h-3.5 w-3.5" /> },
  customer: { label: "Customers", icon: <User className="h-3.5 w-3.5" /> },
  teller: { label: "Tellers", icon: <User className="h-3.5 w-3.5" /> },
  accountant: { label: "Accountants", icon: <User className="h-3.5 w-3.5" /> },
};

export default function AnnouncementsPage() {
  const { user, isAdmin } = useAuth();
  const { success, error: showError } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    priority: "normal",
    target_role: "all",
  });
  const [saving, setSaving] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const endpoint = isAdmin ? "/admin/announcements" : "/announcements";
      const res = await api.get(endpoint);
      setAnnouncements(res.data);
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.message) {
      showError("Title and message are required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/announcements/${editingId}`, form);
        success("Announcement updated");
      } else {
        await api.post("/admin/announcements", form);
        success("Announcement created");
      }
      setDialogOpen(false);
      setForm({ title: "", message: "", priority: "normal", target_role: "all" });
      setEditingId(null);
      fetchAnnouncements();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.delete(`/admin/announcements/${id}`);
      success("Announcement deleted");
      fetchAnnouncements();
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to delete");
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      target_role: announcement.target_role,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ title: "", message: "", priority: "normal", target_role: "all" });
    setDialogOpen(true);
  };

  const filteredAnnouncements = announcements.filter(
    (a) => filterPriority === "all" || a.priority === filterPriority
  );

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager"]}>
        <DashboardLayout>
          <div className="space-y-6">
            <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="shadow-md">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gray-200" />
                      <div className="space-y-2">
                        <div className="h-4 w-48 rounded bg-gray-200" />
                        <div className="h-3 w-32 rounded bg-gray-200" />
                      </div>
                    </div>
                    <div className="h-16 rounded bg-gray-100" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager"]}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">Announcements</h1>
              <p className="mt-1 text-gray-500">
                {isAdmin ? "Manage system announcements" : "View latest announcements"}
              </p>
            </div>
            {isAdmin && (
              <Button
                onClick={openCreateDialog}
                className="bg-gradient-to-r from-[#1F8A4D] to-[#176B3D] text-white shadow-lg shadow-[#1F8A4D]/20 hover:from-[#1F8A4D]/90 hover:to-[#176B3D]/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            )}
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {["all", "urgent", "important", "normal", "low"].map((p) => (
              <Button
                key={p}
                variant={filterPriority === p ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterPriority(p)}
                className={filterPriority === p
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                  : "border-gray-200"
                }
              >
                {p === "all" ? "All" : PRIORITY_CONFIG[p]?.label || p}
              </Button>
            ))}
          </div>

          {/* Announcements */}
          {filteredAnnouncements.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
                  <Megaphone className="h-10 w-10 text-blue-300" />
                </div>
                <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No announcements</p>
                <p className="mt-1 text-sm text-gray-500">
                  {isAdmin ? "Create your first announcement" : "No announcements yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredAnnouncements.map((a) => {
                const priorityConfig = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.normal;
                const targetInfo = TARGET_LABELS[a.target_role] || TARGET_LABELS.all;

                return (
                  <Card key={a.id} className="group shadow-md hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${priorityConfig.bgClass} text-white shadow-md`}>
                            {priorityConfig.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{a.title}</h3>
                              <Badge className={`${priorityConfig.color} border text-xs font-medium`}>
                                {priorityConfig.label}
                              </Badge>
                              <Badge variant="outline" className="border-gray-200 text-xs font-medium gap-1">
                                {targetInfo.icon}
                                {targetInfo.label}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {formatDate(a.created_at)}
                              {a.creator_name && (
                                <>
                                  <span className="h-1 w-1 rounded-full bg-gray-300" />
                                  by {a.creator_name}
                                </>
                              )}
                            </div>
                            <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                              {a.message}
                            </p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => handleEdit(a)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDelete(a.id)}
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg border-0 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-lg">
                    {editingId ? "Edit Announcement" : "New Announcement"}
                  </DialogTitle>
                  <p className="text-sm text-gray-500">
                    {editingId ? "Update announcement details" : "Create a new announcement"}
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Announcement title"
                  className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Message</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Write your announcement message here..."
                  rows={5}
                  className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Target Audience</Label>
                  <Select
                    value={form.target_role}
                    onValueChange={(v) => setForm({ ...form, target_role: v })}
                  >
                    <SelectTrigger className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="teller">Tellers</SelectItem>
                      <SelectItem value="accountant">Accountants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-200">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
