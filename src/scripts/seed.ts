#!/usr/bin/env tsx

import { Database } from '../config/database.js';
import { validateEnv, ENV } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

// Validate environment before running seed
validateEnv();

interface SeedAccount {
  code: string;
  name: string;
  type: string;
}

const seedAccounts: SeedAccount[] = [
  // Assets
  { code: '1001', name: 'Cash', type: 'Asset' },
  { code: '1002', name: 'Bank', type: 'Asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
  { code: '1200', name: 'Inventory', type: 'Asset' },
  { code: '1500', name: 'Equipment', type: 'Asset' },
  
  // Liabilities
  { code: '2001', name: 'Accounts Payable', type: 'Liability' },
  { code: '2100', name: 'Short-term Loans', type: 'Liability' },
  { code: '2500', name: 'Long-term Debt', type: 'Liability' },
  
  // Equity
  { code: '3001', name: 'Capital', type: 'Equity' },
  { code: '3100', name: 'Retained Earnings', type: 'Equity' },
  
  // Revenue
  { code: '4001', name: 'Sales', type: 'Revenue' },
  { code: '4100', name: 'Service Revenue', type: 'Revenue' },
  { code: '4200', name: 'Interest Income', type: 'Revenue' },
  
  // Expenses
  { code: '5001', name: 'Rent', type: 'Expense' },
  { code: '5100', name: 'Utilities', type: 'Expense' },
  { code: '5200', name: 'Office Supplies', type: 'Expense' },
  { code: '5300', name: 'Marketing', type: 'Expense' },
  { code: '5400', name: 'Travel', type: 'Expense' },
];

async function seedDatabase(): Promise<void> {
  const db = Database.getInstance();
  
  try {
    console.log('🌱 Starting database seed...');
    
    // Check if accounts already exist
    const existingAccounts = await db.query(
      'SELECT COUNT(*) as count FROM accounts'
    ) as { count: string }[];
    
    const accountCount = parseInt(existingAccounts[0]?.count || '0', 10);
    
    if (accountCount > 0) {
      console.log(`⏭️  Accounts already exist (${accountCount} found), skipping account seeding`);
    } else {
      console.log('🔄 Seeding chart of accounts...');
      
      for (const account of seedAccounts) {
        await db.query(
          'INSERT INTO accounts (code, name, type) VALUES ($1, $2, $3)',
          [account.code, account.name, account.type]
        );
        console.log(`✅ Created account: ${account.code} - ${account.name} (${account.type})`);
      }
      
      console.log(`🎉 Successfully created ${seedAccounts.length} accounts`);
    }
    
    // Check if API keys already exist
    const existingApiKeys = await db.query(
      'SELECT COUNT(*) as count FROM api_keys'
    ) as { count: string }[];
    
    const apiKeyCount = parseInt(existingApiKeys[0]?.count || '0', 10);
    
    if (apiKeyCount > 0) {
      console.log(`⏭️  API keys already exist (${apiKeyCount} found), skipping API key seeding`);
    } else {
      console.log('🔄 Seeding API keys...');
      
      for (const apiKey of ENV.API_KEYS) {
        await db.query(
          'INSERT INTO api_keys (key, name, is_active) VALUES ($1, $2, $3)',
          [apiKey, `Development Key - ${apiKey}`, true]
        );
        console.log(`✅ Created API key: ${apiKey}`);
      }
      
      console.log(`🎉 Successfully created ${ENV.API_KEYS.length} API keys`);
    }
    
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seed process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed process failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
module.exports = { seedDatabase };
