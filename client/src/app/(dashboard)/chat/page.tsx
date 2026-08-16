'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { ProtectedRoute } from '@/components/layout/protected-route';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { chatApi, Conversation, ChatMessage, ChatUser, SupportCategory } from '@/lib/chat-api';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Loader2,
  ArrowLeft,
  User,
  Users,
  Headphones,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ChatPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showSupportRequest, setShowSupportRequest] = useState(false);
  const [supportCategories, setSupportCategories] = useState<SupportCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatApi.getConversations();
      setConversations(data);
    } catch {
      // silent - no conversations yet is fine
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (userId: number) => {
    try {
      const data = await chatApi.getMessages(userId);
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    } catch {
      toast.error('Failed to load messages');
    }
  }, [toast]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await chatApi.getUsers();
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    }
  }, [toast]);

  const loadSupportCategories = useCallback(async () => {
    try {
      const data = await chatApi.getSupportCategories();
      setSupportCategories(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.other_user_id);
    }
  }, [selectedConversation, loadMessages]);

  useEffect(() => {
    if (showNewChat) {
      loadUsers();
    }
  }, [showNewChat, loadUsers]);

  useEffect(() => {
    if (showSupportRequest) {
      loadSupportCategories();
    }
  }, [showSupportRequest, loadSupportCategories]);

  useEffect(() => {
    if (!selectedConversation) return;
    const interval = setInterval(() => {
      loadMessages(selectedConversation.other_user_id);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConversation, loadMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const sentMessage = await chatApi.sendMessage(selectedConversation.other_user_id, newMessage);
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');
      setTimeout(scrollToBottom, 100);

      setConversations((prev) =>
        prev.map((c) =>
          c.other_user_id === selectedConversation.other_user_id
            ? { ...c, last_message: newMessage, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStartConversation = async (userId: number) => {
    const existing = users.find((u) => u.id === userId);
    if (existing) {
      const conv: Conversation = {
        id: userId,
        other_user_id: userId,
        other_user_name: existing.full_name,
        other_user_picture: existing.profile_picture,
        other_user_role: existing.role,
        last_message: '',
        last_message_at: '',
        unread_count: 0,
      };
      setSelectedConversation(conv);
    }
    setShowNewChat(false);
  };

  const handleSendSupportRequest = async () => {
    if (!selectedCategory || !supportMessage.trim() || sendingSupport) return;

    setSendingSupport(true);
    try {
      await chatApi.createSupportRequest(selectedCategory, supportMessage);
      toast.success('Support request sent successfully!');
      setSupportMessage('');
      setSelectedCategory('');
      setShowSupportRequest(false);
      loadConversations();
    } catch {
      toast.error('Failed to send support request');
    } finally {
      setSendingSupport(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.other_user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-500/10 text-red-600';
      case 'branch_manager':
      case 'manager': return 'bg-blue-500/10 text-blue-600';
      case 'teller':
      case 'customer_service': return 'bg-green-500/10 text-green-600';
      case 'customer': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'accountant', 'ict_staff', 'customer']}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'accountant', 'ict_staff', 'customer']}>
      <DashboardLayout>
        <div className="h-[calc(100vh-12rem)] flex gap-4">
          {/* Conversations List */}
          <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96`}>
            <Card className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-[#1F8A4D]" />
                    Messages
                  </h2>
                  <div className="flex gap-2">
                    {user?.role === 'customer' && (
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-amber-500 hover:bg-amber-600"
                        onClick={() => setShowSupportRequest(true)}
                        title="Request Support"
                      >
                        <Headphones className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      className="h-9 w-9 bg-[#1F8A4D] hover:bg-[#155c34]"
                      onClick={() => setShowNewChat(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <CardContent className="flex-1 overflow-y-auto p-0">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                    <p className="font-medium">No conversations yet</p>
                    <p className="text-sm">Start a new conversation</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.other_user_id}
                        className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          selectedConversation?.other_user_id === conv.other_user_id ? 'bg-[#1F8A4D]/10' : ''
                        }`}
                        onClick={() => setSelectedConversation(conv)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full bg-[#1F8A4D] flex items-center justify-center text-white font-semibold shrink-0">
                              {conv.other_user_picture ? (
                                <img src={conv.other_user_picture} alt="" className="h-12 w-12 rounded-full object-cover" />
                              ) : (
                                getInitials(conv.other_user_name)
                              )}
                            </div>
                            {conv.unread_count > 0 && (
                              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                                {conv.unread_count > 9 ? '9+' : conv.unread_count}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className={`font-semibold truncate ${conv.unread_count > 0 ? 'text-[#1F8A4D]' : ''}`}>
                                {conv.other_user_name}
                              </h3>
                              <span className="text-xs text-gray-500 shrink-0 ml-2">
                                {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className={`text-sm truncate mt-0.5 ${conv.unread_count > 0 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                              {conv.last_message || 'No messages yet'}
                            </p>
                            <Badge className={`mt-1 text-[10px] ${getRoleBadgeColor(conv.other_user_role)}`}>
                              {conv.other_user_role?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
            {selectedConversation ? (
              <Card className="flex-1 flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversation(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="h-10 w-10 rounded-full bg-[#1F8A4D] flex items-center justify-center text-white font-semibold shrink-0">
                    {selectedConversation.other_user_picture ? (
                      <img src={selectedConversation.other_user_picture} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      getInitials(selectedConversation.other_user_name)
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedConversation.other_user_name}</h3>
                    <Badge className={`text-[10px] ${getRoleBadgeColor(selectedConversation.other_user_role)}`}>
                      {selectedConversation.other_user_role?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                      <p className="font-medium">No messages yet</p>
                      <p className="text-sm">Start the conversation</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex items-end gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                            {!isOwn && (
                              <div className="h-8 w-8 rounded-full bg-[#1F8A4D] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                {msg.sender_picture ? (
                                  <img src={msg.sender_picture} alt="" className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                  getInitials(msg.sender_name)
                                )}
                              </div>
                            )}
                            <div>
                              <div className={`rounded-2xl px-4 py-2 ${isOwn ? 'bg-[#1F8A4D] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              </div>
                              <p className={`text-[10px] text-gray-500 mt-1 ${isOwn ? 'text-right' : ''}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} className="bg-[#1F8A4D] hover:bg-[#155c34]">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-1">Select a conversation</h3>
                  <p className="text-sm">Choose from existing conversations or start a new one</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* New Chat Dialog */}
        <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#1F8A4D]" />
                Start New Conversation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10" />
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y">
                {filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No users found</p>
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                      onClick={() => handleStartConversation(u.id)}
                    >
                      <div className="h-10 w-10 rounded-full bg-[#1F8A4D] flex items-center justify-center text-white font-semibold shrink-0">
                        {u.profile_picture ? (
                          <img src={u.profile_picture} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          getInitials(u.full_name)
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{u.full_name}</h4>
                        <Badge className={`text-[10px] ${getRoleBadgeColor(u.role)}`}>
                          {u.role?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Support Request Dialog */}
        <Dialog open={showSupportRequest} onOpenChange={setShowSupportRequest}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-amber-500" />
                Request Support
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a support category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {supportCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Your Message</label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Describe your issue or question..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSendSupportRequest}
                disabled={!selectedCategory || !supportMessage.trim() || sendingSupport}
                className="w-full bg-amber-500 hover:bg-amber-600"
              >
                {sendingSupport ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Support Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
