import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { OwnerSignOutResponse } from '@collectify/contracts';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';

import type { CollectifyBetterAuth } from '../../provider/better-auth.factory';

export interface OwnerSignOutResult {
  body: OwnerSignOutResponse;
  responseHeaders: Headers;
}

interface BetterAuthSignOutResult {
  response: OwnerSignOutResponse;
  headers: Headers;
}

@Injectable()
export class OwnerSignOutService {
  constructor(private readonly authService: AuthService<CollectifyBetterAuth>) {}

  async signOutOwner(
    headers: IncomingHttpHeaders,
  ): Promise<OwnerSignOutResult> {
    const signOutResult = (await this.authService.api.signOut({
      headers: fromNodeHeaders(headers),
      returnHeaders: true,
    })) as BetterAuthSignOutResult;

    return {
      body: signOutResult.response,
      responseHeaders: signOutResult.headers,
    };
  }
}
