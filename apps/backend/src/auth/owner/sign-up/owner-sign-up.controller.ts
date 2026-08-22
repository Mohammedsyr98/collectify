import { Body, Controller, Headers, HttpCode, Post, Res } from '@nestjs/common';
import type { OwnerSignUpRequest, OwnerSignUpResponse } from '@collectify/contracts';
import { ownerSignUpRequestSchema } from '@collectify/contracts';
import type { IncomingHttpHeaders, ServerResponse } from 'node:http';

import { PublicRoute } from '../../index';
import { applyBetterAuthResponseHeaders } from '../../provider/better-auth-response-headers';
import { ZodValidationPipe } from '../../../validation/zod-validation.pipe';
import { resolveOwnerSignUpValidationMessage } from './owner-sign-up.errors';
import { OwnerSignUpService } from './owner-sign-up.service';

const ownerSignUpValidationPipe = new ZodValidationPipe(ownerSignUpRequestSchema, {
  resolveIssueMessage: resolveOwnerSignUpValidationMessage,
});

@Controller('owner')
export class OwnerSignUpController {
  constructor(private readonly ownerSignUpService: OwnerSignUpService) {}

  @Post('sign-up')
  @HttpCode(200)
  @PublicRoute()
  async signUp(
    @Body(ownerSignUpValidationPipe) body: OwnerSignUpRequest,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<OwnerSignUpResponse> {
    const signUpResult = await this.ownerSignUpService.signUpOwner(body, headers);

    applyBetterAuthResponseHeaders(signUpResult.responseHeaders, response);

    return signUpResult.body;
  }
}
