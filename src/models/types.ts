// Core domain types for the double-entry ledger system

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  created_at: Date;
}

export interface CreateAccountRequest {
  code: string;
  name: string;
  type: AccountType;
}

export interface JournalEntry {
  id: string;
  date: Date;
  narration: string;
  posted_at: Date;
  reverses_entry_id?: string;
  lines: JournalLine[];
}

export interface JournalLine {
  id: string;
  entry_id: string;
  account_id: string;
  account_code: string;
  debit_cents: number;
  credit_cents: number;
  line_index: number;
}

export interface CreateJournalEntryRequest {
  date: string;
  narration: string;
  lines: CreateJournalLineRequest[];
  reverses_entry_id?: string;
}

export interface CreateJournalLineRequest {
  account_code: string;
  debit?: number;
  credit?: number;
}

export interface AccountBalance {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debits: number;
  credits: number;
  balance: number;
}

export interface TrialBalanceReport {
  from: string;
  to: string;
  accounts: AccountBalance[];
  totals: {
    debits: number;
    credits: number;
  };
}

export interface IdempotencyRecord {
  key: string;
  request_hash: string;
  entry_id: string;
  created_at: Date;
}

export interface ApiKey {
  key: string;
  created_at: Date;
}

// Error types
export class LedgerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'LedgerError';
  }
}

export class ValidationError extends LedgerError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends LedgerError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends LedgerError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class UnauthorizedError extends LedgerError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED', 401);
  }
}

