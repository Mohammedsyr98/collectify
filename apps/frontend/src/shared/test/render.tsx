import type { Resource } from 'i18next';
import { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';

import {
  createI18nInstance as createLocalizationI18nInstance,
  LocalizationProvider,
  sharedLocalizationResources,
  type CreateI18nInstance,
} from '../localization';
import { ProviderStack } from '../lib';

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
  options?: RenderOptions & {
    initialEntries?: string[];
    queryClient?: QueryClient;
    createI18nInstance?: CreateI18nInstance;
    resources?: readonly Resource[];
  },
) {
  const {
    initialEntries: explicitInitialEntries,
    queryClient: explicitQueryClient,
    createI18nInstance: explicitCreateI18nInstance,
    resources,
    ...renderOptions
  } = options ?? {};
  const queryClient = explicitQueryClient ?? createTestQueryClient();
  const initialEntries = explicitInitialEntries ?? ['/'];
  const createI18nInstance =
    explicitCreateI18nInstance ?? createTestI18nInstance(resources);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <ProviderStack queryClient={queryClient}>
          <LocalizationProvider createI18nInstance={createI18nInstance}>
            {children}
          </LocalizationProvider>
        </ProviderStack>
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

export function createTestI18nInstance(
  resources: readonly Resource[] = [],
): CreateI18nInstance {
  const testResources = mergeResources([sharedLocalizationResources, ...resources]);

  return (initialLocale) =>
    createLocalizationI18nInstance({
      initialLocale,
      resources: testResources,
    });
}

function mergeResources(resources: readonly Resource[]): Resource {
  return resources.reduce<Resource>(
    (merged, resource) => mergeRecord(merged, resource) as Resource,
    {} as Resource,
  );
}

function mergeRecord(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    const previousValue = target[key];

    if (isRecord(previousValue) && isRecord(value)) {
      target[key] = mergeRecord({ ...previousValue }, value);
    } else {
      target[key] = value;
    }
  }

  return target;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
