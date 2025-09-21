/**
 * Money utility functions for handling currency with integer precision
 * All amounts are stored as integer minor units (cents/paise)
 */

export class Money {
  /**
   * Convert decimal amount to integer cents
   * @param amount - Decimal amount (e.g., 100.50)
   * @returns Integer cents (e.g., 10050)
   */
  static toCents(amount: number): number {
    // Round to avoid floating point precision issues
    return Math.round(amount * 100);
  }

  /**
   * Convert integer cents to decimal amount
   * @param cents - Integer cents (e.g., 10050)
   * @returns Decimal amount (e.g., 100.50)
   */
  static fromCents(cents: number): number {
    return cents / 100;
  }

  /**
   * Add two amounts in cents
   * @param a - First amount in cents
   * @param b - Second amount in cents
   * @returns Sum in cents
   */
  static add(a: number, b: number): number {
    return a + b;
  }

  /**
   * Subtract two amounts in cents
   * @param a - First amount in cents
   * @param b - Second amount in cents
   * @returns Difference in cents
   */
  static subtract(a: number, b: number): number {
    return a - b;
  }

  /**
   * Check if an amount is zero
   * @param cents - Amount in cents
   * @returns True if zero
   */
  static isZero(cents: number): boolean {
    return cents === 0;
  }

  /**
   * Check if an amount is positive
   * @param cents - Amount in cents
   * @returns True if positive
   */
  static isPositive(cents: number): boolean {
    return cents > 0;
  }

  /**
   * Check if an amount is negative
   * @param cents - Amount in cents
   * @returns True if negative
   */
  static isNegative(cents: number): boolean {
    return cents < 0;
  }

  /**
   * Format amount for display
   * @param cents - Amount in cents
   * @param currency - Currency code (default: INR)
   * @returns Formatted string
   */
  static format(cents: number, currency: string = 'INR'): string {
    const amount = Money.fromCents(cents);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Validate that an amount is a valid number
   * @param amount - Amount to validate
   * @returns True if valid
   */
  static isValidAmount(amount: unknown): amount is number {
    return typeof amount === 'number' && 
           !isNaN(amount) && 
           isFinite(amount) && 
           amount >= 0;
  }
}

