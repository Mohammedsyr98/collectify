import type { BetterAuthOptions } from 'better-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeConfig } from '../config/runtime-config';
import type { Database } from '../database/database.service';
import * as schema from '../database/schema';
import { createCollectifyBetterAuth } from './better-auth';

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn(),
  databaseAdapter: { adapter: 'database' },
  drizzleAdapter: vi.fn(),
}));

vi.mock('@better-auth/drizzle-adapter', () => ({
  drizzleAdapter: mocks.drizzleAdapter,
}));

vi.mock('better-auth', () => ({
  betterAuth: mocks.betterAuth,
}));

describe('createCollectifyBetterAuth', () => {
  beforeEach(() => {
    mocks.betterAuth.mockReset();
    mocks.drizzleAdapter.mockReset();
    mocks.betterAuth.mockImplementation((options: BetterAuthOptions) => ({
      options,
    }));
    mocks.drizzleAdapter.mockReturnValue(mocks.databaseAdapter);
  });

  it('builds Better Auth with the Drizzle adapter and runtime config', () => {
    const db = {} as Database;
    const runtimeConfig: RuntimeConfig = {
      port: 3000,
      frontendOrigins: [
        'http://localhost:5173',
        'https://collectify.example.test',
      ],
      betterAuth: {
        secret: 'test-secret-with-at-least-32-characters',
        baseUrl: 'http://localhost:3000/api/auth',
      },
    };

    const auth = createCollectifyBetterAuth(db, runtimeConfig);

    expect(mocks.drizzleAdapter).toHaveBeenCalledWith(db, {
      provider: 'pg',
      schema,
    });
    expect(mocks.betterAuth).toHaveBeenCalledWith({
      database: mocks.databaseAdapter,
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
      secret: 'test-secret-with-at-least-32-characters',
      baseURL: 'http://localhost:3000/api/auth',
      trustedOrigins: [
        'http://localhost:5173',
        'https://collectify.example.test',
      ],
    });
    expect(auth).toEqual({
      options: mocks.betterAuth.mock.calls[0]?.[0],
    });
  });
});
