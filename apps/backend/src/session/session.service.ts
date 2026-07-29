import { Inject, Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';

import type { SessionResponse } from '@collectify/contracts';

import {
  AUTH_SESSION_READER,
  type AuthSessionResult,
  type AuthSessionReader,
} from './auth-session-reader.contract';

export interface CurrentSessionResult {
  body: SessionResponse;
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
    @Inject(AUTH_SESSION_READER)
    private readonly authSessionReader: AuthSessionReader,
  ) {}

  async getCurrentSession(
    headers: IncomingHttpHeaders,
  ): Promise<CurrentSessionResult> {
    const authSessionRead = await this.authSessionReader.getSession(headers);

    return {
      body: toSessionResponse(authSessionRead.session),
      responseHeaders: authSessionRead.responseHeaders,
    };
  }
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
