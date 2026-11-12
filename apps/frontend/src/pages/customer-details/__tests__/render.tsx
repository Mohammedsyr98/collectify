import type { ReactElement } from 'react';

import { customerResources } from '@/features/customers';
import { debtResources } from '@/features/debts';
import { paymentResources } from '@/features/payments';
import { renderWithAppProviders as renderWithSharedProviders } from '@/shared/test';

import { customerDetailsResources } from '../localization/resources';

type SharedRenderOptions = Parameters<typeof renderWithSharedProviders>[1];

export function renderWithAppProviders(
  ui: ReactElement,
  options?: SharedRenderOptions,
) {
  return renderWithSharedProviders(ui, {
    ...options,
    resources: [
      customerResources,
      debtResources,
      paymentResources,
      customerDetailsResources,
    ],
  });
}

export { RouterLocationProbe, server } from '@/shared/test';
