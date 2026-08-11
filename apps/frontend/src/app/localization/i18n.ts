import {
  createI18nInstance,
  type SupportedLocale,
} from '../../shared/localization';

import { appI18nResources } from './resources';

export function createAppI18nInstance(initialLocale: SupportedLocale) {
  return createI18nInstance({
    initialLocale,
    resources: appI18nResources,
  });
}
