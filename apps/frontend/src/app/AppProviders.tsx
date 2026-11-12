import { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ProviderStack } from '@/shared/lib';

import { AppLocalizationProvider } from './localization/AppLocalizationProvider';

const defaultQueryClient = new QueryClient();

export function AppProviders({
  children,
  queryClient = defaultQueryClient,
}: {
  children: ReactNode;
  queryClient?: QueryClient;
}) {
  return (
    <ProviderStack queryClient={queryClient}>
      <AppLocalizationProvider>
        {children}
      </AppLocalizationProvider>
    </ProviderStack>
  );
}
