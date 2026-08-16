import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateAccountNumber(id: number): string {
  return `GB${String(id).padStart(6, "0")}${Math.floor(Math.random() * 1000)}`;
}

export function generateEmployeeId(): string {
  return `EMP${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    branch_manager: "Branch Manager",
    teller: "Teller",
    customer_service: "Customer Service",
    accountant: "Accountant",
    ict_staff: "ICT Staff",
    customer: "Customer",
    admin: "Admin",
    user: "User",
    employee: "Employee",
    manager: "Manager",
  };
  return labels[role] || role;
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    super_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    branch_manager: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    teller: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    customer_service: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    accountant: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    ict_staff: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    customer: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    user: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    employee: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    manager: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return colors[role] || colors.customer;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    blocked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    synced: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  return colors[status] || colors.pending;
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    important: "bg-yellow-100 text-yellow-800",
    urgent: "bg-red-100 text-red-800",
  };
  return colors[priority] || colors.normal;
}

export const ADMIN_ROLES = [
  "super_admin",
  "branch_manager",
  "manager",
] as const;

export const EMPLOYEE_ROLES = [
  "teller",
  "customer_service",
  "accountant",
  "ict_staff",
] as const;

export const DEPARTMENTS = [
  "Operations",
  "Finance",
  "Customer Service",
  "IT",
  "Human Resources",
  "Marketing",
  "Compliance",
  "Risk Management",
] as const;
