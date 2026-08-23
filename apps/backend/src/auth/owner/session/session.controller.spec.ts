import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { OwnerContextService } from '../context/owner-context.service';
import { AuthProviderService } from '../../provider/auth-provider.service';
import { HealthController } from '../../../health.controller';
import { getSetCookie } from '../../../test-support/http-cookies';
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
    const authResponseHeaders = {
      cacheControl: 'no-store',
      setCookies: [
        'better-auth.session_token=; Path=/; Max-Age=0; HttpOnly',
        'better-auth.session_data=; Path=/; Max-Age=0; HttpOnly',
      ],
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, SessionController],
      providers: [
        SessionService,
        {
          provide: AuthProviderService,
          useValue: {
            readSession: async () => ({
              session: null,
              responseHeaders: authResponseHeaders,
            }),
          },
        },
        {
          provide: OwnerContextService,
          useValue: {
            findOwnerProfileForUser: async () => null,
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
