import { Inject, Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';

import {
  type AuthSessionReadResult,
  type AuthSessionReader,
} from '../session/auth-session-reader.contract';
import { BetterAuthRuntimeProvider } from './better-auth-runtime.provider';

@Injectable()
export class BetterAuthSessionReader implements AuthSessionReader {
  constructor(
    @Inject(BetterAuthRuntimeProvider)
    private readonly runtimeProvider: BetterAuthRuntimeProvider,
  ) {}

  async getSession(headers: IncomingHttpHeaders): Promise<AuthSessionReadResult> {
    const { auth, fromNodeHeaders } = await this.runtimeProvider.getRuntime();
    const result = await auth.api.getSession({
      headers: fromNodeHeaders(headers),
      returnHeaders: true,
    });

    return {
      session: result?.response ?? null,
      responseHeaders: result?.headers ?? new Headers(),
    };
  }
}
