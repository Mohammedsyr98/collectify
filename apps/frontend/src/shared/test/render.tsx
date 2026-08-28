import { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import { AppProviders } from '../../app/AppProviders';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export function renderWithAppProviders(
  ui: ReactElement,
  options?: RenderOptions & { initialEntries?: string[]; queryClient?: QueryClient },
) {
  const { initialEntries: explicitInitialEntries, queryClient: explicitQueryClient, ...renderOptions } =
    options ?? {};
  const queryClient = explicitQueryClient ?? createTestQueryClient();
  const initialEntries = explicitInitialEntries ?? ['/'];

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <AppProviders queryClient={queryClient}>{children}</AppProviders>
      </MemoryRouter>
    );
  }

  return {
    queryClient,
    ...render(ui, {
      ...renderOptions,
      wrapper: Wrapper,
    }),
  };
}
