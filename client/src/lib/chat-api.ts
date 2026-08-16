import api from './api';

export interface Conversation {
  id: number;
  other_user_id: number;
  other_user_name: string;
  other_user_picture: string;
  other_user_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  recipient_id: number;
  subject: string;
  message: string;
  message_type: string;
  read: number;
  created_at: string;
  sender_name: string;
  sender_picture: string;
}

export interface ChatUser {
  id: number;
  full_name: string;
  profile_picture: string;
  role: string;
}

export interface SupportCategory {
  id: string;
  label: string;
  targetRoles: string[];
}

export const chatApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const res = await api.get('/chat/conversations');
    return res.data;
  },

  getMessages: async (userId: number): Promise<ChatMessage[]> => {
    const res = await api.get(`/chat/conversations/${userId}/messages`);
    return res.data;
  },

  sendMessage: async (userId: number, message: string): Promise<ChatMessage> => {
    const res = await api.post(`/chat/conversations/${userId}/messages`, { message });
    return res.data;
  },

  getUsers: async (): Promise<ChatUser[]> => {
    const res = await api.get('/chat/users');
    return res.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/chat/unread-count');
    return res.data.count;
  },

  getSupportCategories: async (): Promise<SupportCategory[]> => {
    const res = await api.get('/chat/support-categories');
    return res.data;
  },

  createSupportRequest: async (category: string, message: string): Promise<{ message: string; data: ChatMessage }> => {
    const res = await api.post('/chat/support-request', { category, message });
    return res.data;
  },

  getSupportRequests: async (): Promise<ChatMessage[]> => {
    const res = await api.get('/chat/support-requests');
    return res.data;
  },
};
