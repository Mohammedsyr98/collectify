import type { IncomingHttpHeaders } from 'node:http';

export type AuthRequestHeaders = IncomingHttpHeaders;

export interface AuthResponseHeaders {
  cacheControl: string | null;
  setCookies: string[];
}

export interface AuthProviderUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthProviderSession {
  user: AuthProviderUser;
}

export interface AuthProviderCreateEmailUserInput {
  name: string;
  email: string;
  password: string;
  requestHeaders: AuthRequestHeaders;
}

export type AuthProviderCreateEmailUserResult =
  | {
      outcome: 'created';
      user: AuthProviderUser;
      responseHeaders: AuthResponseHeaders;
    }
  | {
      outcome: 'emailAlreadyExists';
    }
  | {
      outcome: 'failed';
    };

export interface AuthProviderSignInWithEmailInput {
  email: string;
  password: string;
  requestHeaders: AuthRequestHeaders;
}

export type AuthProviderSignInWithEmailResult =
  | {
      outcome: 'authenticated';
      user: AuthProviderUser;
      responseHeaders: AuthResponseHeaders;
    }
  | {
      outcome: 'invalidCredentials';
    };

export interface AuthProviderReadSessionResult {
  session: AuthProviderSession | null;
  responseHeaders: AuthResponseHeaders;
}

export interface AuthProviderSignOutResult {
  responseHeaders: AuthResponseHeaders;
}
