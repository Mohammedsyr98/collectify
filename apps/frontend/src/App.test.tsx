import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SessionResponse } from '@collectify/contracts';

import App from './App';
import { createAppI18nInstance } from './app/localization/i18n';
import { getBackendUrl } from './shared/api/http';
import { renderWithAppProviders } from './shared/test/render';
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
    preferredLanguage: 'en',
    defaultCurrency: 'USD',
  },
};

function mockSession(response: SessionResponse) {
  server.use(http.get(`${getBackendUrl()}/session`, () => HttpResponse.json(response)));
}

function mockSessionError() {
  server.use(
    http.get(`${getBackendUrl()}/session`, () =>
      HttpResponse.json({ message: 'Backend unavailable.' }, { status: 503 }),
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
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    setBrowserLanguages(['en-US']);
    mockSession(unauthenticatedSession);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the signed-out auth entry without protected content', async () => {
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.queryByRole('main', { name: 'Panel' })).not.toBeInTheDocument();
  });

  it('renders the session-unavailable state when session loading fails', async () => {
    mockSessionError();

    renderApp();

    expect(
      await screen.findByRole('heading', {
        name: "We couldn't load Collectify",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Try again in a moment.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('main', { name: 'Panel' })).not.toBeInTheDocument();
  });

  it('retries session loading from the generic error state', async () => {
    const user = userEvent.setup();
    let sessionProbeCount = 0;
    server.use(
      http.get(`${getBackendUrl()}/session`, () => {
        sessionProbeCount += 1;

        if (sessionProbeCount === 1) {
          return HttpResponse.json({ message: 'Backend unavailable.' }, { status: 503 });
        }

        return HttpResponse.json(unauthenticatedSession);
      }),
    );

    renderApp();

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Create account' })).toBeInTheDocument();
  });

  it('renders the owner workspace for an authenticated owner profile', async () => {
    mockSession(ownerSession);

    renderApp();

    expect(await screen.findByRole('main', { name: 'Panel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Panel', current: 'page' })).toBeInTheDocument();
    expect(screen.queryByText('Owner session active')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Collectify workspace')).not.toBeInTheDocument();
  });

  it('renders Arabic owner workspace sidebar copy while preserving document direction', async () => {
    const arabicI18n = createAppI18nInstance('ar');
    mockSession({
      authenticated: true,
      user: {
        id: 'user_123',
        email: 'owner@example.com',
        name: 'Owner',
      },
      ownerProfile: {
        preferredLanguage: 'ar',
        defaultCurrency: 'USD',
      },
    });

    renderApp();

    expect(
      await screen.findByRole('main', {
        name: arabicI18n.t('app.workspace.navigation.panel'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: arabicI18n.t('app.workspace.navigation.panel'),
        current: 'page',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Collectify')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
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
    expect(screen.queryByRole('main', { name: 'Panel' })).not.toBeInTheDocument();
  });
});
