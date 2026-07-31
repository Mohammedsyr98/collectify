import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { eq } from 'drizzle-orm';
import type { IncomingHttpHeaders } from 'node:http';

import type { OwnerProfile, SessionResponse } from '@collectify/contracts';

import type { CollectifyBetterAuth } from '../auth/better-auth';
import { DatabaseService } from '../database/database.service';
import { ownerProfiles } from '../database/schema';

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
    private readonly authService: AuthService<CollectifyBetterAuth>,
    private readonly databaseService: DatabaseService,
  ) {}

  async getCurrentSession(
    headers: IncomingHttpHeaders,
  ): Promise<CurrentSessionResult> {
    const authSessionRead = await readAuthSession(this.authService, headers);
    const ownerProfile = authSessionRead.session
      ? await readOwnerProfile(
          this.databaseService,
          authSessionRead.session.user.id,
        )
      : null;

    return {
      body: toSessionResponse(authSessionRead.session, ownerProfile),
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
  ownerProfile: OwnerProfile | null,
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
    ownerProfile,
  };
}

async function readOwnerProfile(
  databaseService: DatabaseService,
  userId: string,
): Promise<OwnerProfile | null> {
  const [ownerProfile] = await databaseService.db
    .select({
      preferredLanguage: ownerProfiles.preferredLanguage,
      defaultCurrency: ownerProfiles.defaultCurrency,
    })
    .from(ownerProfiles)
    .where(eq(ownerProfiles.userId, userId))
    .limit(1);

  return ownerProfile ?? null;
}
