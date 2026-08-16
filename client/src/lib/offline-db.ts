import Dexie, { type Table } from "dexie";
import type { User, Account, Transaction, Loan, SyncLog } from "@/types";

class OfflineDatabase extends Dexie {
  users!: Table<User>;
  accounts!: Table<Account>;
  transactions!: Table<Transaction & { sync_status: string }>;
  loans!: Table<Loan & { sync_status?: string }>;
  pendingSync!: Table<SyncLog>;
  syncMeta!: Table<{ key: string; value: string }>;

  constructor() {
    super("GBMS_OfflineDB");
    this.version(2).stores({
      users: "++_id, username, email, role, status",
      accounts: "++_id, user_id, account_number, status",
      transactions: "++_id, from_account_id, to_account_id, type, status, sync_status, created_at",
      loans: "++id, user_id, status, sync_status, created_at",
      pendingSync: "++id, operation, entity, entity_id, status, created_at",
      syncMeta: "key",
      pendingAccounts: "++id, customer_id, status, created_at",
    });
  }
}

const db = new OfflineDatabase();

export async function saveUserOffline(user: User): Promise<void> {
  await db.users.put(user);
}

export async function getUserOffline(id: string): Promise<User | undefined> {
  return db.users.get(id);
}

export async function getAllUsersOffline(): Promise<User[]> {
  return db.users.toArray();
}

export async function searchUsersOffline(query: string): Promise<User[]> {
  const lower = query.toLowerCase();
  const users = await db.users.toArray();
  return users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(lower) ||
      u.username.toLowerCase().includes(lower) ||
      u.email.toLowerCase().includes(lower)
  );
}

export async function saveAccountOffline(account: Account): Promise<void> {
  await db.accounts.put(account);
}

export async function getAccountsOffline(userId: string): Promise<Account[]> {
  return db.accounts.where("user_id").equals(userId).toArray();
}

export async function getAllAccountsOffline(): Promise<Account[]> {
  return db.accounts.toArray();
}

export async function saveTransactionOffline(
  transaction: Transaction & { sync_status?: string }
): Promise<void> {
  await db.transactions.put({ ...transaction, sync_status: "pending" });
}

export async function getTransactionsOffline(userId: string): Promise<Transaction[]> {
  const accounts = await db.accounts.where("user_id").equals(userId).toArray();
  const accountIds = accounts.map((a) => a.id);
  return db.transactions
    .where("from_account_id")
    .anyOf(accountIds)
    .or("to_account_id")
    .anyOf(accountIds)
    .toArray();
}

export async function getAllTransactionsOffline(): Promise<Transaction[]> {
  return db.transactions.toArray();
}

export async function addToPendingSync(
  operation: string,
  entity: string,
  entityId: string,
  data: unknown
): Promise<void> {
  await db.pendingSync.add({
    operation,
    entity,
    entity_id: entityId,
    data: JSON.stringify(data),
    status: "pending",
    created_at: new Date().toISOString(),
  });
}

export async function getPendingSyncItems(): Promise<SyncLog[]> {
  return db.pendingSync.where("status").equals("pending").toArray();
}

export async function updateSyncStatus(
  id: number,
  status: "pending" | "synced" | "failed",
  error?: string
): Promise<void> {
  const update: Partial<SyncLog> = { status, synced_at: new Date().toISOString() };
  if (error) update.error = error;
  await db.pendingSync.update(id, update);
}

export async function clearSyncedItems(): Promise<void> {
  await db.pendingSync.where("status").equals("synced").delete();
}

export async function getSyncMeta(key: string): Promise<string | undefined> {
  const meta = await db.syncMeta.get(key);
  return meta?.value;
}

export async function setSyncMeta(key: string, value: string): Promise<void> {
  await db.syncMeta.put({ key, value });
}

export async function getPendingSyncCount(): Promise<number> {
  return db.pendingSync.where("status").equals("pending").count();
}

export async function saveLoanOffline(loan: Loan & { sync_status?: string }): Promise<void> {
  await db.loans.put({ ...loan, sync_status: loan.sync_status || "synced" });
}

export async function getLoansOffline(userId?: number): Promise<Loan[]> {
  if (userId) {
    return db.loans.where("user_id").equals(userId).toArray();
  }
  return db.loans.toArray();
}

export async function getLoanOffline(id: number): Promise<Loan | undefined> {
  return db.loans.get(id);
}

export async function updateLoanOffline(id: number, updates: Partial<Loan & { sync_status?: string }>): Promise<void> {
  await db.loans.update(id, updates);
}

export async function deleteLoanOffline(id: number): Promise<void> {
  await db.loans.delete(id);
}

export async function getPendingLoansOffline(): Promise<(Loan & { sync_status?: string })[]> {
  return db.loans.where("sync_status").equals("pending").toArray();
}

// Pending Account Registrations for Offline Mode
export interface PendingAccountRegistration {
  id?: number;
  customer_id: number;
  customer_username: string;
  customer_password: string;
  full_name: string;
  email: string;
  phone: string;
  mother_name: string;
  id_card_image: string;
  account_type: string;
  purpose: string;
  status: "pending" | "synced" | "failed";
  created_at: string;
  error?: string;
}

export async function savePendingAccountOffline(registration: Omit<PendingAccountRegistration, "id" | "status" | "created_at">): Promise<void> {
  await db.table("pendingAccounts").add({
    ...registration,
    status: "pending",
    created_at: new Date().toISOString(),
  });
}

export async function getPendingAccountsOffline(): Promise<PendingAccountRegistration[]> {
  return db.table("pendingAccounts").where("status").equals("pending").toArray();
}

export async function updatePendingAccountStatus(id: number, status: "pending" | "synced" | "failed", error?: string): Promise<void> {
  const update: Partial<PendingAccountRegistration> = { status };
  if (error) update.error = error;
  await db.table("pendingAccounts").update(id, update);
}

export async function clearOfflineDatabase(): Promise<void> {
  await db.users.clear();
  await db.accounts.clear();
  await db.transactions.clear();
  await db.loans.clear();
  await db.pendingSync.clear();
  await db.syncMeta.clear();
}

export { db };
