import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { LocalizationProvider } from '../shared/localization';
import { ToastProvider } from '../shared/ui/toast/ToastProvider';

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
      <LocalizationProvider>
        <ToastProvider>{children}</ToastProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
}
