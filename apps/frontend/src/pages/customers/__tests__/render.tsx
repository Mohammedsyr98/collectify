import type { ReactElement } from 'react';

import { customerResources } from '@/features/customers';
import { renderWithAppProviders as renderWithSharedProviders } from '@/shared/test';

import { customerDirectoryResources } from '../localization/resources';

type SharedRenderOptions = Parameters<typeof renderWithSharedProviders>[1];

export function renderWithAppProviders(
  ui: ReactElement,
  options?: SharedRenderOptions,
) {
  return renderWithSharedProviders(ui, {
    ...options,
    resources: [customerResources, customerDirectoryResources],
  });
}

export { RouterLocationProbe } from '@/shared/test';
