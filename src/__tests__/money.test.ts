/**
 * Money Utility Test Suite
 * 
 * Tests the Money utility class to prove that our approach
 * handles precision correctly and avoids floating point errors
 */

import { Money } from '../utils/money';

describe('Money Utility Tests', () => {
  describe('Conversion Functions', () => {
    test('should convert decimal amounts to cents correctly', () => {
      expect(Money.toCents(0)).toBe(0);
      expect(Money.toCents(1)).toBe(100);
      expect(Money.toCents(1.5)).toBe(150);
      expect(Money.toCents(123.45)).toBe(12345);
      expect(Money.toCents(999.99)).toBe(99999);
      expect(Money.toCents(0.01)).toBe(1);
    });

    test('should convert cents to decimal amounts correctly', () => {
      expect(Money.fromCents(0)).toBe(0);
      expect(Money.fromCents(100)).toBe(1);
      expect(Money.fromCents(150)).toBe(1.5);
      expect(Money.fromCents(12345)).toBe(123.45);
      expect(Money.fromCents(99999)).toBe(999.99);
      expect(Money.fromCents(1)).toBe(0.01);
    });

    test('should handle round-trip conversions without loss', () => {
      const testAmounts = [0, 0.01, 1, 1.5, 123.45, 999.99, 1000, 9999.99];
      
      for (const amount of testAmounts) {
        const cents = Money.toCents(amount);
        const backToDecimal = Money.fromCents(cents);
        expect(backToDecimal).toBe(amount);
      }
    });
  });

  describe('Arithmetic Operations', () => {
    test('should add amounts correctly', () => {
      expect(Money.add(100, 50)).toBe(150);
      expect(Money.add(12345, 6789)).toBe(19134);
      expect(Money.add(0, 100)).toBe(100);
      expect(Money.add(100, 0)).toBe(100);
    });

    test('should subtract amounts correctly', () => {
      expect(Money.subtract(150, 50)).toBe(100);
      expect(Money.subtract(12345, 6789)).toBe(5556);
      expect(Money.subtract(100, 100)).toBe(0);
      expect(Money.subtract(100, 0)).toBe(100);
    });

    test('should handle negative results from subtraction', () => {
      expect(Money.subtract(50, 100)).toBe(-50);
      expect(Money.subtract(0, 100)).toBe(-100);
    });
  });

  describe('Comparison Functions', () => {
    test('should correctly identify zero amounts', () => {
      expect(Money.isZero(0)).toBe(true);
      expect(Money.isZero(1)).toBe(false);
      expect(Money.isZero(-1)).toBe(false);
      expect(Money.isZero(100)).toBe(false);
    });

    test('should correctly identify positive amounts', () => {
      expect(Money.isPositive(1)).toBe(true);
      expect(Money.isPositive(100)).toBe(true);
      expect(Money.isPositive(0)).toBe(false);
      expect(Money.isPositive(-1)).toBe(false);
    });

    test('should correctly identify negative amounts', () => {
      expect(Money.isNegative(-1)).toBe(true);
      expect(Money.isNegative(-100)).toBe(true);
      expect(Money.isNegative(0)).toBe(false);
      expect(Money.isNegative(1)).toBe(false);
    });
  });

  describe('Validation Functions', () => {
    test('should validate valid amounts', () => {
      expect(Money.isValidAmount(0)).toBe(true);
      expect(Money.isValidAmount(1)).toBe(true);
      expect(Money.isValidAmount(123.45)).toBe(true);
      expect(Money.isValidAmount(999999)).toBe(true);
    });

    test('should reject invalid amounts', () => {
      expect(Money.isValidAmount(-1)).toBe(false);
      expect(Money.isValidAmount(NaN)).toBe(false);
      expect(Money.isValidAmount(Infinity)).toBe(false);
      expect(Money.isValidAmount(-Infinity)).toBe(false);
      expect(Money.isValidAmount('123')).toBe(false);
      expect(Money.isValidAmount(null)).toBe(false);
      expect(Money.isValidAmount(undefined)).toBe(false);
    });
  });

  describe('Formatting Functions', () => {
    test('should format amounts in INR correctly', () => {
      expect(Money.format(10000, 'INR')).toContain('100.00');
      expect(Money.format(12345, 'INR')).toContain('123.45');
      expect(Money.format(0, 'INR')).toContain('0.00');
    });

    test('should format amounts with default currency', () => {
      const formatted = Money.format(10000);
      expect(formatted).toContain('100.00');
      expect(typeof formatted).toBe('string');
    });
  });

  describe('Floating Point Precision Issues Prevention', () => {
    test('should avoid the classic 0.1 + 0.2 !== 0.3 problem', () => {
      // Classic floating point issue: 0.1 + 0.2 !== 0.3
      expect(0.1 + 0.2 === 0.3).toBe(false); // This fails with pure floats
      
      // Our Money utility should handle this correctly
      const cents1 = Money.toCents(0.1);
      const cents2 = Money.toCents(0.2);
      const sum = Money.add(cents1, cents2);
      const result = Money.fromCents(sum);
      
      expect(result).toBe(0.3); // This should pass
      expect(result === 0.3).toBe(true); // This should also pass
    });

    test('should handle complex decimal arithmetic correctly', () => {
      // Test a complex scenario that often causes precision issues
      const amounts = [0.1, 0.2, 0.3, 0.4, 0.5];
      let totalCents = 0;
      
      for (const amount of amounts) {
        totalCents = Money.add(totalCents, Money.toCents(amount));
      }
      
      const result = Money.fromCents(totalCents);
      expect(result).toBe(1.5);
      
      // Compare with pure floating point arithmetic (which would fail)
      const floatResult = amounts.reduce((sum, amount) => sum + amount, 0);
      // floatResult might be 1.4999999999999998 instead of 1.5
      
      // Our integer-based approach should be exact
      expect(result).toBe(1.5);
    });

    test('should handle rounding edge cases', () => {
      // Test amounts that are commonly problematic for floating point
      const problematicAmounts = [
        1.005, // Often rounds incorrectly
        2.555, // Another rounding edge case
        123.445, // Three decimal places
        999.999, // Many nines
      ];
      
      for (const amount of problematicAmounts) {
        const rounded = Math.round(amount * 100) / 100; // Manual rounding
        const viaCents = Money.fromCents(Money.toCents(rounded));
        
        // Should be consistent
        expect(viaCents).toBe(rounded);
      }
    });

    test('should maintain precision in complex calculations', () => {
      // Simulate a real-world scenario: calculating tax
      const subtotal = 123.45;
      const taxRate = 0.08; // 8%
      
      // Calculate tax using our Money utility
      const subtotalCents = Money.toCents(subtotal);
      const taxCents = Math.round(subtotalCents * taxRate); // Round tax to nearest cent
      const totalCents = Money.add(subtotalCents, taxCents);
      
      const calculatedTax = Money.fromCents(taxCents);
      const calculatedTotal = Money.fromCents(totalCents);
      
      // Verify the calculation makes sense
      expect(calculatedTax).toBe(9.88); // 123.45 * 0.08 = 9.876, rounded to 9.88
      expect(calculatedTotal).toBe(133.33); // 123.45 + 9.88 = 133.33
      
      // Verify precision is maintained
      expect(Money.toCents(calculatedTotal)).toBe(subtotalCents + taxCents);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle zero amounts correctly', () => {
      expect(Money.toCents(0)).toBe(0);
      expect(Money.fromCents(0)).toBe(0);
      expect(Money.add(0, 0)).toBe(0);
      expect(Money.subtract(0, 0)).toBe(0);
    });

    test('should handle very small amounts (1 cent)', () => {
      expect(Money.toCents(0.01)).toBe(1);
      expect(Money.fromCents(1)).toBe(0.01);
      expect(Money.add(1, 1)).toBe(2);
      expect(Money.subtract(2, 1)).toBe(1);
    });

    test('should handle very large amounts', () => {
      const largeAmount = 999999.99;
      const largeCents = 99999999;
      
      expect(Money.toCents(largeAmount)).toBe(largeCents);
      expect(Money.fromCents(largeCents)).toBe(largeAmount);
    });

    test('should round half-cents correctly when converting to cents', () => {
      // 123.455 has 3 decimal places, should round to 123.46
      expect(Money.toCents(123.455)).toBe(12346);
      
      // 123.454 should round to 123.45
      expect(Money.toCents(123.454)).toBe(12345);
    });
  });
});

