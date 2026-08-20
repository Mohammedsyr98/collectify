import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SessionResponse } from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { localeStorageKey } from '../../../shared/localization';
import {
  createTestQueryClient,
  renderWithAppProviders,
} from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { sessionQueryKey } from './sessionQueries';
import { useAppSessionState } from './useAppSessionState';

const signedOutSession: SessionResponse = {
  authenticated: false,
  user: null,
  ownerProfile: null,
};

const ownerSession: SessionResponse = {
  authenticated: true,
  user: {
    id: 'user_123',
    email: 'owner@example.com',
    name: 'Owner',
  },
  ownerProfile: {
    preferredLanguage: 'tr',
    defaultCurrency: 'TRY',
  },
};

function mockSession(response: SessionResponse) {
  server.use(
    http.get(`${getBackendUrl()}/session`, () => HttpResponse.json(response)),
  );
}

function mockSessionError() {
  server.use(
    http.get(`${getBackendUrl()}/session`, () =>
      HttpResponse.json(
        { message: 'Backend unavailable.' },
        { status: 503 },
      ),
    ),
  );
}

function AppSessionStateProbe() {
  const appSession = useAppSessionState();

  if (appSession.status === 'loading') {
    return <p role="status">Loading session</p>;
  }

  if (appSession.status === 'sessionUnavailable') {
    return (
      <>
        <p>{appSession.isRetrying ? 'Retrying session' : 'Session unavailable'}</p>
        <button onClick={appSession.retry} type="button">
          Retry session
        </button>
      </>
    );
  }

  if (appSession.status === 'ownerWorkspace') {
    return (
      <>
        <p>Owner workspace</p>
        <p>{appSession.session.user.email}</p>
        <p>{appSession.session.ownerProfile.preferredLanguage}</p>
      </>
    );
  }

  return <p>{appSession.status}</p>;
}

function renderProbe() {
  return renderWithAppProviders(<AppSessionStateProbe />);
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

describe('useAppSessionState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    setBrowserLanguages(['en-US']);
  });

  afterEach(() => {
    cleanup();
  });

  it('reports signed-out sessions', async () => {
    mockSession(signedOutSession);

    renderProbe();

    expect(await screen.findByText('signedOut')).toBeInTheDocument();
  });

  it('reports session unavailability and recovers through retry', async () => {
    const user = userEvent.setup();
    let shouldFail = true;
    server.use(
      http.get(`${getBackendUrl()}/session`, () => {
        if (shouldFail) {
          shouldFail = false;

          return HttpResponse.json(
            { message: 'Backend unavailable.' },
            { status: 503 },
          );
        }

        return HttpResponse.json(signedOutSession);
      }),
    );

    renderProbe();

    expect(await screen.findByText('Session unavailable')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry session' }));

    expect(await screen.findByText('signedOut')).toBeInTheDocument();
  });

  it('reports owner setup incomplete when an authenticated session has no owner profile', async () => {
    mockSession({
      authenticated: true,
      user: {
        id: 'user_123',
        email: 'owner@example.com',
        name: 'Owner',
      },
      ownerProfile: null,
    });

    renderProbe();

    expect(
      await screen.findByText('ownerSetupIncomplete'),
    ).toBeInTheDocument();
  });

  it('reports owner workspace after syncing the owner profile language', async () => {
    mockSession(ownerSession);

    renderProbe();

    expect(await screen.findByText('Owner workspace')).toBeInTheDocument();
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('tr')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'tr');
    expect(window.localStorage.getItem(localeStorageKey)).toBe('tr');
  });

  it('keeps the owner workspace pending while the profile language is unsynced', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(sessionQueryKey, ownerSession);
    mockSession(ownerSession);

    renderWithAppProviders(<AppSessionStateProbe />, { queryClient });

    expect(screen.getByRole('status')).toHaveTextContent('Loading session');
    expect(screen.queryByText('Owner workspace')).not.toBeInTheDocument();
    expect(await screen.findByText('Owner workspace')).toBeInTheDocument();
    expect(window.localStorage.getItem(localeStorageKey)).toBe('tr');
  });

  it('continues loading until the session query has data', () => {
    mockSessionError();

    renderProbe();

    expect(screen.getByRole('status')).toHaveTextContent('Loading session');
  });
});
