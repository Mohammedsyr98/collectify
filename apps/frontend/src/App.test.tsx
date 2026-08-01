import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { renderWithAppProviders } from './shared/test/render';

function renderApp() {
  return renderWithAppProviders(<App />);
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: false,
          user: null,
          ownerProfile: null,
        }),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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

  it('shows protected owner context with a success toast after sign-up', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        authenticated: false,
        user: null,
        ownerProfile: null,
      }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      }),
    } as Response);
    renderApp();

    await user.type(await screen.findByLabelText('Name'), 'Owner');
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.selectOptions(screen.getByLabelText('Interface language'), 'tr');
    await user.selectOptions(screen.getByLabelText('Default currency'), 'TRY');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('Protected Collectify workspace'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('status', { name: 'Account created' }),
    ).toHaveTextContent('Your Collectify workspace is ready.');
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('TRY')).toBeInTheDocument();
  });

  it('shows server sign-up errors in a toast without field-level errors', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        authenticated: false,
        user: null,
        ownerProfile: null,
      }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        code: 'ACCOUNT_ALREADY_EXISTS',
        message: 'Check the highlighted fields.',
        fieldErrors: {
          email: ['An account already exists for this email.'],
        },
      }),
    } as Response);
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
    expect(screen.queryByText('Check the highlighted fields.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).not.toHaveAccessibleDescription();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('shows a failure toast for unexpected sign-up errors', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        authenticated: false,
        user: null,
        ownerProfile: null,
      }),
    } as Response);
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network unavailable'));
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            id: 'user_123',
            email: 'owner@example.com',
            name: 'Owner',
          },
          ownerProfile: null,
        }),
      }),
    );

    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Owner setup incomplete' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
});
