import { Injectable } from '@nestjs/common';
import type { OwnerSignOutResponse } from '@collectify/contracts';
import type { IncomingHttpHeaders } from 'node:http';

import { AuthProviderService } from '../../provider/auth-provider.service';
import type { AuthResponseHeaders } from '../../provider/auth-provider.types';

export interface OwnerSignOutResult {
  body: OwnerSignOutResponse;
  responseHeaders: AuthResponseHeaders;
}

@Injectable()
export class OwnerSignOutService {
  constructor(private readonly authProvider: AuthProviderService) {}

  async signOutOwner(
    headers: IncomingHttpHeaders,
  ): Promise<OwnerSignOutResult> {
    const signOutResult = await this.authProvider.signOut(headers);

    return {
      body: {
        success: true,
      },
      responseHeaders: signOutResult.responseHeaders,
    };
  }
}
