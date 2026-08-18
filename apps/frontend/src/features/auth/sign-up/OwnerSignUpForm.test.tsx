import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authValidationCode } from '@collectify/contracts';

import { AppLocalizationProvider } from '../../../app/localization/AppLocalizationProvider';
import { createAppI18nInstance } from '../../../app/localization/i18n';
import {
  defaultLocale,
  supportedLocales,
  type SupportedLocale,
} from '../../../shared/localization';
import { OwnerSignUpForm } from './OwnerSignUpForm';

function renderOwnerSignUpForm({
  isSubmitting = false,
  onSubmit = vi.fn(),
}: {
  isSubmitting?: boolean;
  onSubmit?: ComponentProps<typeof OwnerSignUpForm>['onSubmit'];
} = {}) {
  return render(
    <AppLocalizationProvider>
      <OwnerSignUpForm isSubmitting={isSubmitting} onSubmit={onSubmit} />
    </AppLocalizationProvider>,
  );
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

function getAlternateLocale(): SupportedLocale {
  const alternateLocale = supportedLocales.find((locale) => locale !== defaultLocale);

  if (!alternateLocale) {
    throw new Error('Expected at least one non-default locale.');
  }

  return alternateLocale;
}

describe('OwnerSignUpForm', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBrowserLanguages(['en-US']);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the owner sign-up controls', () => {
    renderOwnerSignUpForm();

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Interface language')).toBeInTheDocument();
    expect(screen.getByLabelText('Default currency')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('renders one language option for each supported locale', () => {
    renderOwnerSignUpForm();

    const languageSelect = screen.getByLabelText('Interface language');
    const optionValues = within(languageSelect)
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value);

    expect(optionValues).toEqual(supportedLocales);
  });

  it('shows Zod validation errors beneath matching inputs before submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderOwnerSignUpForm({ onSubmit });

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Name is required.');
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password must be between 8 and 128 characters.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('updates visible auth validation errors when the language changes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const alternateLocale = getAlternateLocale();
    const alternateI18n = createAppI18nInstance(alternateLocale);
    const alternateNameLabel = alternateI18n.t('auth.signUp.nameLabel');
    const alternateEmailLabel = alternateI18n.t('auth.signUp.emailLabel');
    const alternatePasswordLength = alternateI18n.t(
      `auth.validation.${authValidationCode.authSignUpPasswordLength}`,
    );
    const alternateEmailInvalid = alternateI18n.t(
      `auth.validation.${authValidationCode.authEmailInvalid}`,
    );
    const alternateNameRequired = alternateI18n.t(
      `auth.validation.${authValidationCode.authNameRequired}`,
    );

    renderOwnerSignUpForm({ onSubmit });

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Name is required.');

    await user.selectOptions(screen.getByLabelText('Interface language'), alternateLocale);

    expect(await screen.findByText(alternateNameRequired)).toBeInTheDocument();
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
    expect(screen.getByLabelText(alternateNameLabel)).toHaveAccessibleDescription(
      alternateNameRequired,
    );
    expect(screen.getByLabelText(alternateEmailLabel)).toHaveAccessibleDescription(
      alternateEmailInvalid,
    );
    expect(screen.getByText(alternatePasswordLength)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a normalized owner sign-up request', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderOwnerSignUpForm({ onSubmit });

    await user.type(screen.getByLabelText('Name'), '  Owner  ');
    await user.type(screen.getByLabelText('Email address'), 'OWNER@EXAMPLE.COM');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.selectOptions(screen.getByLabelText('Default currency'), 'TRY');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'en',
      defaultCurrency: 'TRY',
    });
  });

  it('disables submission while owner sign-up is pending', () => {
    renderOwnerSignUpForm({ isSubmitting: true });

    expect(screen.getByRole('button', { name: 'Creating account' })).toBeDisabled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();

    renderOwnerSignUpForm();

    const passwordInput = screen.getByLabelText('Password');

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('defaults preferred language from the active locale', () => {
    const alternateLocale = getAlternateLocale();
    const alternateI18n = createAppI18nInstance(alternateLocale);

    setBrowserLanguages([`${alternateLocale}-${alternateLocale.toUpperCase()}`]);

    renderOwnerSignUpForm();

    expect(screen.getByLabelText(alternateI18n.t('auth.signUp.languageLabel'))).toHaveValue(
      alternateLocale,
    );
  });

  it('submits explicit language changes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const alternateLocale = getAlternateLocale();

    renderOwnerSignUpForm({ onSubmit });

    await user.type(screen.getByLabelText('Name'), 'Owner');
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    const submitButton = screen.getByRole('button', { name: 'Create account' });

    await user.selectOptions(screen.getByLabelText('Interface language'), alternateLocale);
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ preferredLanguage: alternateLocale }),
    );
  });
});
