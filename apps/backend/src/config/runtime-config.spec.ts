import { describe, expect, it } from 'vitest';

import { readRuntimeConfig } from './runtime-config';

describe('readRuntimeConfig', () => {
  it('reads backend runtime configuration from env', () => {
    const config = readRuntimeConfig({
      PORT: '4000',
      BETTER_AUTH_SECRET: 'test-secret-with-at-least-32-characters',
      BETTER_AUTH_URL: 'http://localhost:4000/api/auth',
      FRONTEND_ORIGIN: 'http://localhost:5173, https://collectify.example.test ',
    });

    expect(config).toEqual({
      port: 4000,
      frontendOrigins: [
        'http://localhost:5173',
        'https://collectify.example.test',
      ],
      betterAuth: {
        secret: 'test-secret-with-at-least-32-characters',
        baseUrl: 'http://localhost:4000/api/auth',
      },
    });
  });

  it('uses local development defaults', () => {
    const config = readRuntimeConfig({});

    expect(config).toEqual({
      port: 3000,
      frontendOrigins: ['http://localhost:5173'],
      betterAuth: {
        secret: 'collectify-dev-auth-secret-change-before-production',
        baseUrl: 'http://localhost:3000/api/auth',
      },
    });
  });

  it('requires an explicit Better Auth secret in production', () => {
    expect(() => readRuntimeConfig({ NODE_ENV: 'production' })).toThrow(
      'BETTER_AUTH_SECRET is required in production.',
    );
  });
});
