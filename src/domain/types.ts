export type TransactionType = 'expense' | 'income' | 'lend' | 'repayment' | 'transfer' | 'writeoff';

export type AccountKind = 'cash' | 'bank' | 'upi' | 'other';

export type LoanStatus = 'pending' | 'partially_returned' | 'fully_returned';

export type LanguageCode = 'mr' | 'en';

export type DigitType = 'latin' | 'devanagari';

export type ThemeMode = 'light' | 'dark' | 'auto';

export type TextScale = 100 | 115 | 130;

export interface Account {
  id: string;
  user_id: string;
  name: string;
  kind: AccountKind;
  opening_balance_paise: number;
  opening_date: string; // YYYY-MM-DD
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Category {
  id: string;
  user_id: string;
  name_mr: string;
  name_en: string;
  icon: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount_paise: number; // Positive integer > 0
  occurred_at: string; // ISO 8601 string
  local_date: string; // YYYY-MM-DD
  account_id: string | null; // Null only for writeoff
  to_account_id: string | null; // Required for transfer
  category_id: string | null; // For expense
  person_id: string | null; // For lend, repayment, writeoff, or optional shop/person
  counterparty_text: string | null; // Free text source for income/shop
  loan_id: string | null; // Links repayment or writeoff to lend transaction
  reason: string | null;
  note: string | null;
  expected_return_date: string | null; // YYYY-MM-DD for lend
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  device_id: string | null;
}

export interface UserSettings {
  user_id: string;
  language: LanguageCode;
  currency: string;
  theme: ThemeMode;
  text_scale: TextScale;
  digits: DigitType;
  fy_start_month: 1 | 4; // 1 = Jan-Dec, 4 = Apr-Mar
  pin_hash: string | null; // Salted hash for local app lock
  pin_salt: string | null;
  is_pin_enabled: boolean;
  updated_at: string;
}

export interface LoanSummary {
  loan_id: string;
  person_id: string;
  occurred_at: string;
  local_date: string;
  amount_paise: number;
  returned_paise: number;
  written_off_paise: number;
  remaining_paise: number;
  status: LoanStatus;
  reason: string | null;
  expected_return_date: string | null;
  account_id: string | null;
  repayments: Transaction[];
}

export interface PersonSummary {
  person: Person;
  total_lent_paise: number;
  total_returned_paise: number;
  total_written_off_paise: number;
  pending_paise: number;
  active_loans_count: number;
  settled_loans_count: number;
  last_activity_date: string | null;
  loans: LoanSummary[];
}

export interface AccountBalance {
  account: Account;
  opening_balance_paise: number;
  current_balance_paise: number;
  total_inflow_paise: number;
  total_outflow_paise: number;
}

export interface DashboardSummary {
  available_balance_paise: number;
  account_balances: AccountBalance[];
  today_expense_paise: number;
  today_income_paise: number;
  today_lent_paise: number;
  today_repayment_paise: number;
  today_net_cash_flow_paise: number;
  total_pending_receivable_paise: number;
  month_expense_paise: number;
  month_income_paise: number;
  month_lent_paise: number;
  month_repayment_paise: number;
  month_net_cash_flow_paise: number;
}

export interface PeriodSummary {
  total_expense_paise: number;
  total_income_paise: number;
  total_lent_paise: number;
  total_repayment_paise: number;
  net_cash_flow_paise: number;
  category_breakdown: {
    category_id: string | null;
    category_name_mr: string;
    category_name_en: string;
    color: string;
    icon: string;
    amount_paise: number;
    percentage: number;
    count: number;
  }[];
}

export interface OutboxItem {
  id: string;
  table_name: 'accounts' | 'categories' | 'people' | 'transactions' | 'settings';
  record_id: string;
  action: 'insert' | 'update' | 'delete';
  payload: any;
  created_at: string;
  retry_count: number;
  last_error: string | null;
}
