import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';

import type { SessionResponse } from '@collectify/contracts';

import { OwnerContextService } from '../context/owner-context.service';
import {
  toOwnerProfileResponse,
  type AuthenticatedOwnerProfile,
} from '../context/owner-context';
import { AuthProviderService } from '../../provider/auth-provider.service';
import type {
  AuthProviderSession,
  AuthResponseHeaders,
} from '../../provider/auth-provider.types';

export interface CurrentSessionResult {
  body: SessionResponse;
  responseHeaders: AuthResponseHeaders;
}

const signedOutSession: SessionResponse = {
  authenticated: false,
  user: null,
  ownerProfile: null,
};

@Injectable()
export class SessionService {
  constructor(
    private readonly authProvider: AuthProviderService,
    private readonly ownerContextService: OwnerContextService,
  ) {}

  async getCurrentSession(
    headers: IncomingHttpHeaders,
  ): Promise<CurrentSessionResult> {
    const authSessionRead = await this.authProvider.readSession(headers);
    const ownerProfile = authSessionRead.session
      ? await this.ownerContextService.findOwnerProfileForUser(
          authSessionRead.session.user.id,
        )
      : null;

    return {
      body: toSessionResponse(authSessionRead.session, ownerProfile),
      responseHeaders: authSessionRead.responseHeaders,
    };
  }
}

function toSessionResponse(
  authSession: AuthProviderSession | null,
  ownerProfile: AuthenticatedOwnerProfile | null,
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
    ownerProfile: ownerProfile ? toOwnerProfileResponse(ownerProfile) : null,
  };
}
