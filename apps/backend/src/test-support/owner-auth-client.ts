import type { OwnerSignInRequest, OwnerSignUpRequest } from '@collectify/contracts';

import { getSetCookie, toCookieHeader } from './http-cookies';

export function createOwnerAuthClient(baseUrl: string): OwnerAuthClient {
  return {
    signUpOwner(request) {
      return postJson(`${baseUrl}/owner/sign-up`, request);
    },
    signInOwner(request) {
      return postJson(`${baseUrl}/owner/sign-in`, request);
    },
    getSession(headers) {
      return fetch(`${baseUrl}/session`, {
        headers: {
          cookie: toCookieHeader(getSetCookie(headers)),
        },
      });
    },
  };
}

interface OwnerAuthClient {
  signUpOwner(request: OwnerSignUpRequest): Promise<Response>;
  signInOwner(request: OwnerSignInRequest): Promise<Response>;
  getSession(headers: Headers): Promise<Response>;
}

function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
