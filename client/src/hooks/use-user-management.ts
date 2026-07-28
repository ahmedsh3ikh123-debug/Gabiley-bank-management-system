"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import api from "@/lib/api";
import type { User } from "@/types";

export function useUserManagement() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "super_admin" || user?.role === "branch_manager";
  const isEmployee = ["teller", "customer_service", "accountant", "ict_staff"].includes(user?.role || "");

  const createUser = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const res = await api.post("/admin/users", data);
      success("User created successfully");
      return res.data;
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to create user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const updateUser = useCallback(async (id: number, data: any) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/${id}`, data);
      success("User updated successfully");
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to update user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const deleteUser = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await api.delete(`/admin/users/${id}`);
      success("User deleted successfully");
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to delete user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const blockUser = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/${id}/block`);
      success("User suspended");
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to suspend user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const unblockUser = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/${id}/unblock`);
      success("User activated");
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to activate user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const resetPassword = useCallback(async (id: number, password: string) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/${id}/reset-password`, { password });
      success("Password reset successfully");
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to reset password");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const resetPin = useCallback(async (id: number, pin: string) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/${id}/reset-pin`, { pin });
      success("PIN reset successfully");
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to reset PIN");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  const changeRole = useCallback(async (id: number, role: string) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      success("Role changed successfully");
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to change role");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [success, showError]);

  // Permission checks
  const canCreateUser = isAdmin || isEmployee;
  const canDeleteUser = isAdmin;
  const canBlockUser = isAdmin;
  const canChangeRole = isAdmin;
  const canResetPin = isAdmin;

  return {
    loading,
    isAdmin,
    isEmployee,
    createUser,
    updateUser,
    deleteUser,
    blockUser,
    unblockUser,
    resetPassword,
    resetPin,
    changeRole,
    canCreateUser,
    canDeleteUser,
    canBlockUser,
    canChangeRole,
    canResetPin,
  };
}
