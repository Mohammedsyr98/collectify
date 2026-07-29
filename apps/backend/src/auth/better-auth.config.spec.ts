import { describe, expect, it } from 'vitest';

import type { RuntimeConfig } from '../config/runtime-config';
import { createBetterAuthConfig } from './better-auth.config';

describe('createBetterAuthConfig', () => {
  it('maps backend config into Better Auth config', () => {
    const database = {};
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

    const config = createBetterAuthConfig(database, runtimeConfig);

    expect(config).toEqual({
      database,
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
  });
});
