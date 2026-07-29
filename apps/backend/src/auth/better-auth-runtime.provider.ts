import type { drizzleAdapter as createDrizzleAdapter } from '@better-auth/drizzle-adapter';
import type { betterAuth as createBetterAuth } from 'better-auth';
import type { fromNodeHeaders as convertFromNodeHeaders } from 'better-auth/node';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';

import type { RuntimeConfig } from '../config/runtime-config';
import { readRuntimeConfig } from '../config/runtime-config';
import { type Database, DatabaseService } from '../database/database.service';
import * as schema from '../database/schema';
import type { AuthSessionResult } from '../session/auth-session-reader.contract';
import { createBetterAuthConfig } from './better-auth.config';

interface BetterAuthModule {
  betterAuth: typeof createBetterAuth;
}

interface DrizzleAdapterModule {
  drizzleAdapter: typeof createDrizzleAdapter;
}

interface BetterAuthNodeModule {
  fromNodeHeaders: typeof convertFromNodeHeaders;
}
type BetterAuthModuleSpecifier =
  'better-auth' | '@better-auth/drizzle-adapter' | 'better-auth/node';

export type BetterAuthModuleImporter = <T>(specifier: BetterAuthModuleSpecifier) => Promise<T>;

export interface BetterAuthSessionApiResult {
  response: AuthSessionResult | null;
  headers: Headers;
}

export interface BetterAuthRuntime {
  auth: {
    api: {
      getSession(context: {
        headers: Headers;
        returnHeaders: true;
      }): Promise<BetterAuthSessionApiResult | null>;
    };
  };
  fromNodeHeaders(headers: IncomingHttpHeaders): Headers;
}

export abstract class BetterAuthRuntimeProvider {
  abstract getRuntime(): Promise<BetterAuthRuntime>;
}

export interface CreateBetterAuthRuntimeOptions {
  db: Database;
  config: RuntimeConfig;
  importModule?: BetterAuthModuleImporter;
}

const importEsm = new Function('specifier', 'return import(specifier)') as BetterAuthModuleImporter;

@Injectable()
export class DefaultBetterAuthRuntimeProvider
  extends BetterAuthRuntimeProvider
  implements OnModuleInit
{
  private runtimePromise: Promise<BetterAuthRuntime> | null = null;

  constructor(private readonly databaseService: DatabaseService) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.getRuntime();
  }

  getRuntime(): Promise<BetterAuthRuntime> {
    this.runtimePromise ??= this.createRuntime().catch((error: unknown) => {
      this.runtimePromise = null;
      throw error;
    });

    return this.runtimePromise;
  }

  protected createRuntime(): Promise<BetterAuthRuntime> {
    return createBetterAuthRuntime({
      db: this.databaseService.db,
      config: readRuntimeConfig(),
    });
  }
}

export async function createBetterAuthRuntime({
  db,
  config,
  importModule = importEsm,
}: CreateBetterAuthRuntimeOptions): Promise<BetterAuthRuntime> {
  const [betterAuthModule, drizzleAdapterModule, nodeModule] = await Promise.all([
    importModule<BetterAuthModule>('better-auth'),
    importModule<DrizzleAdapterModule>('@better-auth/drizzle-adapter'),
    importModule<BetterAuthNodeModule>('better-auth/node'),
  ]);

  const database = drizzleAdapterModule.drizzleAdapter(db, {
    provider: 'pg',
    schema,
  });

  return {
    auth: betterAuthModule.betterAuth(
      createBetterAuthConfig(database, config),
    ) as BetterAuthRuntime['auth'],
    fromNodeHeaders: nodeModule.fromNodeHeaders,
  };
}
