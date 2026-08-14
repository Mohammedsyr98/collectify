import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  OwnerSignInResponse,
  OwnerSignUpResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '../../shared/api/http';
import { localeStorageKey } from '../../shared/localization';
import { renderWithAppProviders } from '../../shared/test/render';
import { server } from '../../shared/test/server';
import { AuthEntryPage } from './AuthEntryPage';
import { sessionQueryKey } from './session/sessionQueries';

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

type AuthApiErrorResponse = {
  code: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  message: string;
};

function mockOwnerSignUpSuccess(response: OwnerSignUpResponse) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-up`, () =>
      HttpResponse.json(response),
    ),
  );
}

function mockOwnerSignUpError(response: AuthApiErrorResponse, status: number) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-up`, () =>
      HttpResponse.json(response, { status }),
    ),
  );
}

function mockOwnerSignUpMalformedError() {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-up`, () =>
      HttpResponse.json(
        {
          message: 'Malformed backend body.',
        },
        { status: 500 },
      ),
    ),
  );
}

function mockOwnerSignInSuccess(response: OwnerSignInResponse) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-in`, () =>
      HttpResponse.json(response),
    ),
  );
}

function mockOwnerSignInError(response: AuthApiErrorResponse, status: number) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-in`, () =>
      HttpResponse.json(response, { status }),
    ),
  );
}

function mockOwnerSignInMalformedError() {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-in`, () =>
      HttpResponse.json(
        {
          message: 'Malformed backend body.',
        },
        { status: 500 },
      ),
    ),
  );
}

function renderAuthEntryPage() {
  return renderWithAppProviders(<AuthEntryPage />);
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

async function switchToSignIn() {
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: 'Sign in' }));

  return user;
}

async function submitSignInForm(password = 'password123') {
  const user = await switchToSignIn();

  await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Enter workspace' }));

  return user;
}

async function submitTurkishSignInForm(password = 'password123') {
  const user = userEvent.setup();

  await user.click(
    await screen.findByRole('button', { name: 'Giri\u015f yap' }),
  );
  await user.type(
    screen.getByLabelText('E-posta adresi'),
    'owner@example.com',
  );
  await user.type(screen.getByLabelText('\u015eifre'), password);
  await user.click(
    screen.getByRole('button', {
      name: '\u00c7al\u0131\u015fma alan\u0131na gir',
    }),
  );

  return user;
}

async function submitSignUpForm() {
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText('Name'), 'Owner');
  await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.selectOptions(screen.getByLabelText('Default currency'), 'TRY');
  await user.click(getSubmitButton('Create account'));

  return user;
}

async function submitTurkishSignUpForm() {
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText('Ad'), 'Owner');
  await user.type(
    screen.getByLabelText('E-posta adresi'),
    'owner@example.com',
  );
  await user.type(screen.getByLabelText('\u015eifre'), 'password123');
  await user.click(getSubmitButton('Hesap olu\u015ftur'));

  return user;
}

function getSubmitButton(name: string) {
  const submitButton = screen
    .getAllByRole('button', { name })
    .find((button) => button.getAttribute('type') === 'submit');

  if (!submitButton) {
    throw new Error(`Expected submit button named "${name}".`);
  }

  return submitButton;
}

