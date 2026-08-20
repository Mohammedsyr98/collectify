import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { OwnerSignInResponse, OwnerSignUpResponse } from '@collectify/contracts';

import { createAppI18nInstance } from '../../app/localization/i18n';
import { getBackendUrl } from '../../shared/api/http';
import { localeStorageKey, type SupportedLocale } from '../../shared/localization';
import { renderWithAppProviders } from '../../shared/test/render';
import { server } from '../../shared/test/server';
import { AuthEntryPage } from './AuthEntryPage';
import { sessionQueryKey } from './session/sessionQueries';

const arabicOwnerSession: OwnerSignUpResponse = {
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
};

type AuthApiErrorResponse = {
  code: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  message: string;
};

function mockOwnerSignUpSuccess(response: OwnerSignUpResponse) {
  server.use(http.post(`${getBackendUrl()}/owner/sign-up`, () => HttpResponse.json(response)));
}

function mockOwnerSignUpError(response: AuthApiErrorResponse, status: number) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-up`, () => HttpResponse.json(response, { status })),
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
  server.use(http.post(`${getBackendUrl()}/owner/sign-in`, () => HttpResponse.json(response)));
}

function mockOwnerSignInError(response: AuthApiErrorResponse, status: number) {
  server.use(
    http.post(`${getBackendUrl()}/owner/sign-in`, () => HttpResponse.json(response, { status })),
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

async function submitLocalizedSignInForm(locale: SupportedLocale, password = 'password123') {
  const user = userEvent.setup();
  const i18n = createAppI18nInstance(locale);

  await user.click(
    await screen.findByRole('button', {
      name: i18n.t('auth.entry.signInTab'),
    }),
  );
  await user.type(screen.getByLabelText(i18n.t('auth.signIn.emailLabel')), 'owner@example.com');
  await user.type(screen.getByLabelText(i18n.t('auth.signIn.passwordLabel')), password);
  await user.click(
    screen.getByRole('button', {
      name: i18n.t('auth.signIn.submit'),
    }),
  );

  return { i18n, user };
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

async function submitLocalizedSignUpForm(locale: SupportedLocale) {
  const user = userEvent.setup();
  const i18n = createAppI18nInstance(locale);

  await user.type(await screen.findByLabelText(i18n.t('auth.signUp.nameLabel')), 'Owner');
  await user.type(screen.getByLabelText(i18n.t('auth.signUp.emailLabel')), 'owner@example.com');
  await user.type(screen.getByLabelText(i18n.t('auth.signUp.passwordLabel')), 'password123');
  await user.click(getSubmitButton(i18n.t('auth.signUp.submit')));

  return { i18n, user };
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
    const arabicI18n = createAppI18nInstance('ar');
    mockOwnerSignInSuccess(arabicOwnerSession);
    const { queryClient } = renderAuthEntryPage();

    await submitSignInForm();

    expect(
      await screen.findByRole('status', {
        name: arabicI18n.t('auth.toast.signIn.successTitle'),
      }),
    ).toHaveTextContent(arabicI18n.t('auth.toast.signIn.successDescription'));
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(window.localStorage.getItem(localeStorageKey)).toBe('ar');
    await waitFor(() =>
      expect(queryClient.getQueryData(sessionQueryKey)).toEqual(arabicOwnerSession),
    );
  });

  it('syncs the returned profile language, caches the session, and shows a localized sign-up success toast', async () => {
    const arabicI18n = createAppI18nInstance('ar');
    mockOwnerSignUpSuccess(arabicOwnerSession);
    const { queryClient } = renderAuthEntryPage();

    await submitSignUpForm();

    expect(
      await screen.findByRole('status', {
        name: arabicI18n.t('auth.toast.signUp.successTitle'),
      }),
    ).toHaveTextContent(arabicI18n.t('auth.toast.signUp.successDescription'));
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(window.localStorage.getItem(localeStorageKey)).toBe('ar');
    await waitFor(() =>
      expect(queryClient.getQueryData(sessionQueryKey)).toEqual(arabicOwnerSession),
    );
  });

  it('shows sign-in errors accessibly without caching a session', async () => {
    setBrowserLanguages(['ar']);
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

    const { i18n } = await submitLocalizedSignInForm('ar', 'wrong-password');

    expect(
      await screen.findByRole('alert', {
        name: i18n.t('auth.toast.signIn.errorTitle'),
      }),
    ).toHaveTextContent(i18n.t('auth.errors.INVALID_CREDENTIALS'));
    expect(screen.queryByText('Email or password is incorrect.')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: i18n.t('auth.entry.signIn.title') }),
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
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  it('shows a generic localized fallback for malformed sign-in error responses', async () => {
    setBrowserLanguages(['ar']);
    mockOwnerSignInMalformedError();
    const { queryClient } = renderAuthEntryPage();

    const { i18n } = await submitLocalizedSignInForm('ar');

    expect(
      await screen.findByRole('alert', {
        name: i18n.t('auth.toast.signIn.errorTitle'),
      }),
    ).toHaveTextContent(i18n.t('errors.genericDescription'));
    expect(screen.queryByText('Malformed backend body.')).not.toBeInTheDocument();
    expect(screen.queryByText('500')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  it('shows known sign-up API errors as localized toasts without caching a session', async () => {
    setBrowserLanguages(['ar']);
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

    const { i18n } = await submitLocalizedSignUpForm('ar');

    expect(
      await screen.findByRole('alert', {
        name: i18n.t('auth.toast.signUp.errorTitle'),
      }),
    ).toHaveTextContent(i18n.t('auth.errors.ACCOUNT_ALREADY_EXISTS'));
    expect(screen.queryByText('An account already exists for this email.')).not.toBeInTheDocument();
    expect(screen.queryByText('Check the highlighted fields.')).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(i18n.t('auth.signUp.emailLabel')),
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
    expect(screen.queryByText('auth.errors.FUTURE_SIGN_UP_RULE')).not.toBeInTheDocument();
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
    expect(screen.queryByText('Backend profile setup failed.')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });

  it('shows a localized failure toast for malformed sign-up error responses', async () => {
    setBrowserLanguages(['ar']);
    mockOwnerSignUpMalformedError();
    const { queryClient } = renderAuthEntryPage();

    const { i18n } = await submitLocalizedSignUpForm('ar');

    expect(
      await screen.findByRole('alert', {
        name: i18n.t('auth.toast.signUp.errorTitle'),
      }),
    ).toHaveTextContent(i18n.t('errors.genericDescription'));
    expect(screen.queryByText('Malformed backend body.')).not.toBeInTheDocument();
    expect(screen.queryByText('500')).not.toBeInTheDocument();
    expect(queryClient.getQueryData(sessionQueryKey)).toBeUndefined();
  });
});
