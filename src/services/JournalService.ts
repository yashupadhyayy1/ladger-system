import { JournalRepository } from '../repositories/JournalRepository.js';
import { AccountService } from './AccountService.js';
import { IdempotencyService } from './IdempotencyService.js';
import { 
  JournalEntry, 
  CreateJournalEntryRequest, 
  ValidationError, 
  NotFoundError,
  ConflictError
} from '../models/types.js';
import { validateInput, journalEntrySchema } from '../utils/validation.js';
import { Money } from '../utils/money.js';

export class JournalService {
  private journalRepository: JournalRepository;
  private accountService: AccountService;
  private idempotencyService: IdempotencyService;

  constructor() {
    this.journalRepository = new JournalRepository();
    this.accountService = new AccountService();
    this.idempotencyService = new IdempotencyService();
  }

  async createJournalEntry(
    entryData: CreateJournalEntryRequest, 
    idempotencyKey?: string
  ): Promise<JournalEntry> {
    // Validate input
    const validatedData = validateInput(journalEntrySchema, entryData);

    // Handle idempotency if key is provided
    if (idempotencyKey) {
      const idempotencyCheck = await this.idempotencyService.validateRequest(
        idempotencyKey, 
        validatedData
      );

      if (!idempotencyCheck.isValid) {
        throw new ConflictError(idempotencyCheck.message!);
      }

      // If this is a duplicate request, return the existing entry
      if (idempotencyCheck.entryId) {
        const existingEntry = await this.journalRepository.findById(idempotencyCheck.entryId);
        if (existingEntry) {
          return existingEntry;
        }
      }
    }

    // Validate that all referenced accounts exist
    const accountCodes = validatedData.lines.map(line => line.account_code);
    const accounts = await this.accountService.validateAccountsExist(accountCodes);

    // Validate reversal entry if specified
    if (validatedData.reverses_entry_id) {
      const reversedEntry = await this.journalRepository.findById(validatedData.reverses_entry_id);
      if (!reversedEntry) {
        throw new ValidationError(`Reversed entry with ID '${validatedData.reverses_entry_id}' not found`);
      }
    }

    // Additional business rule validations
    this.validateDoubleEntryRules(validatedData);

    // Create the journal entry
    const createdEntry = await this.journalRepository.create(validatedData, accounts);

    // Record idempotency if key was provided
    if (idempotencyKey) {
      await this.idempotencyService.recordRequest(idempotencyKey, validatedData, createdEntry.id);
    }

    return createdEntry;
  }

  async getJournalEntry(id: string): Promise<JournalEntry> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Journal entry ID is required');
    }

    const entry = await this.journalRepository.findById(id);
    if (!entry) {
      throw new NotFoundError(`Journal entry with ID '${id}' not found`);
    }

    return entry;
  }

  async getAllJournalEntries(limit?: number, offset?: number): Promise<JournalEntry[]> {
    return await this.journalRepository.findAll(limit, offset);
  }

  async getJournalEntriesByDateRange(from: Date, to: Date): Promise<JournalEntry[]> {
    if (from > to) {
      throw new ValidationError('From date must be before or equal to to date');
    }

    return await this.journalRepository.findByDateRange(from, to);
  }

  /**
   * Validate double-entry bookkeeping rules
   */
  private validateDoubleEntryRules(entryData: CreateJournalEntryRequest): void {
    // Calculate total debits and credits in cents to avoid floating point issues
    let totalDebits = 0;
    let totalCredits = 0;
    const accountCodes = new Set<string>();

    for (const line of entryData.lines) {
      const debitCents = Money.toCents(line.debit || 0);
      const creditCents = Money.toCents(line.credit || 0);

      totalDebits += debitCents;
      totalCredits += creditCents;

      // Check for duplicate accounts in the same entry
      if (accountCodes.has(line.account_code)) {
        throw new ValidationError(
          `Account '${line.account_code}' appears multiple times in the same entry. ` +
          `This is not allowed in our ledger system.`
        );
      }
      accountCodes.add(line.account_code);

      // Validate amounts are non-negative
      if (debitCents < 0 || creditCents < 0) {
        throw new ValidationError('Debit and credit amounts must be non-negative');
      }

      // Validate exactly one of debit or credit is positive
      if (debitCents > 0 && creditCents > 0) {
        throw new ValidationError(
          `Line for account '${line.account_code}' has both debit and credit amounts. ` +
          `Each line must have either a debit OR a credit amount, not both.`
        );
      }

      if (debitCents === 0 && creditCents === 0) {
        throw new ValidationError(
          `Line for account '${line.account_code}' has zero amount. ` +
          `Each line must have either a debit or credit amount greater than zero.`
        );
      }
    }

    // Validate the fundamental double-entry rule: debits = credits
    if (totalDebits !== totalCredits) {
      throw new ValidationError(
        `Entry is not balanced. Total debits (${Money.fromCents(totalDebits)}) ` +
        `must equal total credits (${Money.fromCents(totalCredits)})`
      );
    }

    // Validate entry has a positive total amount
    if (totalDebits === 0) {
      throw new ValidationError('Journal entry must have a total amount greater than zero');
    }

    // Validate minimum number of lines
    if (entryData.lines.length < 2) {
      throw new ValidationError('Journal entry must have at least 2 lines');
    }
  }

  /**
   * Create a reversal entry that negates an existing entry
   */
  async createReversalEntry(
    originalEntryId: string,
    narration: string,
    reversalDate: string,
    idempotencyKey?: string
  ): Promise<JournalEntry> {
    // Get the original entry
    const originalEntry = await this.getJournalEntry(originalEntryId);

    // Create reversal lines (flip debits and credits)
    const reversalLines = originalEntry.lines.map(line => ({
      account_code: line.account_code,
      debit: Money.fromCents(line.credit_cents),
      credit: Money.fromCents(line.debit_cents),
    }));

    const reversalEntryData: CreateJournalEntryRequest = {
      date: reversalDate,
      narration,
      lines: reversalLines,
      reverses_entry_id: originalEntryId,
    };

    return await this.createJournalEntry(reversalEntryData, idempotencyKey);
  }
}

