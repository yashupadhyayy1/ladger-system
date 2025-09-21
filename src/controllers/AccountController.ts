import { Request, Response } from 'express';
import { AccountService } from '../services/AccountService.js';
import { CreateAccountRequest, ValidationError, ConflictError, NotFoundError } from '../models/types.js';

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  /**
   * POST /accounts
   * Create a new account
   */
  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountData: CreateAccountRequest = req.body;
      const account = await this.accountService.createAccount(accountData);
      
      res.status(201).json({
        success: true,
        data: account,
        message: 'Account created successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /accounts
   * List all accounts with optional type filter
   */
  async getAccounts(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.query;
      const accounts = await this.accountService.getAllAccounts(
        type as any // Will be validated by the service
      );
      
      res.json({
        success: true,
        data: accounts,
        count: accounts.length,
        message: 'Accounts retrieved successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /accounts/:code
   * Get a specific account by code
   */
  async getAccount(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Account code is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const account = await this.accountService.getAccount(code);
      
      res.json({
        success: true,
        data: account,
        message: 'Account retrieved successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /accounts/:code/info
   * Get detailed account information including normal balance type
   */
  async getAccountInfo(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Account code is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const account = await this.accountService.getAccount(code);
      const normalBalance = this.accountService.getAccountNormalBalance(account.type);
      const canDelete = await this.accountService.canDeleteAccount(code);
      
      res.json({
        success: true,
        data: {
          ...account,
          normal_balance: normalBalance,
          can_delete: canDelete,
        },
        message: 'Account information retrieved successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Error handling for all account controller methods
   */
  private handleError(error: unknown, res: Response): void {
    console.error('AccountController error:', error);

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message,
        code: 'VALIDATION_ERROR',
      });
    } else if (error instanceof ConflictError) {
      res.status(409).json({
        success: false,
        error: 'Conflict Error',
        message: error.message,
        code: 'CONFLICT_ERROR',
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