describe('AuthEntryPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBrowserLanguages(['en-US']);
  });

  afterEach(() => {
    cleanup();
  });

  it('syncs the returned profile language, caches the session, and shows a localized sign-in success toast', async () => {
    mockOwnerSignInSuccess(ownerSession);
    const { queryClient } = renderAuthEntryPage();

    await submitSignInForm();

    expect(
      await screen.findByRole('status', { name: 'Giri\u015f yap\u0131ld\u0131' }),
    ).toHaveTextContent('Collectify\u2019a tekrar ho\u015f geldiniz.');
    expect(document.documentElement).toHaveAttribute('lang', 'tr');
    expect(window.localStorage.getItem(localeStorageKey)).toBe('tr');
    await waitFor(() =>
      expect(queryClient.getQueryData(sessionQueryKey)).toEqual(ownerSession),
    );
  });

  it('syncs the returned profile language, caches the session, and shows a localized sign-up success toast', async () => {
    mockOwnerSignUpSuccess(ownerSession);
    const { queryClient } = renderAuthEntryPage();

    await submitSignUpForm();

    expect(
      await screen.findByRole('status', { name: 'Hesap olu\u015fturuldu' }),
    ).toHaveTextContent(
      'Collectify \u00e7al\u0131\u015fma alan\u0131n\u0131z haz\u0131r.',
    );
    expect(document.documentElement).toHaveAttribute('lang', 'tr');
    expect(window.localStorage.getItem(localeStorageKey)).toBe('tr');
    await waitFor(() =>
      expect(queryClient.getQueryData(sessionQueryKey)).toEqual(ownerSession),
    );
  });

  it('shows sign-in errors accessibly without caching a session', async () => {
    setBrowserLanguages(['tr-TR']);
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
    const { queryClient } = renderAuthEntryPage();

    await submitTurkishSignInForm('wrong-password');

    expect(
      await screen.findByRole('alert', {
        name: 'Giri\u015f yap\u0131lamad\u0131',
      }),
    ).toHaveTextContent('E-posta veya \u015fifre hatal\u0131.');
    expect(
      screen.queryByText('Email or password is incorrect.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Giri\u015f yap' }),
    ).toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  it('shows missing owner profile errors without caching a session', async () => {
    mockOwnerSignInError(
      {
        code: 'OWNER_PROFILE_MISSING',
        message: 'Owner profile setup is incomplete.',
      },
      409,
    );
    const { queryClient } = renderAuthEntryPage();

    await submitSignInForm();

    expect(
      await screen.findByRole('alert', {
        name: 'Could not sign in',
      }),
    ).toHaveTextContent('Owner profile setup is incomplete.');
    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  it('shows a generic localized fallback for malformed sign-in error responses', async () => {
    setBrowserLanguages(['tr-TR']);
    mockOwnerSignInMalformedError();
    const { queryClient } = renderAuthEntryPage();

    await submitTurkishSignInForm();

    expect(
      await screen.findByRole('alert', {
        name: 'Giri\u015f yap\u0131lamad\u0131',
      }),
    ).toHaveTextContent('Bir \u015feyler ters gitti. Tekrar deneyin.');
    expect(
      screen.queryByText('Malformed backend body.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('500')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  it('shows known sign-up API errors as localized toasts without caching a session', async () => {
    setBrowserLanguages(['tr-TR']);
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
    const { queryClient } = renderAuthEntryPage();

    await submitTurkishSignUpForm();

    expect(
      await screen.findByRole('alert', {
        name: 'Hesap olu\u015fturulamad\u0131',
      }),
    ).toHaveTextContent('Bu e-posta adresiyle zaten bir hesap var.');
    expect(
      screen.queryByText('An account already exists for this email.'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Check the highlighted fields.'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('E-posta adresi'),
    ).not.toHaveAccessibleDescription();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  it('shows backend fallback messages for unknown sign-up API codes without caching a session', async () => {
    mockOwnerSignUpError(
      {
        code: 'FUTURE_SIGN_UP_RULE',
        message: 'Backend fallback from newer server.',
        fieldErrors: {
          email: ['Backend field detail.'],
        },
      },
      409,
    );
    const { queryClient } = renderAuthEntryPage();

    await submitSignUpForm();

    expect(
      await screen.findByRole('alert', {
        name: 'Could not create account',
      }),
    ).toHaveTextContent('Backend fallback from newer server.');
    expect(screen.queryByText('Backend field detail.')).not.toBeInTheDocument();
    expect(
      screen.queryByText('auth.errors.FUTURE_SIGN_UP_RULE'),
    ).not.toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  it('shows profile setup sign-up errors as a localized toast without caching a session', async () => {
    mockOwnerSignUpError(
      {
        code: 'PROFILE_SETUP_FAILED',
        message: 'Backend profile setup failed.',
      },
      500,
    );
    const { queryClient } = renderAuthEntryPage();

    await submitSignUpForm();

    expect(
      await screen.findByRole('alert', {
        name: 'Could not create account',
      }),
    ).toHaveTextContent('We could not finish owner setup. Try again.');
    expect(
      screen.queryByText('Backend profile setup failed.'),
    ).not.toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  it('shows a localized failure toast for malformed sign-up error responses', async () => {
    setBrowserLanguages(['tr-TR']);
    mockOwnerSignUpMalformedError();
    const { queryClient } = renderAuthEntryPage();

    await submitTurkishSignUpForm();

    expect(
      await screen.findByRole('alert', {
        name: 'Hesap olu\u015fturulamad\u0131',
      }),
    ).toHaveTextContent('Bir \u015feyler ters gitti. Tekrar deneyin.');
    expect(
      screen.queryByText('Malformed backend body.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('500')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });
});
