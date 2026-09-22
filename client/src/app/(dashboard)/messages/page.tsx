"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Message } from "@/types";
import {
  Mail,
  MailOpen,
  Loader2,
  Trash2,
  Eye,
  KeyRound,
  Shield,
  MessageSquare,
  CheckCircle,
} from "lucide-react";

export default function MessagesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/messages");
      setMessages(res.data);
    } catch {
      toast.error("Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleMarkAsRead = async (message: Message) => {
    try {
      await api.put(`/messages/${message.id}/read`);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, read: true } : m))
      );
    } catch {
      toast.error("Failed to mark message as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/messages/read-all");
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
      toast.success("All messages marked as read");
    } catch {
      toast.error("Failed to mark messages as read");
    }
  };

  const handleDelete = async (message: Message) => {
    try {
      await api.delete(`/messages/${message.id}`);
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const openMessage = async (message: Message) => {
    setSelectedMessage(message);
    setShowMessageDialog(true);
    if (!message.read) {
      await handleMarkAsRead(message);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (activeTab === "unread") return !m.read;
    if (activeTab === "credentials") return m.message_type === "credentials";
    if (activeTab === "security") return m.message_type === "security";
    return true;
  });

  const unreadCount = messages.filter((m) => !m.read).length;

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "credentials":
        return <KeyRound className="h-4 w-4 text-amber-500" />;
      case "security":
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager", "customer_service", "accountant", "ict_staff", "customer"]}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager", "manager", "customer_service", "accountant", "ict_staff", "customer"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white flex items-center gap-2">
                <Mail className="h-8 w-8 text-[#1F8A4D]" />
                Messages
              </h1>
              <p className="text-muted-foreground mt-1">
                View your inbox and messages from bank staff
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Mark All as Read ({unreadCount})
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{messages.length}</div>
                <p className="text-xs text-muted-foreground mt-1">All received messages</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <MailOpen className="h-5 w-5 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{unreadCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Unread messages</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Credentials</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {messages.filter((m) => m.message_type === "credentials").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Credential messages</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 h-10">
                  <TabsTrigger value="all" className="text-xs gap-1">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs gap-1">
                    Unread ({unreadCount})
                  </TabsTrigger>
                  <TabsTrigger value="credentials" className="text-xs gap-1">
                    Credentials
                  </TabsTrigger>
                  <TabsTrigger value="security" className="text-xs gap-1">
                    Security
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">From</TableHead>
                    <TableHead className="font-semibold">Subject</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Mail className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <p className="text-muted-foreground font-medium mb-1">No messages found</p>
                          <p className="text-sm text-muted-foreground/70">
                            {activeTab === "all"
                              ? "Your inbox is empty"
                              : `No ${activeTab} messages`}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMessages.map((message) => (
                      <TableRow
                        key={message.id}
                        className={`group cursor-pointer ${!message.read ? "bg-primary/5" : ""}`}
                        onClick={() => openMessage(message)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMessageIcon(message.message_type)}
                            <span className={`text-sm ${!message.read ? "font-semibold" : ""}`}>
                              {message.sender_name || "System"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${!message.read ? "font-semibold" : ""}`}>
                            {message.subject}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              message.message_type === "credentials"
                                ? "bg-amber-500/10 text-amber-600"
                                : message.message_type === "security"
                                ? "bg-red-500/10 text-red-600"
                                : "bg-blue-500/10 text-blue-600"
                            }
                          >
                            {message.message_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(message.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openMessage(message)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(message)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {selectedMessage && getMessageIcon(selectedMessage.message_type)}
                </div>
                {selectedMessage?.subject}
              </DialogTitle>
              <DialogDescription>
                From: {selectedMessage?.sender_name || "System"} |{" "}
                {selectedMessage && formatDateTime(selectedMessage.created_at)}
              </DialogDescription>
            </DialogHeader>
            {selectedMessage && (
              <div className="space-y-4">
                <Badge
                  variant="secondary"
                  className={
                    selectedMessage.message_type === "credentials"
                      ? "bg-amber-500/10 text-amber-600"
                      : selectedMessage.message_type === "security"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-blue-500/10 text-blue-600"
                  }
                >
                  {selectedMessage.message_type}
                </Badge>
                <div className="p-4 rounded-lg bg-muted border whitespace-pre-wrap text-sm">
                  {selectedMessage.message}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
