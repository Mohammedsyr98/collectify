import type { ReactElement } from 'react';

import { renderWithAppProviders as renderWithSharedProviders } from '@/shared/test';

import { customerResources } from '../localization/resources';

type SharedRenderOptions = Parameters<typeof renderWithSharedProviders>[1];

export function renderWithAppProviders(
  ui: ReactElement,
  options?: SharedRenderOptions,
) {
  return renderWithSharedProviders(ui, {
    ...options,
    resources: [customerResources],
  });
}
