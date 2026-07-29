import type { BetterAuthOptions } from 'better-auth';

import type { RuntimeConfig } from '../config/runtime-config';

type BetterAuthDatabase = NonNullable<BetterAuthOptions['database']>;

export interface CollectifyBetterAuthConfig extends BetterAuthOptions {
  database: BetterAuthDatabase;
  emailAndPassword: {
    enabled: true;
    requireEmailVerification: false;
  };
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
}

export function createBetterAuthConfig(
  database: BetterAuthDatabase,
  config: RuntimeConfig,
): CollectifyBetterAuthConfig {
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
