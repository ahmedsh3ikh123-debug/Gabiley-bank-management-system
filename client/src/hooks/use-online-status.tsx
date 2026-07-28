"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface OnlineStatusState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: string | null;
  pendingItems: number;
}

interface OnlineStatusContextType extends OnlineStatusState {
  setSyncing: (syncing: boolean) => void;
  setLastSync: (time: string) => void;
  setPendingItems: (count: number) => void;
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(undefined);

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OnlineStatusState>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    pendingItems: 0,
  });

  useEffect(() => {
    setStatus((prev) => ({ ...prev, isOnline: navigator.onLine }));

    const handleOnline = () => setStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const setSyncing = useCallback((syncing: boolean) => {
    setStatus((prev) => ({ ...prev, isSyncing: syncing }));
  }, []);

  const setLastSync = useCallback((time: string) => {
    setStatus((prev) => ({ ...prev, lastSync: time }));
  }, []);

  const setPendingItems = useCallback((count: number) => {
    setStatus((prev) => ({ ...prev, pendingItems: count }));
  }, []);

  return (
    <OnlineStatusContext.Provider value={{ ...status, setSyncing, setLastSync, setPendingItems }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus(): OnlineStatusContextType {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error("useOnlineStatus must be used within an OnlineStatusProvider");
  }
  return context;
}
