import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SessionResponse } from '@collectify/contracts';

import App from './App';
import { sessionQueryKey } from './features/auth/session/sessionQueries';
import { getBackendUrl } from './shared/api/http';
import { localeStorageKey } from './shared/localization';
import {
  createTestQueryClient,
  renderWithAppProviders,
} from './shared/test/render';
import { server } from './shared/test/server';

const unauthenticatedSession: SessionResponse = {
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

function renderApp() {
  return renderWithAppProviders(<App />);
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBrowserLanguages(['en-US']);
    mockSession(unauthenticatedSession);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the signed-out auth entry without protected content', async () => {
    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Create account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('renders the session-unavailable state when session loading fails', async () => {
    mockSessionError();

    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Session unavailable' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Unable to reach backend.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Create account' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('uses the authenticated owner profile language after session load', async () => {
    mockSession(ownerSession);

    renderApp();

    expect(
      await screen.findByText('Korunan Collectify \u00e7al\u0131\u015fma alan\u0131'),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'tr');
    expect(window.localStorage.getItem(localeStorageKey)).toBe('tr');
    expect(screen.getByText('owner@example.com')).toHaveAttribute('dir', 'ltr');
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('keeps the workspace hidden while the profile language is pending', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(sessionQueryKey, ownerSession);
    mockSession(ownerSession);

    renderWithAppProviders(<App />, { queryClient });

    expect(
      screen.getByRole('status', {
        name: /Loading Collectify|Collectify y\u00fckleniyor/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Korunan Collectify \u00e7al\u0131\u015fma alan\u0131'),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText('Korunan Collectify \u00e7al\u0131\u015fma alan\u0131'),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(localeStorageKey)).toBe('tr');
  });

  it('does not show protected UI for an auth session missing owner profile', async () => {
    mockSession({
      authenticated: true,
      user: {
        id: 'user_123',
        email: 'owner@example.com',
        name: 'Owner',
      },
      ownerProfile: null,
    });

    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Owner setup incomplete' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('signs out the restored owner session and returns to the auth gate', async () => {
    const user = userEvent.setup();
    const englishOwnerSession: SessionResponse = {
      authenticated: true,
      user: {
        id: 'user_123',
        email: 'owner@example.com',
        name: 'Owner',
      },
      ownerProfile: {
        preferredLanguage: 'en',
        defaultCurrency: 'USD',
      },
    };
    let currentSession: SessionResponse = englishOwnerSession;
    let signOutRequested = false;
    let sessionProbeCount = 0;
    server.use(
      http.get(`${getBackendUrl()}/session`, () => {
        sessionProbeCount += 1;
        return HttpResponse.json(currentSession);
      }),
      http.post(`${getBackendUrl()}/owner/sign-out`, () => {
        signOutRequested = true;
        currentSession = unauthenticatedSession;
        return HttpResponse.json({ success: true });
      }),
    );

    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Owner session active' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(signOutRequested).toBe(true));
    expect(
      await screen.findByRole('heading', { name: 'Create account' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(sessionProbeCount).toBeGreaterThanOrEqual(2));
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });
});
