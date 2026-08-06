import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OwnerSignInForm } from './OwnerSignInForm';

describe('OwnerSignInForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the owner sign-in controls', () => {
    render(<OwnerSignInForm isSubmitting={false} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Enter workspace' }),
    ).toBeInTheDocument();
  });

  it('shows Zod validation errors beneath matching inputs before submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<OwnerSignInForm isSubmitting={false} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Enter workspace' }));

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password is required.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a normalized owner sign-in request', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<OwnerSignInForm isSubmitting={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email address'), 'OWNER@EXAMPLE.COM');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Enter workspace' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'password123',
    });
  });

  it('disables submission while owner sign-in is pending', () => {
    render(<OwnerSignInForm isSubmitting={true} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Signing in' })).toBeDisabled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();

    render(<OwnerSignInForm isSubmitting={false} onSubmit={vi.fn()} />);

    const passwordInput = screen.getByLabelText('Password');

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));

    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
