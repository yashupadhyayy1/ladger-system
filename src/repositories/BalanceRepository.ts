import { Database } from '../config/database.js';
import { AccountBalance, AccountType, TrialBalanceReport } from '../models/types.js';

export class BalanceRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async getAccountBalance(accountCode: string, asOfDate?: Date): Promise<AccountBalance | null> {
    let query = `
      SELECT 
        a.code as account_code,
        a.name as account_name,
        a.type as account_type,
        COALESCE(SUM(jl.debit_cents), 0) as debits,
        COALESCE(SUM(jl.credit_cents), 0) as credits
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      LEFT JOIN journal_entries je ON jl.entry_id = je.id
      WHERE a.code = $1
    `;

    const params: (string | Date)[] = [accountCode];

    if (asOfDate) {
      query += ' AND je.date <= $2';
      params.push(asOfDate);
    }

    query += ' GROUP BY a.id, a.code, a.name, a.type';

    const result = await this.db.query(query, params) as {
      account_code: string;
      account_name: string;
      account_type: AccountType;
      debits: string;
      credits: string;
    }[];

    if (result.length === 0) {
      return null;
    }

    const row = result[0]!;
    const debits = parseInt(row.debits, 10);
    const credits = parseInt(row.credits, 10);

    return {
      account_code: row.account_code,
      account_name: row.account_name,
      account_type: row.account_type,
      debits,
      credits,
      balance: this.calculateDisplayBalance(row.account_type, debits, credits),
    };
  }

  async getTrialBalance(fromDate: Date, toDate: Date): Promise<TrialBalanceReport> {
    const query = `
      SELECT 
        a.code as account_code,
        a.name as account_name,
        a.type as account_type,
        COALESCE(SUM(jl.debit_cents), 0) as debits,
        COALESCE(SUM(jl.credit_cents), 0) as credits
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      LEFT JOIN journal_entries je ON jl.entry_id = je.id
      WHERE (je.date IS NULL OR (je.date >= $1 AND je.date <= $2))
      GROUP BY a.id, a.code, a.name, a.type
      ORDER BY a.code
    `;

    const result = await this.db.query(query, [fromDate, toDate]) as {
      account_code: string;
      account_name: string;
      account_type: AccountType;
      debits: string;
      credits: string;
    }[];

    let totalDebits = 0;
    let totalCredits = 0;

    const accounts: AccountBalance[] = result.map(row => {
      const debits = parseInt(row.debits, 10);
      const credits = parseInt(row.credits, 10);
      
      totalDebits += debits;
      totalCredits += credits;

      return {
        account_code: row.account_code,
        account_name: row.account_name,
        account_type: row.account_type,
        debits,
        credits,
        balance: this.calculateDisplayBalance(row.account_type, debits, credits),
      };
    });

    return {
      from: fromDate.toISOString().split('T')[0]!,
      to: toDate.toISOString().split('T')[0]!,
      accounts,
      totals: {
        debits: totalDebits,
        credits: totalCredits,
      },
    };
  }

  async getAllAccountBalances(asOfDate?: Date): Promise<AccountBalance[]> {
    let query = `
      SELECT 
        a.code as account_code,
        a.name as account_name,
        a.type as account_type,
        COALESCE(SUM(jl.debit_cents), 0) as debits,
        COALESCE(SUM(jl.credit_cents), 0) as credits
      FROM accounts a
      LEFT JOIN journal_lines jl ON a.id = jl.account_id
      LEFT JOIN journal_entries je ON jl.entry_id = je.id
    `;

    const params: Date[] = [];

    if (asOfDate) {
      query += ' WHERE (je.date IS NULL OR je.date <= $1)';
      params.push(asOfDate);
    }

    query += ' GROUP BY a.id, a.code, a.name, a.type ORDER BY a.code';

    const result = await this.db.query(query, params) as {
      account_code: string;
      account_name: string;
      account_type: AccountType;
      debits: string;
      credits: string;
    }[];

    return result.map(row => {
      const debits = parseInt(row.debits, 10);
      const credits = parseInt(row.credits, 10);

      return {
        account_code: row.account_code,
        account_name: row.account_name,
        account_type: row.account_type,
        debits,
        credits,
        balance: this.calculateDisplayBalance(row.account_type, debits, credits),
      };
    });
  }

  /**
   * Calculate the display balance according to normal balance conventions
   * - Asset and Expense accounts: positive when debits > credits
   * - Liability, Equity, and Revenue accounts: negative when credits > debits
   */
  private calculateDisplayBalance(accountType: AccountType, debits: number, credits: number): number {
    const netAmount = debits - credits;
    
    // For credit-normal accounts (Liability, Equity, Revenue), 
    // show the balance as negative when they have a credit balance
    if (accountType === 'Liability' || accountType === 'Equity' || accountType === 'Revenue') {
      return netAmount; // This will be negative when credits > debits
    }
    
    // For debit-normal accounts (Asset, Expense), 
    // show the balance as positive when they have a debit balance
    return netAmount;
  }
}

