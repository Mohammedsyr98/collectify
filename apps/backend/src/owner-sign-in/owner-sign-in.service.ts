import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import {
  authApiErrorCode,
  type OwnerSignInRequest,
  type OwnerSignInResponse,
} from '@collectify/contracts';
import type { IncomingHttpHeaders } from 'node:http';
import { fromNodeHeaders } from 'better-auth/node';

import type { CollectifyBetterAuth } from '../auth/better-auth/better-auth.factory';
import { toOwnerProfileResponse } from '../auth/owner-context/owner-context';
import { OwnerContextService } from '../auth/owner-context/owner-context.service';
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
    private readonly ownerContextService: OwnerContextService,
  ) {}

  async signInOwner(
    request: OwnerSignInRequest,
    headers: IncomingHttpHeaders,
  ): Promise<OwnerSignInResult> {
    const signInResult = await this.authenticateOwner(request, headers);
    const owner = await this.ownerContextService.requireOwnerContext(
      signInResult.response.user,
    );

    return {
      body: {
        authenticated: true,
        user: {
          id: owner.user.id,
          email: owner.user.email,
          name: owner.user.name,
        },
        ownerProfile: toOwnerProfileResponse(owner.ownerProfile),
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
