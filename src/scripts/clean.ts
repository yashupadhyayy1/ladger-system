#!/usr/bin/env tsx

import { Database } from '../config/database.js';
import { validateEnv } from '../config/env.js';

// Validate environment before running cleanup
validateEnv();

async function cleanDatabase(): Promise<void> {
  const db = Database.getInstance();
  
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Truncate all tables in the correct order (respecting foreign key constraints)
    await db.query('TRUNCATE idempotency_keys CASCADE');
    console.log('✅ Cleaned idempotency_keys table');
    
    await db.query('TRUNCATE journal_lines CASCADE');
    console.log('✅ Cleaned journal_lines table');
    
    await db.query('TRUNCATE journal_entries CASCADE');
    console.log('✅ Cleaned journal_entries table');
    
    await db.query('TRUNCATE accounts CASCADE');
    console.log('✅ Cleaned accounts table');
    
    await db.query('TRUNCATE api_keys CASCADE');
    console.log('✅ Cleaned api_keys table');
    
    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanDatabase()
    .then(() => {
      console.log('✅ Cleanup process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup process failed:', error);
      process.exit(1);
    });
}

export { cleanDatabase };
