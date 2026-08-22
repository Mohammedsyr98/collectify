import { Injectable } from '@nestjs/common';
import {
  authApiErrorCode,
  type OwnerSignUpRequest,
  type OwnerSignUpResponse,
} from '@collectify/contracts';
import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

import { DatabaseService } from '../../../database/database.service';
import { ownerProfiles } from '../../../database/schema';
import { AuthProviderService } from '../../provider/auth-provider.service';
import type { AuthResponseHeaders } from '../../provider/auth-provider.types';
import { ownerSignUpException } from './owner-sign-up.errors';

export interface OwnerSignUpResult {
  body: OwnerSignUpResponse;
  responseHeaders: AuthResponseHeaders;
}

@Injectable()
export class OwnerSignUpService {
  constructor(
    private readonly authProvider: AuthProviderService,
    private readonly databaseService: DatabaseService,
  ) {}

  async signUpOwner(
    request: OwnerSignUpRequest,
    headers: IncomingHttpHeaders,
  ): Promise<OwnerSignUpResult> {
    const signUpResult = await this.authProvider.createEmailUser({
      name: request.name,
      email: request.email,
      password: request.password,
      requestHeaders: headers,
    });

    if (signUpResult.outcome === 'emailAlreadyExists') {
      throw ownerSignUpException(authApiErrorCode.accountAlreadyExists);
    }

    if (signUpResult.outcome === 'failed') {
      throw ownerSignUpException(authApiErrorCode.profileSetupFailed);
    }

    try {
      await this.createOwnerProfile(signUpResult.user.id, request);
    } catch {
      await this.authProvider.deleteUser(signUpResult.user.id).catch(() => {
        // The response must not expose a partial sign-up or apply cookies.
      });
      throw ownerSignUpException(authApiErrorCode.profileSetupFailed);
    }

    return {
      body: {
        authenticated: true,
        user: {
          id: signUpResult.user.id,
          email: signUpResult.user.email,
          name: signUpResult.user.name ?? request.name,
        },
        ownerProfile: {
          preferredLanguage: request.preferredLanguage,
          defaultCurrency: request.defaultCurrency,
        },
      },
      responseHeaders: signUpResult.responseHeaders,
    };
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
}
