import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ToastProvider } from '@/shared/ui/toast';

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
    <QueryClientProvider client={queryClient}>
      <AppLocalizationProvider>
        <ToastProvider>{children}</ToastProvider>
      </AppLocalizationProvider>
    </QueryClientProvider>
  );
}
