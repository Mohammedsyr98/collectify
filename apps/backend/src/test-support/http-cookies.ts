type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

export function getSetCookie(headers: Headers): string[] {
  const getSetCookie = (headers as HeadersWithSetCookie).getSetCookie;

  return typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [];
}

export function toCookieHeader(setCookies: string[]): string {
  return setCookies.map((cookie) => cookie.split(';')[0]).join('; ');
}
