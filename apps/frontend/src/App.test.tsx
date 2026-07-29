import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
    vi.unstubAllGlobals();
  });

  it('shows a signed-out proof page without protected content', async () => {
    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Signed out' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No owner session is active.')).toBeInTheDocument();
    expect(screen.queryByText('Protected Collectify workspace')).not.toBeInTheDocument();
  });
});
