import { AccountRepository } from '../repositories/AccountRepository.js';
import { Account, AccountType, CreateAccountRequest, ValidationError } from '../models/types.js';
import { validateInput, accountSchema, accountTypeFilterSchema } from '../utils/validation.js';

export class AccountService {
  private accountRepository: AccountRepository;

  constructor() {
    this.accountRepository = new AccountRepository();
  }

  async createAccount(accountData: CreateAccountRequest): Promise<Account> {
    // Validate input
    const validatedData = validateInput(accountSchema, accountData);
    
    // Check if account code already exists
    const existingAccount = await this.accountRepository.findByCode(validatedData.code);
    if (existingAccount) {
      throw new ValidationError(`Account with code '${validatedData.code}' already exists`);
    }

    // Create the account
    return await this.accountRepository.create(validatedData);
  }

  async getAccount(code: string): Promise<Account> {
    if (!code || typeof code !== 'string') {
      throw new ValidationError('Account code is required');
    }

    const account = await this.accountRepository.findByCode(code);
    if (!account) {
      throw new ValidationError(`Account with code '${code}' not found`);
    }

    return account;
  }

  async getAllAccounts(type?: AccountType): Promise<Account[]> {
    // Validate type filter if provided
    if (type) {
      validateInput(accountTypeFilterSchema, { type });
    }

    return await this.accountRepository.findAll(type);
  }

  async validateAccountsExist(accountCodes: string[]): Promise<Account[]> {
    if (!accountCodes || accountCodes.length === 0) {
      throw new ValidationError('At least one account code is required');
    }

    // Remove duplicates and validate format
    const uniqueCodes = [...new Set(accountCodes)];
    
    for (const code of uniqueCodes) {
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        throw new ValidationError(`Invalid account code: '${code}'`);
      }
    }

    // Get accounts and validate they all exist
    return await this.accountRepository.getAccountsByCodesWithValidation(uniqueCodes);
  }

  /**
   * Get the normal balance type for an account
   * - Assets and Expenses are debit-normal (increase with debits)
   * - Liabilities, Equity, and Revenue are credit-normal (increase with credits)
   */
  getAccountNormalBalance(accountType: AccountType): 'debit' | 'credit' {
    switch (accountType) {
      case 'Asset':
      case 'Expense':
        return 'debit';
      case 'Liability':
      case 'Equity':
      case 'Revenue':
        return 'credit';
      default:
        throw new ValidationError(`Unknown account type: ${accountType}`);
    }
  }

  /**
   * Check if an account can be deleted
   * Accounts with existing transactions cannot be deleted
   */
  async canDeleteAccount(code: string): Promise<boolean> {
    const account = await this.getAccount(code);
    return !(await this.accountRepository.hasTransactions(account.id));
  }

  /**
   * Validate that account codes exist and return them in a map for quick lookup
   */
  async getAccountMapBycodes(codes: string[]): Promise<Map<string, Account>> {
    const accounts = await this.validateAccountsExist(codes);
    const accountMap = new Map<string, Account>();
    
    accounts.forEach(account => {
      accountMap.set(account.code, account);
    });
    
    return accountMap;
  }
}

