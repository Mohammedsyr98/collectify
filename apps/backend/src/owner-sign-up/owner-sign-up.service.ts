import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import {
  authApiErrorCode,
  type OwnerSignUpRequest,
  type OwnerSignUpResponse,
} from '@collectify/contracts';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { isAPIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';

import type { CollectifyBetterAuth } from '../auth/better-auth/better-auth.factory';
import { DatabaseService } from '../database/database.service';
import { ownerProfiles, user as authUsers } from '../database/schema';
import { ownerSignUpException } from './owner-sign-up.errors';

export interface OwnerSignUpResult {
  body: OwnerSignUpResponse;
  responseHeaders: Headers;
}

interface BetterAuthSignUpResult {
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
export class OwnerSignUpService {
  constructor(
    private readonly authService: AuthService<CollectifyBetterAuth>,
    private readonly databaseService: DatabaseService,
  ) {}

  async signUpOwner(
    request: OwnerSignUpRequest,
    headers: IncomingHttpHeaders,
  ): Promise<OwnerSignUpResult> {
    const signUpResult = await this.createAuthUser(request, headers);

    try {
      await this.createOwnerProfile(signUpResult.response.user.id, request);
    } catch {
      await this.rollbackAuthUser(signUpResult.response.user.id).catch(() => {
        // The response must not expose a partial sign-up or apply cookies.
      });
      throw ownerSignUpException(authApiErrorCode.profileSetupFailed);
    }

    return {
      body: {
        authenticated: true,
        user: {
          id: signUpResult.response.user.id,
          email: signUpResult.response.user.email,
          name: signUpResult.response.user.name ?? request.name,
        },
        ownerProfile: {
          preferredLanguage: request.preferredLanguage,
          defaultCurrency: request.defaultCurrency,
        },
      },
      responseHeaders: signUpResult.headers,
    };
  }

  private async createAuthUser(
    request: OwnerSignUpRequest,
    headers: IncomingHttpHeaders,
  ): Promise<BetterAuthSignUpResult> {
    try {
      return (await this.authService.api.signUpEmail({
        headers: fromNodeHeaders(headers),
        returnHeaders: true,
        body: {
          name: request.name,
          email: request.email,
          password: request.password,
        },
      })) as BetterAuthSignUpResult;
    } catch (error) {
      throw mapBetterAuthSignUpError(error);
    }
  }

  private async createOwnerProfile(userId: string, request: OwnerSignUpRequest): Promise<void> {
    const now = new Date();

    await this.databaseService.db.insert(ownerProfiles).values({
      id: randomUUID(),
      userId,
      preferredLanguage: request.preferredLanguage,
      defaultCurrency: request.defaultCurrency,
      createdAt: now,
      updatedAt: now,
    });
  }

  private async rollbackAuthUser(userId: string): Promise<void> {
    await this.databaseService.db.delete(authUsers).where(eq(authUsers.id, userId));
  }
}

function mapBetterAuthSignUpError(error: unknown): ReturnType<typeof ownerSignUpException> {
  if (isAPIError(error) && error.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
    return ownerSignUpException(authApiErrorCode.accountAlreadyExists);
  }

  return ownerSignUpException(authApiErrorCode.profileSetupFailed);
}
