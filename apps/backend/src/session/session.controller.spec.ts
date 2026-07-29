import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { HealthController } from '../health.controller';
import { AUTH_SESSION_READER } from './auth-session-reader.contract';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

describe('SessionController', () => {
  let app: INestApplication | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
  });

  it('exposes a public signed-out session probe', async () => {
    const signedOutSession = {
      authenticated: false,
      user: null,
      ownerProfile: null,
    } as const;
    const authResponseHeaders = new Headers({
      'cache-control': 'no-store',
    });
    authResponseHeaders.append(
      'set-cookie',
      'better-auth.session_token=; Path=/; Max-Age=0; HttpOnly',
    );
    authResponseHeaders.append(
      'set-cookie',
      'better-auth.session_data=; Path=/; Max-Age=0; HttpOnly',
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, SessionController],
      providers: [
        SessionService,
        {
          provide: AUTH_SESSION_READER,
          useValue: {
            getSession: async () => ({
              session: null,
              responseHeaders: authResponseHeaders,
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}/api`;

    const sessionResponse = await fetch(`${baseUrl}/session`, {
      headers: {
        cookie: 'better-auth.session_token=invalid',
      },
    });
    const sessionBody = await sessionResponse.json();

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.headers.get('cache-control')).toBe('no-store');
    expect(getSetCookie(sessionResponse.headers)).toEqual([
      'better-auth.session_token=; Path=/; Max-Age=0; HttpOnly',
      'better-auth.session_data=; Path=/; Max-Age=0; HttpOnly',
    ]);
    expect(sessionBody).toEqual(signedOutSession);

    const healthResponse = await fetch(`${baseUrl}/health`);

    expect(healthResponse.status).toBe(200);
  });
});

function getSetCookie(headers: Headers): string[] {
  return (
    headers as Headers & {
      getSetCookie(): string[];
    }
  ).getSetCookie();
}
