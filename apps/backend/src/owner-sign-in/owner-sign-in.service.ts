import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import {
  authApiErrorCode,
  type OwnerProfile,
  type OwnerSignInRequest,
  type OwnerSignInResponse,
} from '@collectify/contracts';
import { eq } from 'drizzle-orm';
import type { IncomingHttpHeaders } from 'node:http';
import { fromNodeHeaders } from 'better-auth/node';

import type { CollectifyBetterAuth } from '../auth/better-auth';
import { DatabaseService } from '../database/database.service';
import { ownerProfiles } from '../database/schema';
import { ownerSignInException } from './owner-sign-in.errors';

export interface OwnerSignInResult {
  body: OwnerSignInResponse;
  responseHeaders: Headers;
}

interface BetterAuthSignInResult {
  response: {
    token: string | null;
    user: {
      id: string;
      email: string;
      name?: string | null;
    };
  };
  headers: Headers;
}

@Injectable()
export class OwnerSignInService {
  constructor(
    private readonly authService: AuthService<CollectifyBetterAuth>,
    private readonly databaseService: DatabaseService,
  ) {}

  async signInOwner(
    request: OwnerSignInRequest,
    headers: IncomingHttpHeaders,
  ): Promise<OwnerSignInResult> {
    const signInResult = await this.authenticateOwner(request, headers);
    const ownerProfile = await findOwnerProfile(
      this.databaseService,
      signInResult.response.user.id,
    );

    if (!ownerProfile) {
      throw ownerSignInException(authApiErrorCode.ownerProfileMissing);
    }

    return {
      body: {
        authenticated: true,
        user: {
          id: signInResult.response.user.id,
          email: signInResult.response.user.email,
          name: signInResult.response.user.name ?? null,
        },
        ownerProfile,
      },
      responseHeaders: signInResult.headers,
    };
  }

  private async authenticateOwner(
    request: OwnerSignInRequest,
    headers: IncomingHttpHeaders,
  ): Promise<BetterAuthSignInResult> {
    try {
      return (await this.authService.api.signInEmail({
        headers: fromNodeHeaders(headers),
        returnHeaders: true,
        body: {
          email: request.email,
          password: request.password,
        },
      })) as BetterAuthSignInResult;
    } catch {
      throw ownerSignInException(authApiErrorCode.invalidCredentials);
    }
  }
}

async function findOwnerProfile(
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
