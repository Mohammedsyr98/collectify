import { authResources } from '../../features/auth/localization/resources';
import { customerResources } from '../../features/customers/localization/resources';
import { debtResources } from '../../features/debts/localization/resources';
import { sharedLocalizationResources, type SupportedLocale } from '../../shared/localization';

import { appShellResources } from './appShellResources';

export const appI18nResources = {
  en: {
    common: {
      ...appShellResources.en.common,
      ...authResources.en.common,
      ...customerResources.en.common,
      ...debtResources.en.common,
      ...sharedLocalizationResources.en.common,
    },
  },
  tr: {
    common: {
      ...appShellResources.tr.common,
      ...authResources.tr.common,
      ...customerResources.tr.common,
      ...debtResources.tr.common,
      ...sharedLocalizationResources.tr.common,
    },
  },
  ar: {
    common: {
      ...appShellResources.ar.common,
      ...authResources.ar.common,
      ...customerResources.ar.common,
      ...debtResources.ar.common,
      ...sharedLocalizationResources.ar.common,
    },
  },
} satisfies Record<SupportedLocale, { common: Record<string, unknown> }>;
