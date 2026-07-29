import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "200":
    case "201":
    case "success":
      return "text-neon-green";
    case "400":
    case "401":
    case "403":
    case "error":
      return "text-red-400";
    case "500":
    case "503":
    case "warning":
      return "text-neon-orange";
    default:
      return "text-text-secondary";
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "200":
    case "201":
    case "Active":
    case "Healthy":
      return "status-success";
    case "400":
    case "401":
    case "403":
    case "Error":
    case "Critical":
      return "status-error";
    case "500":
    case "503":
    case "Warning":
    case "Degraded":
      return "status-warning";
    default:
      return "bg-surface-light text-text-secondary";
  }
}
