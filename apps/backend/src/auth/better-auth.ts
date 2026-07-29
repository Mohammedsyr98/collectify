import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth, type BetterAuthOptions } from 'better-auth';

import { readRuntimeConfig, type RuntimeConfig } from '../config/runtime-config';
import type { Database } from '../database/database.service';
import * as schema from '../database/schema';

type BetterAuthDatabase = NonNullable<BetterAuthOptions['database']>;

interface CollectifyBetterAuthOptions extends BetterAuthOptions {
  database: BetterAuthDatabase;
  emailAndPassword: {
    enabled: true;
    requireEmailVerification: false;
  };
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
}

export function createCollectifyBetterAuth(
  db: Database,
  config: RuntimeConfig = readRuntimeConfig(),
) {
  const database = drizzleAdapter(db, {
    provider: 'pg',
    schema,
  });

  return betterAuth(createCollectifyBetterAuthOptions(database, config));
}

export type CollectifyBetterAuth = ReturnType<
  typeof createCollectifyBetterAuth
>;

function createCollectifyBetterAuthOptions(
  database: BetterAuthDatabase,
  config: RuntimeConfig,
): CollectifyBetterAuthOptions {
  return {
    database,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    secret: config.betterAuth.secret,
    baseURL: config.betterAuth.baseUrl,
    trustedOrigins: config.frontendOrigins,
  };
}
