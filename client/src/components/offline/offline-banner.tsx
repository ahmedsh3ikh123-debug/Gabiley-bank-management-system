"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingItems } = useOnlineStatus();
  const { isCustomer } = useAuth();

  if (isOnline) return null;

  if (isCustomer) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">You are offline</p>
              <p className="text-xs text-amber-600">
                Some features may be limited. Loan applications will be saved and synced when you reconnect.
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingItems } = useOnlineStatus();
  const { isCustomer } = useAuth();

  if (isCustomer) return null;

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          <Wifi className="mr-1 h-3 w-3" />
          Online
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          <WifiOff className="mr-1 h-3 w-3" />
          Offline
        </Badge>
      )}
      {isSyncing && (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
          Syncing...
        </Badge>
      )}
      {!isOnline && pendingItems > 0 && (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {pendingItems} pending
        </Badge>
      )}
    </div>
  );
}
