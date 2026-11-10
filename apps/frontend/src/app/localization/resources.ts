import { authResources } from '@/features/auth';
import { sharedLocalizationResources, type SupportedLocale } from '@/shared/localization';

import { debtResources } from '@/features/debts';
import { customerResources } from '@/features/customers';
import { paymentResources } from '@/features/payments';
import { customerDetailsResources } from '@/pages/customer-details';
import { customerDirectoryResources } from '@/pages/customers';

import { appShellResources } from './appShellResources';

export const appI18nResources = {
  en: {
    common: {
      ...appShellResources.en.common,
      ...authResources.en.common,
      customers: {
        ...customerResources.en.common.customers,
        ...customerDetailsResources.en.common.customers,
        actions: {
          ...customerResources.en.common.customers.actions,
          ...customerDetailsResources.en.common.customers.actions,
        },
      },
      ...customerDirectoryResources.en.common,
      debts: {
        ...debtResources.en.common.debts,
        ...customerDetailsResources.en.common.debts,
      },
      ...paymentResources.en.common,
      ...sharedLocalizationResources.en.common,
    },
  },
  tr: {
    common: {
      ...appShellResources.tr.common,
      ...authResources.tr.common,
      customers: {
        ...customerResources.tr.common.customers,
        ...customerDetailsResources.tr.common.customers,
        actions: {
          ...customerResources.tr.common.customers.actions,
          ...customerDetailsResources.tr.common.customers.actions,
        },
      },
      ...customerDirectoryResources.tr.common,
      debts: {
        ...debtResources.tr.common.debts,
        ...customerDetailsResources.tr.common.debts,
      },
      ...paymentResources.tr.common,
      ...sharedLocalizationResources.tr.common,
    },
  },
  ar: {
    common: {
      ...appShellResources.ar.common,
      ...authResources.ar.common,
      customers: {
        ...customerResources.ar.common.customers,
        ...customerDetailsResources.ar.common.customers,
        actions: {
          ...customerResources.ar.common.customers.actions,
          ...customerDetailsResources.ar.common.customers.actions,
        },
      },
      ...customerDirectoryResources.ar.common,
      debts: {
        ...debtResources.ar.common.debts,
        ...customerDetailsResources.ar.common.debts,
      },
      ...paymentResources.ar.common,
      ...sharedLocalizationResources.ar.common,
    },
  },
} satisfies Record<SupportedLocale, { common: Record<string, unknown> }>;
