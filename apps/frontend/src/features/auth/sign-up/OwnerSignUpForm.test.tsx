import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalizationProvider } from '../../../shared/localization';
import { OwnerSignUpForm } from './OwnerSignUpForm';

function renderOwnerSignUpForm({
  isSubmitting = false,
  onSubmit = vi.fn(),
}: {
  isSubmitting?: boolean;
  onSubmit?: ComponentProps<typeof OwnerSignUpForm>['onSubmit'];
} = {}) {
  return render(
    <LocalizationProvider>
      <OwnerSignUpForm isSubmitting={isSubmitting} onSubmit={onSubmit} />
    </LocalizationProvider>,
  );
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
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
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Interface language')).toBeInTheDocument();
    expect(screen.getByLabelText('Default currency')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeInTheDocument();
  });

  it('shows Zod validation errors beneath matching inputs before submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderOwnerSignUpForm({ onSubmit });

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(
      'Name is required.',
    );
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password must be between 8 and 128 characters.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a normalized owner sign-up request', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderOwnerSignUpForm({ onSubmit });

    await user.type(screen.getByLabelText('Name'), '  Owner  ');
    await user.type(screen.getByLabelText('Email address'), 'OWNER@EXAMPLE.COM');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.selectOptions(screen.getByLabelText('Interface language'), 'tr');
    await user.selectOptions(screen.getByLabelText('Default currency'), 'TRY');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'password123',
      preferredLanguage: 'tr',
      defaultCurrency: 'TRY',
    });
  });

  it('disables submission while owner sign-up is pending', () => {
    renderOwnerSignUpForm({ isSubmitting: true });

    expect(
      screen.getByRole('button', { name: 'Creating account' }),
    ).toBeDisabled();
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
    setBrowserLanguages(['tr-TR']);

    renderOwnerSignUpForm();

    expect(screen.getByLabelText('Interface language')).toHaveValue('tr');
  });

  it('submits explicit language changes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderOwnerSignUpForm({ onSubmit });

    await user.type(screen.getByLabelText('Name'), 'Owner');
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.selectOptions(screen.getByLabelText('Interface language'), 'tr');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ preferredLanguage: 'tr' }),
    );
  });
});
