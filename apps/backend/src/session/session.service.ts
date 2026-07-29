import { Inject, Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';

import type { SessionResponse } from '@collectify/contracts';

import type { CollectifyBetterAuth } from '../auth/better-auth';

export interface CurrentSessionResult {
  body: SessionResponse;
  responseHeaders: Headers;
}

interface AuthSessionUser {
  id: string;
  email: string;
  name?: string | null;
}

interface AuthSessionResult {
  user: AuthSessionUser;
}

interface AuthSessionReadResult {
  session: AuthSessionResult | null;
  responseHeaders: Headers;
}

const signedOutSession: SessionResponse = {
  authenticated: false,
  user: null,
  ownerProfile: null,
};

@Injectable()
export class SessionService {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService<CollectifyBetterAuth>,
  ) {}

  async getCurrentSession(
    headers: IncomingHttpHeaders,
  ): Promise<CurrentSessionResult> {
    const authSessionRead = await readAuthSession(this.authService, headers);

    return {
      body: toSessionResponse(authSessionRead.session),
      responseHeaders: authSessionRead.responseHeaders,
    };
  }
}

async function readAuthSession(
  authService: AuthService<CollectifyBetterAuth>,
  headers: IncomingHttpHeaders,
): Promise<AuthSessionReadResult> {
  const result = await authService.api.getSession({
    headers: fromNodeHeaders(headers),
    returnHeaders: true,
  });

  return {
    session: result?.response ?? null,
    responseHeaders: result?.headers ?? new Headers(),
  };
}

function toSessionResponse(
  authSession: AuthSessionResult | null,
): SessionResponse {
  if (!authSession) {
    return signedOutSession;
  }

  return {
    authenticated: true,
    user: {
      id: authSession.user.id,
      email: authSession.user.email,
      name: authSession.user.name ?? null,
    },
    ownerProfile: null,
  };
}
