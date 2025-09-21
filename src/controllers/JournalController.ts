import { Request, Response } from 'express';
import { JournalService } from '../services/JournalService.js';
import { 
  CreateJournalEntryRequest, 
  ValidationError, 
  ConflictError, 
  NotFoundError 
} from '../models/types.js';

interface RequestWithIdempotency extends Request {
  idempotencyKey?: string;
}

export class JournalController {
  private journalService: JournalService;

  constructor() {
    this.journalService = new JournalService();
  }

  /**
   * POST /journal-entries
   * Create a new journal entry (with idempotency support)
   */
  async createJournalEntry(req: RequestWithIdempotency, res: Response): Promise<void> {
    try {
      const entryData: CreateJournalEntryRequest = req.body;
      const idempotencyKey = req.idempotencyKey;
      
      const journalEntry = await this.journalService.createJournalEntry(
        entryData, 
        idempotencyKey
      );
      
      // Format response with converted amounts for display
      const responseEntry = {
        ...journalEntry,
        lines: journalEntry.lines.map(line => ({
          id: line.id,
          account_code: line.account_code,
          debit: line.debit_cents > 0 ? line.debit_cents / 100 : 0,
          credit: line.credit_cents > 0 ? line.credit_cents / 100 : 0,
          line_index: line.line_index,
        })),
      };
      
      res.status(201).json({
        success: true,
        data: responseEntry,
        message: 'Journal entry created successfully',
        ...(idempotencyKey && { idempotency_key: idempotencyKey }),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /journal-entries/:id
   * Get a specific journal entry by ID
   */
  async getJournalEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Journal entry ID is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const journalEntry = await this.journalService.getJournalEntry(id);
      
      // Format response with converted amounts for display
      const responseEntry = {
        ...journalEntry,
        lines: journalEntry.lines.map(line => ({
          id: line.id,
          account_code: line.account_code,
          debit: line.debit_cents > 0 ? line.debit_cents / 100 : 0,
          credit: line.credit_cents > 0 ? line.credit_cents / 100 : 0,
          line_index: line.line_index,
        })),
      };
      
      res.json({
        success: true,
        data: responseEntry,
        message: 'Journal entry retrieved successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /journal-entries
   * List journal entries with optional pagination
   */
  async getJournalEntries(req: Request, res: Response): Promise<void> {
    try {
      const { limit, offset } = req.query;
      
      const limitNum = limit ? parseInt(limit as string, 10) : undefined;
      const offsetNum = offset ? parseInt(offset as string, 10) : undefined;
      
      // Validate pagination parameters
      if (limitNum !== undefined && (isNaN(limitNum) || limitNum < 1 || limitNum > 100)) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Limit must be a number between 1 and 100',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      
      if (offsetNum !== undefined && (isNaN(offsetNum) || offsetNum < 0)) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Offset must be a non-negative number',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      
      const journalEntries = await this.journalService.getAllJournalEntries(limitNum, offsetNum);
      
      // Format response with converted amounts for display
      const responseEntries = journalEntries.map(entry => ({
        ...entry,
        lines: entry.lines.map(line => ({
          id: line.id,
          account_code: line.account_code,
          debit: line.debit_cents > 0 ? line.debit_cents / 100 : 0,
          credit: line.credit_cents > 0 ? line.credit_cents / 100 : 0,
          line_index: line.line_index,
        })),
      }));
      
      res.json({
        success: true,
        data: responseEntries,
        count: responseEntries.length,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
        },
        message: 'Journal entries retrieved successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * POST /journal-entries/:id/reverse
   * Create a reversal entry for an existing journal entry
   */
  async createReversalEntry(req: RequestWithIdempotency, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { narration, date } = req.body;
      const idempotencyKey = req.idempotencyKey;
      
      if (!narration || typeof narration !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Narration is required for reversal entry',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      
      if (!date || typeof date !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Date is required for reversal entry (YYYY-MM-DD format)',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Original entry ID is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      
      const reversalEntry = await this.journalService.createReversalEntry(
        id,
        narration,
        date,
        idempotencyKey
      );
      
      // Format response with converted amounts for display
      const responseEntry = {
        ...reversalEntry,
        lines: reversalEntry.lines.map(line => ({
          id: line.id,
          account_code: line.account_code,
          debit: line.debit_cents > 0 ? line.debit_cents / 100 : 0,
          credit: line.credit_cents > 0 ? line.credit_cents / 100 : 0,
          line_index: line.line_index,
        })),
      };
      
      res.status(201).json({
        success: true,
        data: responseEntry,
        message: 'Reversal entry created successfully',
        reverses_entry_id: id,
        ...(idempotencyKey && { idempotency_key: idempotencyKey }),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Error handling for all journal controller methods
   */
  private handleError(error: unknown, res: Response): void {
    console.error('JournalController error:', error);

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
