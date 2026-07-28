export type UserRole =
  | "super_admin"
  | "branch_manager"
  | "teller"
  | "customer_service"
  | "accountant"
  | "ict_staff"
  | "customer";

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  address: string;
  gender: string;
  mother_name?: string;
  dob?: string;
  role: UserRole;
  status: "active" | "blocked" | "frozen" | "pending";
  hasPin: boolean;
  branch?: string;
  profile_picture?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
  account_number?: string;
  customer_id?: string;
  employee_id?: string;
}

export interface Account {
  id: number;
  user_id: number;
  account_number: string;
  account_type: "savings" | "current" | "fixed_deposit" | "customer";
  balance: number;
  interest_rate: number;
  currency: string;
  status: "active" | "blocked" | "closed";
  frozen: number;
  full_name?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  transaction_id: string;
  from_account_id?: number;
  to_account_id?: number;
  type: "deposit" | "withdrawal" | "transfer";
  amount: number;
  fee: number;
  description: string;
  status: "completed" | "pending" | "failed";
  sync_status: "synced" | "pending";
  created_at: string;
  from_account_number?: string;
  to_account_number?: string;
}

export interface Employee {
  id: number;
  user_id?: number;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  salary: number;
  hire_date: string;
  branch?: string;
  profile_picture?: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface Loan {
  id: number;
  user_id: number;
  amount: number;
  term_months: number;
  purpose: string;
  loan_type: string;
  monthly_income: number;
  status: "pending" | "approved" | "rejected" | "paid";
  reviewed_by?: number;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "security";
  read: boolean;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: "low" | "normal" | "important" | "urgent";
  target_role: string;
  created_by: number;
  status: "active" | "inactive";
  created_at: string;
  creator_name?: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  module: string;
  details: string;
  ip_address: string;
  status: "success" | "failed";
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  manager_id?: number;
  status: "active" | "inactive";
  created_at: string;
}

export interface SyncLog {
  id?: number;
  operation: string;
  entity: string;
  entity_id: string;
  data: string;
  status: "pending" | "synced" | "failed";
  created_at: string;
  synced_at?: string;
  error?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  token?: string;
  user?: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DailyReport {
  date: string;
  total_deposits: number;
  total_withdrawals: number;
  total_transfers: number;
  total_fees: number;
  transaction_count: number;
  new_accounts: number;
}

export interface MonthlyReport {
  month: string;
  total_deposits: number;
  total_withdrawals: number;
  total_transfers: number;
  total_fees: number;
  transaction_count: number;
  new_accounts: number;
  loan_disbursements: number;
  loan_repayments: number;
}

export interface Analytics {
  trends: DailyReport[];
  top_accounts: (Account & { full_name: string })[];
  loan_summary: {
    total_pending: number;
    total_approved: number;
    total_rejected: number;
    total_amount: number;
  };
  growth: {
    users: { month: string; count: number }[];
    accounts: { month: string; count: number }[];
  };
}
