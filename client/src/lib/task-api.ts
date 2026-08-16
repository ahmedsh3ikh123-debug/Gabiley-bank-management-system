import api from './api';
import { Task, TaskComment, TaskStats } from '@/types';

export const taskApi = {
  async getTasks(filters?: { status?: string; priority?: string; assigned_to?: number; category?: string }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to.toString());
    if (filters?.category) params.append('category', filters.category);
    
    const queryString = params.toString();
    const url = `/tasks${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },

  async getTask(id: number): Promise<Task> {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  async getTaskStats(): Promise<TaskStats> {
    const response = await api.get('/tasks/stats');
    return response.data;
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const response = await api.post('/tasks', task);
    return response.data;
  },

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const response = await api.put(`/tasks/${id}`, task);
    return response.data;
  },

  async deleteTask(id: number): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  async addTaskComment(taskId: number, comment: string): Promise<TaskComment> {
    const response = await api.post(`/tasks/${taskId}/comments`, { comment });
    return response.data;
  }
};
