import type { ReactElement } from 'react';

import {
  renderWithAppProviders as renderWithSharedProviders,
} from '@/shared/test';

import { createAppI18nInstance } from '../localization/i18n';

type SharedRenderOptions = Parameters<typeof renderWithSharedProviders>[1];

export function renderWithAppProviders(
  ui: ReactElement,
  options?: SharedRenderOptions,
) {
  return renderWithSharedProviders(ui, {
    ...options,
    createI18nInstance: createAppI18nInstance,
  });
}
