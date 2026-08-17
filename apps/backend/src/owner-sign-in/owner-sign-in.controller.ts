import { Body, Controller, Headers, HttpCode, Post, Res } from '@nestjs/common';
import type { OwnerSignInRequest, OwnerSignInResponse } from '@collectify/contracts';
import { ownerSignInRequestSchema } from '@collectify/contracts';
import type { IncomingHttpHeaders, ServerResponse } from 'node:http';

import { PublicRoute } from '../auth';
import { applyBetterAuthResponseHeaders } from '../auth/better-auth/better-auth-response-headers';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import { resolveOwnerSignInValidationMessage } from './owner-sign-in.errors';
import { OwnerSignInService } from './owner-sign-in.service';

const ownerSignInValidationPipe = new ZodValidationPipe(ownerSignInRequestSchema, {
  resolveIssueMessage: resolveOwnerSignInValidationMessage,
});

@Controller('owner')
export class OwnerSignInController {
  constructor(private readonly ownerSignInService: OwnerSignInService) {}

  @Post('sign-in')
  @HttpCode(200)
  @PublicRoute()
  async signIn(
    @Body(ownerSignInValidationPipe) body: OwnerSignInRequest,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<OwnerSignInResponse> {
    const signInResult = await this.ownerSignInService.signInOwner(body, headers);

    applyBetterAuthResponseHeaders(signInResult.responseHeaders, response);

    return signInResult.body;
  }
}
