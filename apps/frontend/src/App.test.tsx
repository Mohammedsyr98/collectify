import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  OwnerSignInErrorResponse,
  OwnerSignInResponse,
  OwnerSignUpErrorResponse,
  OwnerSignUpResponse,
  SessionResponse,
} from '@collectify/contracts';

import App from './App';
import { getBackendUrl } from './shared/api/http';
import { renderWithAppProviders } from './shared/test/render';
import { server } from './shared/test/server';

const unauthenticatedSession: SessionResponse = {
  authenticated: false,
  user: null,
  ownerProfile: null,
};

const ownerSession: OwnerSignUpResponse = {
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

function mockOwnerSignUpSuccess(response: OwnerSignUpResponse) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-up`, () =>
      HttpResponse.json(response),
    ),
  );
}

function mockOwnerSignUpError(
  response: OwnerSignUpErrorResponse,
  status: number,
) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-up`, () =>
      HttpResponse.json(response, { status }),
    ),
  );
}

function mockOwnerSignUpNetworkError() {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-up`, () => HttpResponse.error()),
  );
}

function mockOwnerSignInSuccess(response: OwnerSignInResponse) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-in`, () =>
      HttpResponse.json(response),
    ),
  );
}

function mockOwnerSignInError(
  response: OwnerSignInErrorResponse,
  status: number,
) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-in`, () =>
      HttpResponse.json(response, { status }),
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

  it('shows the owner sign-up form without protected content', async () => {
    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Create account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('shows protected owner context with a success toast after sign-in', async () => {
    const user = userEvent.setup();
    mockOwnerSignInSuccess(ownerSession);
    renderApp();

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Enter workspace' }));

    expect(
      await screen.findByText('Protected Collectify workspace'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('status', { name: 'Signed in' }),
    ).toHaveTextContent('Welcome back to Collectify.');
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('TRY')).toBeInTheDocument();
  });

  it('shows sign-in errors accessibly without entering the workspace', async () => {
    const user = userEvent.setup();
    mockOwnerSignInError(
      {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
        fieldErrors: {
          email: ['Email or password is incorrect.'],
        },
      },
      401,
    );
    renderApp();

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Enter workspace' }));

    expect(
      await screen.findByRole('alert', {
        name: 'Could not sign in',
      }),
    ).toHaveTextContent('Email or password is incorrect.');
    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('shows missing owner profile errors without entering the workspace', async () => {
    const user = userEvent.setup();
    mockOwnerSignInError(
      {
        code: 'OWNER_PROFILE_MISSING',
        message: 'Owner profile setup is incomplete.',
      },
      409,
    );
    renderApp();

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Enter workspace' }));

    expect(
      await screen.findByRole('alert', {
        name: 'Could not sign in',
      }),
    ).toHaveTextContent('Owner profile setup is incomplete.');
    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('shows protected owner context with a success toast after sign-up', async () => {
    const user = userEvent.setup();
    mockOwnerSignUpSuccess(ownerSession);
    renderApp();

    await user.type(await screen.findByLabelText('Name'), 'Owner');
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.selectOptions(screen.getByLabelText('Default currency'), 'TRY');
    await user.selectOptions(screen.getByLabelText('Interface language'), 'tr');
    await user.click(screen.getByRole('button', { name: 'Hesap oluştur' }));

    expect(
      await screen.findByText('Korunan Collectify çalışma alanı'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('status', { name: 'Hesap oluşturuldu' }),
    ).toHaveTextContent('Collectify çalışma alanınız hazır.');
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('TRY')).toBeInTheDocument();
  });

  it('shows backend field errors in a toast without entering the workspace', async () => {
    const user = userEvent.setup();
    mockOwnerSignUpError(
      {
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'Check the highlighted fields.',
        fieldErrors: {
          email: ['An account already exists for this email.'],
        },
      },
      409,
    );
    renderApp();

    await user.type(await screen.findByLabelText('Name'), 'Owner');
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('alert', {
        name: 'Could not create account',
      }),
    ).toHaveTextContent('An account already exists for this email.');
    expect(
      screen.queryByText('Check the highlighted fields.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Email address'),
    ).not.toHaveAccessibleDescription();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('shows a failure toast for unexpected sign-up errors', async () => {
    const user = userEvent.setup();
    mockOwnerSignUpNetworkError();
    renderApp();

    await user.type(await screen.findByLabelText('Name'), 'Owner');
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('alert', {
        name: 'Could not create account',
      }),
    ).toHaveTextContent('Unable to create owner account. Try again.');
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
});
