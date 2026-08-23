import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { isAPIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { user as authUsers } from '../../database/schema';
import type { CollectifyBetterAuth } from './better-auth.factory';
import type {
  AuthProviderCreateEmailUserInput,
  AuthProviderCreateEmailUserResult,
  AuthProviderReadSessionResult,
  AuthRequestHeaders,
  AuthResponseHeaders,
  AuthProviderSignInWithEmailInput,
  AuthProviderSignInWithEmailResult,
  AuthProviderSignOutResult,
  AuthProviderUser,
} from './auth-provider.types';

interface BetterAuthUser {
  id: string;
  email: string;
  name?: string | null;
}

interface BetterAuthAuthenticatedUserResult {
  response: {
    user: BetterAuthUser;
  };
  headers?: Headers | null;
}

interface BetterAuthSessionResult {
  user: BetterAuthUser;
}

interface BetterAuthReadSessionResult {
  response: BetterAuthSessionResult | null;
  headers?: Headers | null;
}

interface BetterAuthSignOutResult {
  headers?: Headers | null;
}

const betterAuthDuplicateEmailCode = 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL';

@Injectable()
export class AuthProviderService {
  constructor(
    private readonly authService: AuthService<CollectifyBetterAuth>,
    private readonly databaseService: DatabaseService,
  ) {}

  async createEmailUser(
    input: AuthProviderCreateEmailUserInput,
  ): Promise<AuthProviderCreateEmailUserResult> {
    try {
      const result = (await this.authService.api.signUpEmail({
        headers: fromNodeHeaders(input.requestHeaders),
        returnHeaders: true,
        body: {
          name: input.name,
          email: input.email,
          password: input.password,
        },
      })) as BetterAuthAuthenticatedUserResult;

      return {
        outcome: 'created',
        user: toAuthProviderUser(result.response.user),
        responseHeaders: toAuthResponseHeaders(result.headers),
      };
    } catch (error) {
      if (
        isAPIError(error) &&
        error.body?.code === betterAuthDuplicateEmailCode
      ) {
        return {
          outcome: 'emailAlreadyExists',
        };
      }

      return {
        outcome: 'failed',
      };
    }
  }

  async signInWithEmail(
    input: AuthProviderSignInWithEmailInput,
  ): Promise<AuthProviderSignInWithEmailResult> {
    try {
      const result = (await this.authService.api.signInEmail({
        headers: fromNodeHeaders(input.requestHeaders),
        returnHeaders: true,
        body: {
          email: input.email,
          password: input.password,
        },
      })) as BetterAuthAuthenticatedUserResult;

      return {
        outcome: 'authenticated',
        user: toAuthProviderUser(result.response.user),
        responseHeaders: toAuthResponseHeaders(result.headers),
      };
    } catch {
      return {
        outcome: 'invalidCredentials',
      };
    }
  }

  async readSession(
    requestHeaders: AuthRequestHeaders,
  ): Promise<AuthProviderReadSessionResult> {
    const result = (await this.authService.api.getSession({
      headers: fromNodeHeaders(requestHeaders),
      returnHeaders: true,
    })) as BetterAuthReadSessionResult | null;

    return {
      session: result?.response
        ? {
            user: toAuthProviderUser(result.response.user),
          }
        : null,
      responseHeaders: toAuthResponseHeaders(result?.headers),
    };
  }

  async signOut(
    requestHeaders: AuthRequestHeaders,
  ): Promise<AuthProviderSignOutResult> {
    const result = (await this.authService.api.signOut({
      headers: fromNodeHeaders(requestHeaders),
      returnHeaders: true,
    })) as BetterAuthSignOutResult | null;

    return {
      responseHeaders: toAuthResponseHeaders(result?.headers),
    };
  }

  async deleteUser(userId: string): Promise<void> {
    await this.databaseService.db
      .delete(authUsers)
      .where(eq(authUsers.id, userId));
  }
}

function toAuthProviderUser(user: BetterAuthUser): AuthProviderUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
  };
}

function toAuthResponseHeaders(
  headers: Headers | null | undefined,
): AuthResponseHeaders {
  return {
    cacheControl: headers?.get('cache-control') ?? null,
    setCookies: headers ? getSetCookieValues(headers) : [],
  };
}

function getSetCookieValues(headers: Headers): string[] {
  const getSetCookie = (headers as HeadersWithSetCookie).getSetCookie;

  return typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [];
}

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};
