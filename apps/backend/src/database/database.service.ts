import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export type Database = NodePgDatabase;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  readonly db: Database;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required to initialize the database.');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
    });
    this.db = drizzle({ client: this.pool });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
