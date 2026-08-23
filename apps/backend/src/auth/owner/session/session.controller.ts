import { Controller, Get, Headers, Res } from '@nestjs/common';
import type { IncomingHttpHeaders, ServerResponse } from 'node:http';

import type { SessionResponse } from '@collectify/contracts';

import { PublicRoute } from '../../index';
import { applyAuthResponseHeaders } from '../../provider/auth-response-headers';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @PublicRoute()
  async getSession(
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<SessionResponse> {
    const currentSession = await this.sessionService.getCurrentSession(headers);

    applyAuthResponseHeaders(currentSession.responseHeaders, response);

    return currentSession.body;
  }
}
