#!/usr/bin/env tsx

import { Database } from '../config/database.js';
import { validateEnv } from '../config/env.js';

// Validate environment before running migrations
validateEnv();

const migrations = [
  {
    version: '001',
    name: 'Create accounts table',
    sql: `
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
      CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
    `,
  },
  {
    version: '002',
    name: 'Create journal_entries table',
    sql: `
      CREATE TABLE IF NOT EXISTS journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL,
        narration TEXT NOT NULL,
        posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        reverses_entry_id UUID REFERENCES journal_entries(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_reverses ON journal_entries(reverses_entry_id);
    `,
  },
  {
    version: '003',
    name: 'Create journal_lines table',
    sql: `
      CREATE TABLE IF NOT EXISTS journal_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
        account_id UUID NOT NULL REFERENCES accounts(id),
        debit_cents INTEGER NOT NULL DEFAULT 0 CHECK (debit_cents >= 0),
        credit_cents INTEGER NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
        line_index INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT check_debit_or_credit CHECK (
          (debit_cents > 0 AND credit_cents = 0) OR 
          (debit_cents = 0 AND credit_cents > 0)
        ),
        
        UNIQUE(entry_id, line_index)
      );
      
      CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines(entry_id);
      CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON journal_lines(account_id);
      CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_line ON journal_lines(entry_id, line_index);
    `,
  },
  {
    version: '004',
    name: 'Create idempotency_keys table',
    sql: `
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key VARCHAR(255) PRIMARY KEY,
        request_hash VARCHAR(64) NOT NULL,
        entry_id UUID NOT NULL REFERENCES journal_entries(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_hash ON idempotency_keys(request_hash);
      CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created ON idempotency_keys(created_at);
    `,
  },
  {
    version: '005',
    name: 'Create api_keys table',
    sql: `
      CREATE TABLE IF NOT EXISTS api_keys (
        key VARCHAR(255) PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      );
      
      CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
    `,
  },
  {
    version: '006',
    name: 'Create migration_history table',
    sql: `
      CREATE TABLE IF NOT EXISTS migration_history (
        version VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },
];

async function runMigrations(): Promise<void> {
  const db = Database.getInstance();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    // Create migration history table first
    const migrationHistoryMigration = migrations[migrations.length - 1];
    if (migrationHistoryMigration) {
      await db.query(migrationHistoryMigration.sql);
    }
    
    // Check which migrations have already been run
    const executedMigrations = await db.query(
      'SELECT version FROM migration_history ORDER BY version'
    ) as { version: string }[];
    
    const executedVersions = new Set(executedMigrations.map(m => m.version));
    
    // Run pending migrations
    for (const migration of migrations.slice(0, -1)) {
      if (executedVersions.has(migration.version)) {
        console.log(`⏭️  Skipping migration ${migration.version}: ${migration.name} (already executed)`);
        continue;
      }
      
      console.log(`🚀 Running migration ${migration.version}: ${migration.name}`);
      
      await db.transaction(async (client) => {
        // Execute the migration SQL
        await client.query(migration.sql);
        
        // Record the migration in history
        await client.query(
          'INSERT INTO migration_history (version, name) VALUES ($1, $2)',
          [migration.version, migration.name]
        );
      });
      
      console.log(`✅ Completed migration ${migration.version}`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
module.exports = { runMigrations };
