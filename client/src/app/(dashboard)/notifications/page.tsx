"use client";

import { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Shield,
  Filter,
} from "lucide-react";

interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "security";
  read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgClass: string; label: string }> = {
  info: { icon: <Info className="h-5 w-5" />, color: "text-blue-600", bgClass: "from-blue-500 to-blue-600", label: "Info" },
  success: { icon: <CheckCircle className="h-5 w-5" />, color: "text-green-600", bgClass: "from-green-500 to-green-600", label: "Success" },
  warning: { icon: <AlertTriangle className="h-5 w-5" />, color: "text-amber-600", bgClass: "from-amber-500 to-orange-600", label: "Warning" },
  error: { icon: <AlertCircle className="h-5 w-5" />, color: "text-red-600", bgClass: "from-red-500 to-rose-600", label: "Error" },
  security: { icon: <Shield className="h-5 w-5" />, color: "text-purple-600", bgClass: "from-purple-500 to-violet-600", label: "Security" },
};

const BADGE_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 border-blue-200",
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  error: "bg-red-100 text-red-800 border-red-200",
  security: "bg-purple-100 text-purple-800 border-purple-200",
};

function NotificationsContent() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: Notification) => !n.read).length);
    } catch {
      error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    setActionLoading(id);
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      success("Notification marked as read");
    } catch {
      error("Failed to mark notification as read");
    } finally {
      setActionLoading(null);
    }
  };

  const markAllAsRead = async () => {
    setActionLoading("all");
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      success("All notifications marked as read");
    } catch {
      error("Failed to mark all notifications as read");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteNotification = async (id: number) => {
    setActionLoading(id);
    try {
      await api.delete(`/notifications/${id}`);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      success("Notification deleted");
    } catch {
      error("Failed to delete notification");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredNotifications = notifications.filter(
    (n) => filterType === "all" || n.type === filterType
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="shadow-md">
            <CardContent className="p-4">
              <div className="animate-pulse flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="h-3 w-24 rounded bg-gray-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs font-medium">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={actionLoading === "all"}
            className="border-gray-200"
          >
            {actionLoading === "all" ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {["all", "info", "success", "warning", "error", "security"].map((type) => (
          <Button
            key={type}
            variant={filterType === type ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(type)}
            className={filterType === type
              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
              : "border-gray-200"
            }
          >
            {type === "all" ? "All" : TYPE_CONFIG[type]?.label || type}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
              <BellOff className="h-10 w-10 text-blue-300" />
            </div>
            <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No notifications</p>
            <p className="mt-1 text-sm text-gray-500">
              {filterType !== "all" ? "No notifications of this type" : "You're all caught up!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const typeConfig = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
            return (
              <Card
                key={notification.id}
                className={`group shadow-md hover:shadow-lg transition-all duration-300 ${
                  !notification.read
                    ? "ring-2 ring-blue-100 bg-blue-50/30"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${typeConfig.bgClass} text-white shadow-md`}>
                      {typeConfig.icon}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm ${!notification.read ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-700"}`}>
                              {notification.title}
                            </h3>
                            <Badge className={`${BADGE_COLORS[notification.type] || BADGE_COLORS.info} border text-[10px] font-medium`}>
                              {typeConfig.label}
                            </Badge>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatDateTime(notification.created_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => markAsRead(notification.id)}
                              disabled={actionLoading === notification.id}
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => deleteNotification(notification.id)}
                            disabled={actionLoading === notification.id}
                            title="Delete"
                          >
                            {actionLoading === notification.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <NotificationsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
