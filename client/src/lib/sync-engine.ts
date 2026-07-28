import api from "./api";
import {
  getPendingSyncItems,
  updateSyncStatus,
  clearSyncedItems,
  saveUserOffline,
  saveAccountOffline,
  saveTransactionOffline,
  saveLoanOffline,
  updateLoanOffline,
  setSyncMeta,
  getSyncMeta,
} from "./offline-db";
import type { User, Account, Transaction, Loan } from "@/types";

export type SyncStatus = "idle" | "syncing" | "complete" | "error";

export interface SyncProgress {
  status: SyncStatus;
  total: number;
  processed: number;
  failed: number;
  message: string;
}

let syncListeners: ((progress: SyncProgress) => void)[] = [];

export function onSyncProgress(callback: (progress: SyncProgress) => void) {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== callback);
  };
}

function notify(progress: SyncProgress) {
  syncListeners.forEach((l) => l(progress));
}

export async function syncData(): Promise<void> {
  const pending = await getPendingSyncItems();
  if (pending.length === 0) return;

  const progress: SyncProgress = {
    status: "syncing",
    total: pending.length,
    processed: 0,
    failed: 0,
    message: `Synchronizing ${pending.length} items...`,
  };
  notify(progress);

  for (const item of pending) {
    try {
      const data = JSON.parse(item.data);
      let endpoint = "";
      let method = "";

      switch (item.entity) {
        case "user":
          if (item.operation === "create") {
            endpoint = "/auth/register";
            method = "POST";
          } else if (item.operation === "update") {
            endpoint = `/auth/profile`;
            method = "PUT";
          }
          break;
        case "account":
          if (item.operation === "create") {
            endpoint = "/accounts";
            method = "POST";
          }
          break;
        case "transaction":
          if (item.operation === "create") {
            endpoint = `/transactions/${data.type}`;
            method = "POST";
          }
          break;
        case "loan":
          if (item.operation === "create") {
            endpoint = "/loans";
            method = "POST";
          } else if (item.operation === "approve") {
            endpoint = `/admin/loans/${item.entity_id}/approve`;
            method = "PUT";
          } else if (item.operation === "reject") {
            endpoint = `/admin/loans/${item.entity_id}/reject`;
            method = "PUT";
          }
          break;
      }

      if (endpoint && method) {
        const response = await api({ method, url: endpoint, data });

        if (response.data) {
          if (item.entity === "user" && response.data.user) {
            await saveUserOffline(response.data.user as User);
          } else if (item.entity === "account" && response.data) {
            await saveAccountOffline(response.data as Account);
          } else if (item.entity === "transaction" && response.data) {
            await saveTransactionOffline(response.data as Transaction);
          } else if (item.entity === "loan" && response.data) {
            const loanData = response.data as Loan;
            await saveLoanOffline({ ...loanData, sync_status: "synced" });
          }
        }

        await updateSyncStatus(item.id!, "synced");
        progress.processed++;
      } else {
        await updateSyncStatus(item.id!, "synced");
        progress.processed++;
      }
    } catch (error) {
      console.error(`Sync failed for ${item.entity} ${item.operation}:`, error);
      await updateSyncStatus(item.id!, "failed", String(error));
      progress.failed++;
    }

    progress.message = `Processed ${progress.processed + progress.failed}/${progress.total} items...`;
    notify(progress);
  }

  await clearSyncedItems();
  await setSyncMeta("lastSync", new Date().toISOString());

  progress.status = progress.failed > 0 ? "error" : "complete";
  progress.message =
    progress.failed > 0
      ? `Sync complete with ${progress.failed} failures`
      : "Synchronization complete";
  notify(progress);
}

export async function downloadUpdates(): Promise<void> {
  const lastSync = await getSyncMeta("lastSync");

  try {
    const usersRes = await api.get("/admin/users");
    if (usersRes.data) {
      for (const user of usersRes.data) {
        await saveUserOffline(user as User);
      }
    }

    const accountsRes = await api.get("/accounts/all");
    if (accountsRes.data) {
      for (const account of accountsRes.data) {
        await saveAccountOffline(account as Account);
      }
    }

    const txRes = await api.get("/transactions");
    if (txRes.data) {
      for (const tx of txRes.data) {
        await saveTransactionOffline(tx as Transaction);
      }
    }

    await setSyncMeta("lastSync", new Date().toISOString());
  } catch (error) {
    console.error("Download updates failed:", error);
  }
}

export async function performFullSync(): Promise<void> {
  await syncData();
  await downloadUpdates();
}
