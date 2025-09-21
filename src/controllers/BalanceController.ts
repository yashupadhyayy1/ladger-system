import { Request, Response } from 'express';
import { BalanceService } from '../services/BalanceService.js';
import { ValidationError, NotFoundError } from '../models/types.js';
import { Money } from '../utils/money.js';

export class BalanceController {
  private balanceService: BalanceService;

  constructor() {
    this.balanceService = new BalanceService();
  }

  /**
   * GET /accounts/:code/balance
   * Get account balance with optional as_of date
   */
  async getAccountBalance(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const { as_of } = req.query;
      
      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Account code is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      
      const balance = await this.balanceService.getAccountBalance(
        code,
        as_of as string
      );
      
      // Format response with converted amounts for display
      const responseBalance = {
        account_code: balance.account_code,
        account_name: balance.account_name,
        account_type: balance.account_type,
        debits: Money.fromCents(balance.debits),
        credits: Money.fromCents(balance.credits),
        balance: Money.fromCents(balance.balance),
        as_of: as_of || 'current',
      };
      
      res.json({
        success: true,
        data: responseBalance,
        message: 'Account balance retrieved successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /reports/trial-balance
   * Get trial balance report for a date range
   */
  async getTrialBalance(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Both from and to dates are required (YYYY-MM-DD format)',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      
      const trialBalance = await this.balanceService.getTrialBalance(
        from as string,
        to as string
      );
      
      // Format response with converted amounts for display
      const responseTrialBalance = {
        from: trialBalance.from,
        to: trialBalance.to,
        accounts: trialBalance.accounts.map(account => ({
          code: account.account_code,
          name: account.account_name,
          type: account.account_type,
          debits: Money.fromCents(account.debits),
          credits: Money.fromCents(account.credits),
          balance: Money.fromCents(account.balance),
        })),
        totals: {
          debits: Money.fromCents(trialBalance.totals.debits),
          credits: Money.fromCents(trialBalance.totals.credits),
        },
        is_balanced: trialBalance.totals.debits === trialBalance.totals.credits,
      };
      
      res.json({
        success: true,
        data: responseTrialBalance,
        message: 'Trial balance retrieved successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /reports/balance-summary
   * Get balance summary by account type
   */
  async getBalanceSummary(req: Request, res: Response): Promise<void> {
    try {
      const { as_of } = req.query;
      
      const summary = await this.balanceService.getBalanceSummaryByType(
        as_of as string
      );
      
      // Format response with converted amounts for display
      const responseSummary = {
        assets: Money.fromCents(summary.assets),
        liabilities: Money.fromCents(summary.liabilities),
        equity: Money.fromCents(summary.equity),
        revenue: Money.fromCents(summary.revenue),
        expenses: Money.fromCents(summary.expenses),
        net_income: Money.fromCents(summary.netIncome),
        as_of: as_of || 'current',
      };
      
      res.json({
        success: true,
        data: responseSummary,
        message: 'Balance summary retrieved successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /reports/accounting-equation
   * Validate the accounting equation (Assets = Liabilities + Equity)
   */
  async validateAccountingEquation(req: Request, res: Response): Promise<void> {
    try {
      const { as_of } = req.query;
      
      const validation = await this.balanceService.validateAccountingEquation(
        as_of as string
      );
      
      // Format response with converted amounts for display
      const responseValidation = {
        is_valid: validation.isValid,
        assets: Money.fromCents(validation.assets),
        liabilities: Money.fromCents(validation.liabilities),
        equity: Money.fromCents(validation.equity),
        difference: Money.fromCents(validation.difference),
        message: validation.message,
        as_of: as_of || 'current',
      };
      
      res.json({
        success: true,
        data: responseValidation,
        message: 'Accounting equation validation completed',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /accounts
   * Get all account balances (alternative endpoint)
   */
  async getAllAccountBalances(req: Request, res: Response): Promise<void> {
    try {
      const { as_of } = req.query;
      
      const balances = await this.balanceService.getAllAccountBalances(
        as_of as string
      );
      
      // Format response with converted amounts for display
      const responseBalances = balances.map(balance => ({
        account_code: balance.account_code,
        account_name: balance.account_name,
        account_type: balance.account_type,
        debits: Money.fromCents(balance.debits),
        credits: Money.fromCents(balance.credits),
        balance: Money.fromCents(balance.balance),
      }));
      
      res.json({
        success: true,
        data: responseBalances,
        count: responseBalances.length,
        as_of: as_of || 'current',
        message: 'All account balances retrieved successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /accounts/:code/activity
   * Check if an account has any activity
   */
  async checkAccountActivity(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const { as_of } = req.query;
      
      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Account code is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      
      const hasActivity = await this.balanceService.hasAccountActivity(
        code,
        as_of as string
      );
      
      res.json({
        success: true,
        data: {
          account_code: code,
          has_activity: hasActivity,
          as_of: as_of || 'current',
        },
        message: 'Account activity check completed',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Error handling for all balance controller methods
   */
  private handleError(error: unknown, res: Response): void {
    console.error('BalanceController error:', error);

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message,
        code: 'VALIDATION_ERROR',
      });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
        code: 'NOT_FOUND',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while processing your request',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}
