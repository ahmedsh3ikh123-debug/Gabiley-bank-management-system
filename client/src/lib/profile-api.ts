import api from './api';
import { User } from '@/types';

export interface ProfileData {
  user: User;
  employee?: any;
  accounts?: any[];
}

export const profileApi = {
  async getMyProfile(): Promise<ProfileData> {
    const response = await api.get('/profile/my-profile');
    return response.data;
  },

  async updateMyProfile(data: Partial<User>): Promise<{ message: string; user: User }> {
    const response = await api.put('/profile/my-profile', data);
    return response.data;
  },

  async changeUsername(username: string, currentPassword: string): Promise<{ message: string; username: string }> {
    const response = await api.put('/profile/my-username', { username, current_password: currentPassword });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.put('/profile/my-password', { current_password: currentPassword, new_password: newPassword });
    return response.data;
  },

  async changePin(currentPin: string, newPin: string): Promise<{ message: string }> {
    const response = await api.put('/profile/my-pin', { current_pin: currentPin, new_pin: newPin });
    return response.data;
  },

  async adminUpdateUser(userId: number, data: Partial<User>): Promise<{ message: string; user: User }> {
    const response = await api.put(`/profile/admin/user/${userId}`, data);
    return response.data;
  },

  async adminChangeUsername(userId: number, username: string): Promise<{ message: string; username: string }> {
    const response = await api.put(`/profile/admin/user/${userId}/username`, { username });
    return response.data;
  },

  async getUserById(userId: number): Promise<ProfileData> {
    const response = await api.get(`/profile/user/${userId}`);
    return response.data;
  }
};
