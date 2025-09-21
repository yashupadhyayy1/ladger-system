import { Database } from '../config/database.js';
import { Account, AccountType, CreateAccountRequest, NotFoundError, ConflictError } from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

export class AccountRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(accountData: CreateAccountRequest): Promise<Account> {
    try {
      const id = uuidv4();
      
      const result = await this.db.query(
        `INSERT INTO accounts (id, code, name, type, created_at) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
         RETURNING *`,
        [id, accountData.code, accountData.name, accountData.type]
      ) as Account[];

      return result[0]!;
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictError(`Account with code '${accountData.code}' already exists`);
      }
      throw error;
    }
  }

  async findByCode(code: string): Promise<Account | null> {
    const result = await this.db.query(
      'SELECT * FROM accounts WHERE code = $1',
      [code]
    ) as Account[];

    return result[0] || null;
  }

  async findById(id: string): Promise<Account | null> {
    const result = await this.db.query(
      'SELECT * FROM accounts WHERE id = $1',
      [id]
    ) as Account[];

    return result[0] || null;
  }

  async findAll(type?: AccountType): Promise<Account[]> {
    let query = 'SELECT * FROM accounts';
    const params: string[] = [];

    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }

    query += ' ORDER BY code';

    const result = await this.db.query(query, params) as Account[];
    return result;
  }

  async exists(code: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM accounts WHERE code = $1',
      [code]
    ) as { '1': number }[];

    return result.length > 0;
  }

  async getAccountsByCodesWithValidation(codes: string[]): Promise<Account[]> {
    if (codes.length === 0) {
      return [];
    }

    const placeholders = codes.map((_, index) => `$${index + 1}`).join(',');
    const result = await this.db.query(
      `SELECT * FROM accounts WHERE code IN (${placeholders})`,
      codes
    ) as Account[];

    // Check if all accounts were found
    const foundCodes = result.map(account => account.code);
    const missingCodes = codes.filter(code => !foundCodes.includes(code));

    if (missingCodes.length > 0) {
      throw new NotFoundError(`Accounts not found: ${missingCodes.join(', ')}`);
    }

    return result;
  }

  async hasTransactions(accountId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM journal_lines WHERE account_id = $1 LIMIT 1',
      [accountId]
    ) as { '1': number }[];

    return result.length > 0;
  }
}

