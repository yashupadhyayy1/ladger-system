import { Database } from '../config/database.js';
import { IdempotencyRecord, ConflictError } from '../models/types.js';
import { createHash } from 'crypto';

export class IdempotencyRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async findByKey(key: string): Promise<IdempotencyRecord | null> {
    const result = await this.db.query(
      'SELECT * FROM idempotency_keys WHERE key = $1',
      [key]
    ) as IdempotencyRecord[];

    return result[0] || null;
  }

  async create(key: string, requestBody: unknown, entryId: string): Promise<IdempotencyRecord> {
    const requestHash = this.hashRequest(requestBody);
    
    try {
      const result = await this.db.query(
        `INSERT INTO idempotency_keys (key, request_hash, entry_id, created_at) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
         RETURNING *`,
        [key, requestHash, entryId]
      ) as IdempotencyRecord[];

      return result[0]!;
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictError(`Idempotency key '${key}' already exists`);
      }
      throw error;
    }
  }

  async validateRequest(key: string, requestBody: unknown): Promise<{ isValid: boolean; entryId?: string; message?: string }> {
    const existingRecord = await this.findByKey(key);
    
    if (!existingRecord) {
      return { isValid: true };
    }

    const currentRequestHash = this.hashRequest(requestBody);
    
    if (existingRecord.request_hash === currentRequestHash) {
      // Same request - this is idempotent, return the existing entry
      return { 
        isValid: true, 
        entryId: existingRecord.entry_id 
      };
    } else {
      // Different request with same idempotency key - this is an error
      return { 
        isValid: false, 
        message: `Idempotency key '${key}' already used with different request data` 
      };
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM idempotency_keys WHERE key = $1',
      [key]
    ) as { '1': number }[];

    return result.length > 0;
  }

  /**
   * Clean up old idempotency keys (for maintenance)
   * @param olderThanDays - Remove keys older than this many days
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const result = await this.db.query(
      `DELETE FROM idempotency_keys 
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${olderThanDays} days'
       RETURNING key`
    ) as { key: string }[];

    return result.length;
  }

  /**
   * Hash the request body for comparison
   * @param requestBody - The request body to hash
   * @returns SHA-256 hash of the request
   */
  private hashRequest(requestBody: unknown): string {
    const normalizedBody = JSON.stringify(requestBody, Object.keys(requestBody as object).sort());
    return createHash('sha256').update(normalizedBody).digest('hex');
  }
}

