import Joi from 'joi';
import { ValidationError } from '../models/types.js';
import { AccountType, CreateAccountRequest, CreateJournalEntryRequest } from '../models/types.js';

// Account validation schemas
export const accountSchema = Joi.object<CreateAccountRequest>({
  code: Joi.string()
    .alphanum()
    .min(1)
    .max(20)
    .required()
    .messages({
      'string.alphanum': 'Account code must contain only alphanumeric characters',
      'string.min': 'Account code must be at least 1 character long',
      'string.max': 'Account code must not exceed 20 characters',
    }),
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Account name must be at least 1 character long',
      'string.max': 'Account name must not exceed 100 characters',
    }),
  type: Joi.string()
    .valid('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')
    .required()
    .messages({
      'any.only': 'Account type must be one of: Asset, Liability, Equity, Revenue, Expense',
    }),
});

// Journal entry validation schemas
export const journalLineSchema = Joi.object({
  account_code: Joi.string()
    .alphanum()
    .min(1)
    .max(20)
    .required(),
  debit: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .default(0),
  credit: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .default(0),
}).custom((value, helpers) => {
  const { debit = 0, credit = 0 } = value;
  
  // Exactly one of debit or credit must be > 0
  if (debit > 0 && credit > 0) {
    return helpers.error('custom.bothDebitCredit');
  }
  
  if (debit === 0 && credit === 0) {
    return helpers.error('custom.neitherDebitCredit');
  }
  
  return value;
}, 'debit-credit validation').messages({
  'custom.bothDebitCredit': 'A line cannot have both debit and credit amounts',
  'custom.neitherDebitCredit': 'A line must have either a debit or credit amount',
});

export const journalEntrySchema = Joi.object<CreateJournalEntryRequest>({
  date: Joi.string()
    .isoDate()
    .required()
    .custom((value, helpers) => {
      const entryDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (entryDate > today) {
        return helpers.error('custom.futureDate');
      }
      
      return value;
    }, 'future date validation')
    .messages({
      'custom.futureDate': 'Entry date cannot be in the future',
    }),
  narration: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.min': 'Narration must be at least 1 character long',
      'string.max': 'Narration must not exceed 500 characters',
    }),
  lines: Joi.array()
    .items(journalLineSchema)
    .min(2)
    .required()
    .custom((lines, helpers) => {
      // Calculate total debits and credits in cents
      let totalDebits = 0;
      let totalCredits = 0;
      
      for (const line of lines) {
        const debitCents = Math.round((line.debit || 0) * 100);
        const creditCents = Math.round((line.credit || 0) * 100);
        
        totalDebits += debitCents;
        totalCredits += creditCents;
      }
      
      // Check if debits equal credits
      if (totalDebits !== totalCredits) {
        return helpers.error('custom.unbalanced', { 
          totalDebits: totalDebits / 100, 
          totalCredits: totalCredits / 100 
        });
      }
      
      // Check if total is greater than zero
      if (totalDebits === 0) {
        return helpers.error('custom.zeroAmount');
      }
      
      return lines;
    }, 'double-entry validation')
    .messages({
      'array.min': 'At least 2 lines are required for a journal entry',
      'custom.unbalanced': 'Total debits ({{#totalDebits}}) must equal total credits ({{#totalCredits}})',
      'custom.zeroAmount': 'Total amount must be greater than zero',
    }),
  reverses_entry_id: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Reverses entry ID must be a valid UUID',
    }),
});

// Query parameter validation
export const balanceQuerySchema = Joi.object({
  as_of: Joi.string()
    .isoDate()
    .optional()
    .messages({
      'string.isoDate': 'as_of must be a valid ISO date (YYYY-MM-DD)',
    }),
});

export const trialBalanceQuerySchema = Joi.object({
  from: Joi.string()
    .isoDate()
    .required()
    .messages({
      'string.isoDate': 'from must be a valid ISO date (YYYY-MM-DD)',
    }),
  to: Joi.string()
    .isoDate()
    .required()
    .custom((value, helpers) => {
      const { from } = helpers.state.ancestors[0];
      if (from && new Date(value) < new Date(from)) {
        return helpers.error('custom.invalidDateRange');
      }
      return value;
    }, 'date range validation')
    .messages({
      'string.isoDate': 'to must be a valid ISO date (YYYY-MM-DD)',
      'custom.invalidDateRange': 'to date must be greater than or equal to from date',
    }),
});

export const accountTypeFilterSchema = Joi.object({
  type: Joi.string()
    .valid('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')
    .optional()
    .messages({
      'any.only': 'type must be one of: Asset, Liability, Equity, Revenue, Expense',
    }),
});

// Utility function to validate and sanitize input
export function validateInput<T>(schema: Joi.ObjectSchema<T>, data: unknown): T {
  const { error, value } = schema.validate(data, { 
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });
  
  if (error) {
    const messages = error.details.map(detail => detail.message).join(', ');
    throw new ValidationError(messages);
  }
  
  return value;
}

