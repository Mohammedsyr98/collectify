import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SessionResponse } from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import { useSessionQuery } from '../session/sessionQueries';
import { useOwnerSignOut } from './useOwnerSignOut';

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

const signedOutSession: SessionResponse = {
  authenticated: false,
  user: null,
  ownerProfile: null,
};

function OwnerSignOutProbe() {
  const { isSigningOut, signOut } = useOwnerSignOut();
  const sessionQuery = useSessionQuery();
  const session = sessionQuery.data;

  return (
    <>
      <button disabled={isSigningOut} onClick={signOut} type="button">
        {isSigningOut ? 'Signing out' : 'Sign out'}
      </button>
      <p>
        {session
          ? session.authenticated
            ? 'Owner session'
            : 'Signed out'
          : 'Loading session'}
      </p>
    </>
  );
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

describe('useOwnerSignOut', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBrowserLanguages(['en-US']);
  });

  afterEach(() => {
    cleanup();
  });

  it('signs out the owner session and refreshes session state', async () => {
    const user = userEvent.setup();
    let currentSession: SessionResponse = ownerSession;
    server.use(
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(currentSession),
      ),
      http.post(`${getBackendUrl()}/owner/sign-out`, () => {
        currentSession = signedOutSession;

        return HttpResponse.json({ success: true });
      }),
    );

    renderWithAppProviders(<OwnerSignOutProbe />);

    expect(await screen.findByText('Owner session')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('Signed out')).toBeInTheDocument();
  });

  it('keeps the owner session visible and shows a toast when sign-out fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${getBackendUrl()}/session`, () =>
        HttpResponse.json(ownerSession),
      ),
      http.post(`${getBackendUrl()}/owner/sign-out`, () =>
        HttpResponse.json(
          {
            code: 'SIGN_OUT_FAILED',
            message: 'Backend unavailable.',
          },
          { status: 503 },
        ),
      ),
    );

    renderWithAppProviders(<OwnerSignOutProbe />);

    expect(await screen.findByText('Owner session')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByRole('alert', { name: 'Could not sign out' }),
    ).toHaveTextContent('Backend unavailable.');
    expect(screen.getByText('Owner session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });
});
