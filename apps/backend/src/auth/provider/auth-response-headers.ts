import type { ServerResponse } from 'node:http';

import type { AuthResponseHeaders } from './auth-provider.types';

export function applyAuthResponseHeaders(
  headers: AuthResponseHeaders,
  response: Pick<ServerResponse, 'setHeader'>,
): void {
  if (headers.cacheControl) {
    response.setHeader('cache-control', headers.cacheControl);
  }

  if (headers.setCookies.length > 0) {
    response.setHeader('set-cookie', headers.setCookies);
  }
}
