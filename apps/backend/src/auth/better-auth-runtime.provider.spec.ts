import { describe, expect, it, vi } from 'vitest';

import type { RuntimeConfig } from '../config/runtime-config';
import type { Database, DatabaseService } from '../database/database.service';
import {
  type BetterAuthModuleImporter,
  type BetterAuthRuntime,
  DefaultBetterAuthRuntimeProvider,
  createBetterAuthRuntime,
} from './better-auth-runtime.provider';

describe('createBetterAuthRuntime', () => {
  it('loads Better Auth ESM modules and wires the Drizzle adapter', async () => {
    const db = {} as Database;
    const database = {};
    const auth = {};
    const fromNodeHeaders = () => new Headers();
    const betterAuth = vi.fn(() => auth);
    const drizzleAdapter = vi.fn(() => database);
    const importModule = vi.fn(async (specifier: string) => {
      switch (specifier) {
        case 'better-auth':
          return { betterAuth };
        case '@better-auth/drizzle-adapter':
          return { drizzleAdapter };
        case 'better-auth/node':
          return { fromNodeHeaders };
        default:
          throw new Error(`Unexpected import: ${specifier}`);
      }
    });
    const config: RuntimeConfig = {
      port: 3000,
      frontendOrigins: ['http://localhost:5173'],
      betterAuth: {
        secret: 'test-secret-with-at-least-32-characters',
        baseUrl: 'http://localhost:3000/api/auth',
      },
    };

    const runtime = await createBetterAuthRuntime({
      db,
      config,
      importModule: importModule as BetterAuthModuleImporter,
    });

    expect(importModule).toHaveBeenCalledWith('better-auth');
    expect(importModule).toHaveBeenCalledWith('@better-auth/drizzle-adapter');
    expect(importModule).toHaveBeenCalledWith('better-auth/node');
    expect(drizzleAdapter).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ provider: 'pg' }),
    );
    expect(betterAuth).toHaveBeenCalledWith({
      database,
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
      secret: 'test-secret-with-at-least-32-characters',
      baseURL: 'http://localhost:3000/api/auth',
      trustedOrigins: ['http://localhost:5173'],
    });
    expect(runtime).toEqual({
      auth,
      fromNodeHeaders,
    });
  });
});

describe('DefaultBetterAuthRuntimeProvider', () => {
  it('memoizes a successful runtime initialization', async () => {
    const runtime = createRuntime();
    const loadRuntime = vi.fn(async () => runtime);
    const provider = new TestBetterAuthRuntimeProvider(loadRuntime);

    await expect(
      Promise.all([provider.getRuntime(), provider.getRuntime()]),
    ).resolves.toEqual([runtime, runtime]);
    await expect(provider.getRuntime()).resolves.toBe(runtime);
    expect(loadRuntime).toHaveBeenCalledTimes(1);
  });

  it('retries runtime initialization after a failed attempt', async () => {
    const runtime = createRuntime();
    const loadRuntime = vi
      .fn<() => Promise<BetterAuthRuntime>>()
      .mockRejectedValueOnce(new Error('import failed'))
      .mockResolvedValueOnce(runtime);
    const provider = new TestBetterAuthRuntimeProvider(loadRuntime);

    await expect(provider.getRuntime()).rejects.toThrow('import failed');
    await expect(provider.getRuntime()).resolves.toBe(runtime);
    expect(loadRuntime).toHaveBeenCalledTimes(2);
  });
});

class TestBetterAuthRuntimeProvider extends DefaultBetterAuthRuntimeProvider {
  constructor(
    private readonly loadRuntime: () => Promise<BetterAuthRuntime>,
  ) {
    super({ db: {} as Database } as DatabaseService);
  }

  protected override createRuntime(): Promise<BetterAuthRuntime> {
    return this.loadRuntime();
  }
}

function createRuntime(): BetterAuthRuntime {
  return {
    auth: {
      api: {
        getSession: async () => ({
          response: null,
          headers: new Headers(),
        }),
      },
    },
    fromNodeHeaders: () => new Headers(),
  };
}
