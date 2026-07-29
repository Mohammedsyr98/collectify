import type { IncomingHttpHeaders } from 'node:http';
import { describe, expect, it, vi } from 'vitest';

import { BetterAuthSessionReader } from './better-auth-session.reader';
import type { BetterAuthRuntimeProvider } from './better-auth-runtime.provider';

describe('BetterAuthSessionReader', () => {
  it('returns the Better Auth session with response headers', async () => {
    const nodeHeaders: IncomingHttpHeaders = {
      cookie: 'better-auth.session_token=valid',
    };
    const webHeaders = new Headers({
      cookie: 'better-auth.session_token=valid',
    });
    const responseHeaders = new Headers({
      'cache-control': 'no-store',
    });
    const authSession = {
      user: {
        id: 'user_123',
        email: 'owner@example.test',
        name: 'Owner',
      },
    };
    const fromNodeHeaders = vi.fn(() => webHeaders);
    const getSession = vi.fn(async () => ({
      response: authSession,
      headers: responseHeaders,
    }));
    const reader = new BetterAuthSessionReader({
      getRuntime: async () => ({
        auth: {
          api: {
            getSession,
          },
        },
        fromNodeHeaders,
      }),
    } satisfies BetterAuthRuntimeProvider);

    await expect(reader.getSession(nodeHeaders)).resolves.toEqual({
      session: authSession,
      responseHeaders,
    });
    expect(fromNodeHeaders).toHaveBeenCalledWith(nodeHeaders);
    expect(getSession).toHaveBeenCalledWith({
      headers: webHeaders,
      returnHeaders: true,
    });
  });

  it('returns an empty header collection when Better Auth returns no result', async () => {
    const reader = new BetterAuthSessionReader({
      getRuntime: async () => ({
        auth: {
          api: {
            getSession: async () => null,
          },
        },
        fromNodeHeaders: () => new Headers(),
      }),
    } satisfies BetterAuthRuntimeProvider);

    const result = await reader.getSession({});

    expect(result.session).toBeNull();
    expect([...result.responseHeaders.entries()]).toEqual([]);
  });
});
