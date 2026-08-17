import { Controller, Headers, HttpCode, Post, Res } from '@nestjs/common';
import type { OwnerSignOutResponse } from '@collectify/contracts';
import type { IncomingHttpHeaders, ServerResponse } from 'node:http';

import { PublicRoute } from '../auth';
import { applyBetterAuthResponseHeaders } from '../auth/better-auth/better-auth-response-headers';
import { OwnerSignOutService } from './owner-sign-out.service';

@Controller('owner')
export class OwnerSignOutController {
  constructor(private readonly ownerSignOutService: OwnerSignOutService) {}

  @Post('sign-out')
  @HttpCode(200)
  @PublicRoute()
  async signOut(
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<OwnerSignOutResponse> {
    const signOutResult = await this.ownerSignOutService.signOutOwner(headers);

    applyBetterAuthResponseHeaders(signOutResult.responseHeaders, response);

    return signOutResult.body;
  }
}
