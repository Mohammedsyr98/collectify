import type { ServerResponse } from 'node:http';

export function applyBetterAuthResponseHeaders(
  headers: Headers,
  response: Pick<ServerResponse, 'setHeader'>,
): void {
  const cacheControl = headers.get('cache-control');

  if (cacheControl) {
    response.setHeader('cache-control', cacheControl);
  }

  const cookies = getSetCookieValues(headers);

  if (cookies.length > 0) {
    response.setHeader('set-cookie', cookies);
  }
}

function getSetCookieValues(headers: Headers): string[] {
  const getSetCookie = (headers as HeadersWithSetCookie).getSetCookie;

  return typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [];
}

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};
