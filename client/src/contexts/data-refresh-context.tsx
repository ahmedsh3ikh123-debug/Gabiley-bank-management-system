"use client";

import { createContext, useContext, useCallback, useRef } from "react";

type DataCategory = "users" | "employees" | "customers" | "accounts" | "loans" | "transactions" | "dashboard" | "all";

type RefreshCallback = () => void | Promise<void>;

interface DataRefreshContextType {
  notifyChange: (category: DataCategory) => void;
  registerRefresh: (category: DataCategory, callback: RefreshCallback) => () => void;
}

const DataRefreshContext = createContext<DataRefreshContextType | null>(null);

export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
  const callbacksRef = useRef<Map<DataCategory, Set<RefreshCallback>>>(new Map());

  const registerRefresh = useCallback((category: DataCategory, callback: RefreshCallback) => {
    if (!callbacksRef.current.has(category)) {
      callbacksRef.current.set(category, new Set());
    }
    callbacksRef.current.get(category)!.add(callback);

    return () => {
      callbacksRef.current.get(category)?.delete(callback);
    };
  }, []);

  const notifyChange = useCallback((category: DataCategory) => {
    const categoriesToNotify: DataCategory[] = [category, "all"];

    for (const cat of categoriesToNotify) {
      const callbacks = callbacksRef.current.get(cat);
      if (callbacks) {
        for (const cb of Array.from(callbacks)) {
          cb();
        }
      }
    }
  }, []);

  return (
    <DataRefreshContext.Provider value={{ notifyChange, registerRefresh }}>
      {children}
    </DataRefreshContext.Provider>
  );
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error("useDataRefresh must be used within a DataRefreshProvider");
  }
  return context;
}
