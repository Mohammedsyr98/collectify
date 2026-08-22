import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../app.module';
import {
  CurrentOwner,
  type AuthenticatedOwner,
} from '../index';
import { getSetCookie, toCookieHeader } from '../../test-support/http-cookies';
import {
  startIntegrationPostgres,
  type IntegrationPostgres,
} from '../../test-support/integration-postgres';
import { createOwnerAuthClient } from '../../test-support/owner-auth-client';

@Controller('protected-probe')
class ProtectedProbeController {
  @Get()
  getProtectedProbe(@CurrentOwner() owner: AuthenticatedOwner): AuthenticatedOwner {
    return owner;
  }
}

describe('protected backend routes', () => {
  let postgres: IntegrationPostgres | undefined;
  let app: INestApplication | undefined;
  let baseUrl: string | undefined;
  let ownerAuth: ReturnType<typeof createOwnerAuthClient> | undefined;

  beforeAll(async () => {
    postgres = await startIntegrationPostgres();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtectedProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api`;
    ownerAuth = createOwnerAuthClient(baseUrl);
  });

  beforeEach(async () => {
    await postgres!.reset();
  });

  afterAll(async () => {
    await app?.close();
    await postgres?.stop();
  });

  it('rejects anonymous requests to protected routes', async () => {
    const response = await fetch(`${baseUrl}/protected-probe`);

    expect(response.status).toBe(401);
  });

  it('keeps explicitly public routes reachable without owner auth', async () => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    const sessionResponse = await fetch(`${baseUrl}/session`);
    const signUpResponse = await fetch(`${baseUrl}/owner/sign-up`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const signInResponse = await fetch(`${baseUrl}/owner/sign-in`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const signOutResponse = await fetch(`${baseUrl}/owner/sign-out`, {
      method: 'POST',
    });
    const betterAuthResponse = await fetch(`${baseUrl}/auth/ok`);

    expect(healthResponse.status).toBe(200);
    expect(sessionResponse.status).toBe(200);
    await expect(sessionResponse.json()).resolves.toEqual({
      authenticated: false,
      user: null,
      ownerProfile: null,
    });
    expect(signUpResponse.status).toBe(400);
    expect(signInResponse.status).toBe(400);
    expect(signOutResponse.status).toBe(200);
    expect(betterAuthResponse.status).toBe(200);
  });

  it('gives authenticated owners owner-scoped context on protected routes', async () => {
    const signUpResponse = await ownerAuth!.signUpOwner({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'tr',
      defaultCurrency: 'TRY',
    });
    expect(signUpResponse.status).toBe(200);

    const signUpBody = await signUpResponse.json();
    const response = await fetch(`${baseUrl}/protected-probe`, {
      headers: {
        cookie: toCookieHeader(getSetCookie(signUpResponse.headers)),
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      user: {
        id: signUpBody.user.id,
        email: 'owner@example.com',
        name: 'Owner',
      },
      ownerProfile: {
        userId: signUpBody.user.id,
        preferredLanguage: 'tr',
        defaultCurrency: 'TRY',
      },
    });
    expect(body.ownerProfile.id).toEqual(expect.any(String));
  });

  it('rejects authenticated users without owner profile context on protected routes', async () => {
    const signUpResponse = await ownerAuth!.signUpOwner({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'USD',
    });
    expect(signUpResponse.status).toBe(200);

    const signUpBody = await signUpResponse.json();
    await postgres!.query('DELETE FROM owner_profiles WHERE user_id = $1', [
      signUpBody.user.id,
    ]);

    const response = await fetch(`${baseUrl}/protected-probe`, {
      headers: {
        cookie: toCookieHeader(getSetCookie(signUpResponse.headers)),
      },
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: 'OWNER_PROFILE_MISSING',
      message: 'Owner profile setup is incomplete.',
    });
  });
});
