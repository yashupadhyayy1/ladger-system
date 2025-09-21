import { IdempotencyRepository } from '../repositories/IdempotencyRepository.js';
import { IdempotencyRecord, ConflictError } from '../models/types.js';

export class IdempotencyService {
  private idempotencyRepository: IdempotencyRepository;

  constructor() {
    this.idempotencyRepository = new IdempotencyRepository();
  }

  async validateRequest(key: string, requestBody: unknown): Promise<{
    isValid: boolean;
    entryId?: string;
    message?: string;
  }> {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('Idempotency key is required and must be a non-empty string');
    }

    return await this.idempotencyRepository.validateRequest(key, requestBody);
  }

  async recordRequest(key: string, requestBody: unknown, entryId: string): Promise<IdempotencyRecord> {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('Idempotency key is required and must be a non-empty string');
    }

    if (!entryId || typeof entryId !== 'string' || entryId.trim().length === 0) {
      throw new Error('Entry ID is required and must be a non-empty string');
    }

    return await this.idempotencyRepository.create(key, requestBody, entryId);
  }

  async getByKey(key: string): Promise<IdempotencyRecord | null> {
    if (!key || typeof key !== 'string') {
      return null;
    }

    return await this.idempotencyRepository.findByKey(key);
  }

  async keyExists(key: string): Promise<boolean> {
    if (!key || typeof key !== 'string') {
      return false;
    }

    return await this.idempotencyRepository.exists(key);
  }

  /**
   * Clean up old idempotency records for maintenance
   * @param olderThanDays - Remove records older than this many days (default: 30)
   * @returns Number of records deleted
   */
  async cleanupOldRecords(olderThanDays: number = 30): Promise<number> {
    if (olderThanDays < 1) {
      throw new Error('olderThanDays must be at least 1');
    }

    return await this.idempotencyRepository.cleanup(olderThanDays);
  }

  /**
   * Validate idempotency key format
   * Idempotency keys should be:
   * - Between 1 and 255 characters
   * - Contain only alphanumeric characters, hyphens, and underscores
   */
  validateIdempotencyKeyFormat(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // Check length
    if (key.length < 1 || key.length > 255) {
      return false;
    }

    // Check format (alphanumeric, hyphens, underscores only)
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(key);
  }

  /**
   * Generate a sample idempotency key for testing/documentation
   * In production, clients should generate their own unique keys
   */
  generateSampleKey(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `sample-${timestamp}-${random}`;
  }
}

