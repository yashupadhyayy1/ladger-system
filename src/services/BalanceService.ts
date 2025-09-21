import { BalanceRepository } from '../repositories/BalanceRepository.js';
import { AccountService } from './AccountService.js';
import { 
  AccountBalance, 
  TrialBalanceReport, 
  ValidationError, 
  NotFoundError 
} from '../models/types.js';
import { validateInput, balanceQuerySchema, trialBalanceQuerySchema } from '../utils/validation.js';

export class BalanceService {
  private balanceRepository: BalanceRepository;
  private accountService: AccountService;

  constructor() {
    this.balanceRepository = new BalanceRepository();
    this.accountService = new AccountService();
  }

  async getAccountBalance(
    accountCode: string, 
    asOfDate?: string
  ): Promise<AccountBalance> {
    // Validate account code
    if (!accountCode || typeof accountCode !== 'string') {
      throw new ValidationError('Account code is required');
    }

    // Validate and parse as_of date if provided
    let asOfDateParsed: Date | undefined;
    if (asOfDate) {
      const validated = validateInput(balanceQuerySchema, { as_of: asOfDate });
      asOfDateParsed = new Date(validated.as_of!);
    }

    // Ensure account exists
    await this.accountService.getAccount(accountCode);

    // Get the balance
    const balance = await this.balanceRepository.getAccountBalance(accountCode, asOfDateParsed);
    
    if (!balance) {
      throw new NotFoundError(`No balance data found for account '${accountCode}'`);
    }

    return balance;
  }

  async getTrialBalance(from: string, to: string): Promise<TrialBalanceReport> {
    // Validate date range
    const validated = validateInput(trialBalanceQuerySchema, { from, to });
    
    const fromDate = new Date(validated.from);
    const toDate = new Date(validated.to);

    // Get the trial balance
    const trialBalance = await this.balanceRepository.getTrialBalance(fromDate, toDate);

    // Validate that debits equal credits (fundamental accounting principle)
    if (trialBalance.totals.debits !== trialBalance.totals.credits) {
      throw new Error(
        `Trial balance does not balance! ` +
        `Total debits: ${trialBalance.totals.debits}, ` +
        `Total credits: ${trialBalance.totals.credits}. ` +
        `This indicates a serious data integrity issue.`
      );
    }

    return trialBalance;
  }

  async getAllAccountBalances(asOfDate?: string): Promise<AccountBalance[]> {
    // Validate as_of date if provided
    let asOfDateParsed: Date | undefined;
    if (asOfDate) {
      const validated = validateInput(balanceQuerySchema, { as_of: asOfDate });
      asOfDateParsed = new Date(validated.as_of!);
    }

    return await this.balanceRepository.getAllAccountBalances(asOfDateParsed);
  }

  /**
   * Get a summary of balances by account type
   */
  async getBalanceSummaryByType(asOfDate?: string): Promise<{
    assets: number;
    liabilities: number;
    equity: number;
    revenue: number;
    expenses: number;
    netIncome: number;
  }> {
    const balances = await this.getAllAccountBalances(asOfDate);

    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    let revenue = 0;
    let expenses = 0;

    for (const balance of balances) {
      switch (balance.account_type) {
        case 'Asset':
          assets += balance.balance;
          break;
        case 'Liability':
          liabilities += Math.abs(balance.balance); // Make positive for summary
          break;
        case 'Equity':
          equity += Math.abs(balance.balance); // Make positive for summary
          break;
        case 'Revenue':
          revenue += Math.abs(balance.balance); // Make positive for summary
          break;
        case 'Expense':
          expenses += balance.balance;
          break;
      }
    }

    // Net income = Revenue - Expenses
    const netIncome = revenue - expenses;

    return {
      assets,
      liabilities,
      equity,
      revenue,
      expenses,
      netIncome,
    };
  }

  /**
   * Validate the accounting equation: Assets = Liabilities + Equity
   * This is a fundamental check for data integrity
   */
  async validateAccountingEquation(asOfDate?: string): Promise<{
    isValid: boolean;
    assets: number;
    liabilities: number;
    equity: number;
    difference: number;
    message: string;
  }> {
    const summary = await this.getBalanceSummaryByType(asOfDate);
    
    const leftSide = summary.assets;
    const rightSide = summary.liabilities + summary.equity;
    const difference = leftSide - rightSide;
    const isValid = Math.abs(difference) < 1; // Allow for rounding to the cent

    return {
      isValid,
      assets: summary.assets,
      liabilities: summary.liabilities,
      equity: summary.equity,
      difference,
      message: isValid 
        ? 'Accounting equation is balanced' 
        : `Accounting equation is not balanced. Difference: ${difference} cents`,
    };
  }

  /**
   * Check if an account has any activity (non-zero balance)
   */
  async hasAccountActivity(accountCode: string, asOfDate?: string): Promise<boolean> {
    try {
      const balance = await this.getAccountBalance(accountCode, asOfDate);
      return balance.debits > 0 || balance.credits > 0;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return false;
      }
      throw error;
    }
  }
}

