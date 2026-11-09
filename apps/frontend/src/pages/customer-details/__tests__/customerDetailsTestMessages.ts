import { customerResources } from '@/features/customers';
import { debtResources } from '@/features/debts';
import { paymentResources } from '@/features/payments';

import { customerDetailsResources } from '../localization/resources';

export const customerMessages = {
  ...customerResources.en.common.customers,
  ...customerDetailsResources.en.common.customers,
  actions: {
    ...customerResources.en.common.customers.actions,
    ...customerDetailsResources.en.common.customers.actions,
  },
};

export const debtMessages = {
  ...debtResources.en.common.debts,
  ...customerDetailsResources.en.common.debts,
};

export const paymentMessages = paymentResources.en.common.payments;
