import { Database } from '../config/database.js';
import { 
  JournalEntry, 
  JournalLine, 
  CreateJournalEntryRequest, 
  CreateJournalLineRequest,
  NotFoundError,
  Account
} from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';
import { Money } from '../utils/money.js';

export class JournalRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(
    entryData: CreateJournalEntryRequest, 
    accounts: Account[]
  ): Promise<JournalEntry> {
    return await this.db.transaction(async (client) => {
      const entryId = uuidv4();
      
      // Create the journal entry
      const entryResult = await client.query(
        `INSERT INTO journal_entries (id, date, narration, reverses_entry_id, posted_at) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
         RETURNING *`,
        [entryId, entryData.date, entryData.narration, entryData.reverses_entry_id || null]
      );

      const journalEntry = entryResult.rows[0] as JournalEntry;

      // Create account lookup map
      const accountMap = new Map<string, Account>();
      accounts.forEach(account => {
        accountMap.set(account.code, account);
      });

      // Create journal lines
      const lines: JournalLine[] = [];
      for (let i = 0; i < entryData.lines.length; i++) {
        const lineData = entryData.lines[i]!;
        const account = accountMap.get(lineData.account_code)!;
        
        const lineId = uuidv4();
        const debitCents = Money.toCents(lineData.debit || 0);
        const creditCents = Money.toCents(lineData.credit || 0);

        const lineResult = await client.query(
          `INSERT INTO journal_lines 
           (id, entry_id, account_id, debit_cents, credit_cents, line_index) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`,
          [lineId, entryId, account.id, debitCents, creditCents, i]
        );

        const line = lineResult.rows[0] as JournalLine;
        line.account_code = account.code;
        lines.push(line);
      }

      journalEntry.lines = lines;
      return journalEntry;
    });
  }

  async findById(id: string): Promise<JournalEntry | null> {
    // Get the journal entry
    const entryResult = await this.db.query(
      'SELECT * FROM journal_entries WHERE id = $1',
      [id]
    ) as JournalEntry[];

    if (entryResult.length === 0) {
      return null;
    }

    const entry = entryResult[0]!;

    // Get the journal lines with account information
    const linesResult = await this.db.query(
      `SELECT jl.*, a.code as account_code 
       FROM journal_lines jl
       JOIN accounts a ON jl.account_id = a.id
       WHERE jl.entry_id = $1
       ORDER BY jl.line_index`,
      [id]
    ) as JournalLine[];

    entry.lines = linesResult;
    return entry;
  }

  async findAll(limit?: number, offset?: number): Promise<JournalEntry[]> {
    let query = `
      SELECT je.*, 
             json_agg(
               json_build_object(
                 'id', jl.id,
                 'entry_id', jl.entry_id,
                 'account_id', jl.account_id,
                 'account_code', a.code,
                 'debit_cents', jl.debit_cents,
                 'credit_cents', jl.credit_cents,
                 'line_index', jl.line_index
               ) ORDER BY jl.line_index
             ) as lines
      FROM journal_entries je
      LEFT JOIN journal_lines jl ON je.id = jl.entry_id
      LEFT JOIN accounts a ON jl.account_id = a.id
      GROUP BY je.id
      ORDER BY je.date DESC, je.posted_at DESC
    `;

    const params: number[] = [];
    
    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }
    
    if (offset) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await this.db.query(query, params) as (JournalEntry & { lines: string })[];
    
    return result.map(entry => ({
      ...entry,
      lines: JSON.parse(entry.lines) as JournalLine[]
    }));
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM journal_entries WHERE id = $1',
      [id]
    ) as { '1': number }[];

    return result.length > 0;
  }

  async findByDateRange(from: Date, to: Date): Promise<JournalEntry[]> {
    const result = await this.db.query(
      `SELECT je.*, 
             json_agg(
               json_build_object(
                 'id', jl.id,
                 'entry_id', jl.entry_id,
                 'account_id', jl.account_id,
                 'account_code', a.code,
                 'debit_cents', jl.debit_cents,
                 'credit_cents', jl.credit_cents,
                 'line_index', jl.line_index
               ) ORDER BY jl.line_index
             ) as lines
       FROM journal_entries je
       LEFT JOIN journal_lines jl ON je.id = jl.entry_id
       LEFT JOIN accounts a ON jl.account_id = a.id
       WHERE je.date >= $1 AND je.date <= $2
       GROUP BY je.id
       ORDER BY je.date, je.posted_at`,
      [from, to]
    ) as (JournalEntry & { lines: string })[];

    return result.map(entry => ({
      ...entry,
      lines: JSON.parse(entry.lines) as JournalLine[]
    }));
  }
}

