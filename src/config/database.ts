import { Pool, PoolConfig } from 'pg';

export interface DatabaseConfig extends PoolConfig {
  connectionString?: string;
}

export class Database {
  private static instance: Database;
  private pool: Pool;
  private isClosing: boolean = false;

  private constructor() {
    const config: DatabaseConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public static resetInstance(): void {
    if (Database.instance) {
      Database.instance.isClosing = true;
      Database.instance = null as any;
    }
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async query(text: string, params?: unknown[]): Promise<unknown[]> {
    if (this.isClosing || this.pool.ended) {
      throw new Error('Database connection is closed');
    }
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    if (this.isClosing || this.pool.ended) {
      return;
    }
    
    this.isClosing = true;
    try {
      await this.pool.end();
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
}

