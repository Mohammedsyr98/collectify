import type { SupportedLocale } from '../../../shared/localization';

const debtStrings = {
  drawer: {
    close: 'Close debt form',
    description: 'Create a one-payment debt for this customer.',
    title: 'Add debt',
  },
  form: {
    cancel: 'Cancel',
    currencyLabel: 'Currency',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Website redesign',
    dueDateLabel: 'Due date',
    save: 'Save debt',
    saving: 'Saving',
    totalAmountLabel: 'Total amount',
    totalAmountPlaceholder: '125.50',
  },
  toast: {
    create: {
      errorTitle: 'Could not create debt',
      successDescription: '{{description}} was added.',
      successTitle: 'Debt created',
    },
  },
} as const;

export const debtResources = {
  en: { common: { debts: debtStrings } },
  tr: { common: { debts: debtStrings } },
  ar: { common: { debts: debtStrings } },
} satisfies Record<
  SupportedLocale,
  { common: { debts: Record<string, unknown> } }
>;
