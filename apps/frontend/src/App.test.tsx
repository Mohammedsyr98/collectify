import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
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
      await screen.findByRole('heading', { name: 'Create owner account' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('shows protected owner context after successful sign-up', async () => {
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

    fireEvent.change(await screen.findByLabelText('Name'), {
      target: { value: 'Owner' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Interface language'), {
      target: { value: 'tr' },
    });
    fireEvent.change(screen.getByLabelText('Default currency'), {
      target: { value: 'TRY' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('Protected Collectify workspace'),
    ).toBeInTheDocument();
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('TRY')).toBeInTheDocument();
  });

  it('keeps server sign-up errors on the auth screen', async () => {
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
        message: 'An account already exists for this email.',
        fieldErrors: {
          email: ['An account already exists for this email.'],
        },
      }),
    } as Response);
    renderApp();

    fireEvent.change(await screen.findByLabelText('Name'), {
      target: { value: 'Owner' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('alert', {
        name: 'Owner sign-up error',
      }),
    ).toHaveTextContent('An account already exists for this email.');
    expect(
      screen.queryByText('Protected Collectify workspace'),
    ).not.toBeInTheDocument();
  });

  it('shows an accessible fallback for unexpected sign-up errors', async () => {
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

    fireEvent.change(await screen.findByLabelText('Name'), {
      target: { value: 'Owner' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('alert', {
        name: 'Owner sign-up error',
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
