import { Injectable } from '@nestjs/common';
import {
  authApiErrorCode,
  type OwnerSignInRequest,
  type OwnerSignInResponse,
} from '@collectify/contracts';
import type { IncomingHttpHeaders } from 'node:http';

import { OwnerContextService } from '../context/owner-context.service';
import { toOwnerProfileResponse } from '../context/owner-context';
import { AuthProviderService } from '../../provider/auth-provider.service';
import type { AuthResponseHeaders } from '../../provider/auth-provider.types';
import { ownerSignInException } from './owner-sign-in.errors';

export interface OwnerSignInResult {
  body: OwnerSignInResponse;
  responseHeaders: AuthResponseHeaders;
}

@Injectable()
export class OwnerSignInService {
  constructor(
    private readonly authProvider: AuthProviderService,
    private readonly ownerContextService: OwnerContextService,
  ) {}

  async signInOwner(
    request: OwnerSignInRequest,
    headers: IncomingHttpHeaders,
  ): Promise<OwnerSignInResult> {
    const signInResult = await this.authProvider.signInWithEmail({
      email: request.email,
      password: request.password,
      requestHeaders: headers,
    });

    if (signInResult.outcome === 'invalidCredentials') {
      throw ownerSignInException(authApiErrorCode.invalidCredentials);
    }

    const owner = await this.ownerContextService.requireOwnerContext(
      signInResult.user,
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
      responseHeaders: signInResult.responseHeaders,
    };
  }
}
