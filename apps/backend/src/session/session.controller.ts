import { Controller, Get, Headers, Inject, Res } from '@nestjs/common';
import type { IncomingHttpHeaders, ServerResponse } from 'node:http';

import type { SessionResponse } from '@collectify/contracts';

import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(
    @Inject(SessionService)
    private readonly sessionService: SessionService,
  ) {}

  @Get()
  async getSession(
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<SessionResponse> {
    const currentSession = await this.sessionService.getCurrentSession(headers);

    applyResponseHeaders(currentSession.responseHeaders, response);

    return currentSession.body;
  }
}

function applyResponseHeaders(
  responseHeaders: Headers,
  response: Pick<ServerResponse, 'setHeader'>,
): void {
  responseHeaders.forEach((value, name) => {
    if (name.toLowerCase() === 'set-cookie') {
      return;
    }

    response.setHeader(name, value);
  });

  const setCookieValues = getSetCookieValues(responseHeaders);

  if (setCookieValues.length > 0) {
    response.setHeader('set-cookie', setCookieValues);
  }
}

function getSetCookieValues(headers: Headers): string[] {
  const getSetCookie = (
    headers as Headers & {
      getSetCookie?: () => string[];
    }
  ).getSetCookie;

  if (typeof getSetCookie === 'function') {
    return getSetCookie.call(headers);
  }

  const setCookie = headers.get('set-cookie');

  return setCookie ? [setCookie] : [];
}
