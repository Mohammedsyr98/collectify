import type { Resource } from 'i18next';

import { authResources } from '../../features/auth/localization/resources';
import { sharedLocalizationResources } from '../../shared/localization';

import { appShellResources } from './appShellResources';

export const appI18nResources = {
  en: {
    common: {
      ...appShellResources.en.common,
      ...authResources.en.common,
      ...sharedLocalizationResources.en.common,
    },
  },
  tr: {
    common: {
      ...appShellResources.tr.common,
      ...authResources.tr.common,
      ...sharedLocalizationResources.tr.common,
    },
  },
} satisfies Resource;
