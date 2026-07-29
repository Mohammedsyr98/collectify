import type { IncomingHttpHeaders } from 'node:http';

export const AUTH_SESSION_READER = Symbol('AUTH_SESSION_READER');

export interface AuthSessionUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthSessionResult {
  user: AuthSessionUser;
}

export interface AuthSessionReadResult {
  session: AuthSessionResult | null;
  responseHeaders: Headers;
}

export interface AuthSessionReader {
  getSession(headers: IncomingHttpHeaders): Promise<AuthSessionReadResult>;
}
