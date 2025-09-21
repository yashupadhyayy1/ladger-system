import { config } from 'dotenv';

// Load environment variables
config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://ledger_user:ledger_password@localhost:5432/ledger_db',
  API_KEYS: process.env.API_KEYS?.split(',') || ['dev-key-1', 'dev-key-2', 'admin-key-123'],
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'INR',
  TIMEZONE: process.env.TIMEZONE || 'UTC',
} as const;

// Validate required environment variables
export function validateEnv(): void {
  const required = ['DATABASE_URL'];
  
  for (const key of required) {
    if (!process.env[key] && !ENV[key as keyof typeof ENV]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

