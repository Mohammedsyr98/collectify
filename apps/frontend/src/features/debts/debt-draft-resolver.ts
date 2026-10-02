import {
  set,
  type FieldErrors,
  type Resolver,
} from 'react-hook-form';

import {
  createDebtRequestSchema,
  type CreateDebtRequest,
  type Currency,
} from '@collectify/contracts';

export type DebtDraft = {
  description: string;
  totalAmount: string;
  currency: Currency;
  dueDate: string;
};

export const debtDraftResolver: Resolver<
  DebtDraft,
  unknown,
  CreateDebtRequest
> = (draft) => {
  const result = createDebtRequestSchema.safeParse({
    description: draft.description,
    totalAmount: draft.totalAmount,
    currency: draft.currency,
    scheduleItems: [
      {
        amount: draft.totalAmount,
        dueDate: draft.dueDate,
      },
    ],
  });

  if (result.success) {
    return { values: result.data, errors: {} };
  }

  const errors: FieldErrors<DebtDraft> = {};

  for (const issue of result.error.issues) {
    const field = draftField(issue.path);

    if (!errors[field]) {
      set(errors, field, {
        message: issue.message,
        type: 'validate',
      });
    }
  }

  return { values: {}, errors };
};

function draftField(
  [field, , nestedField]: readonly PropertyKey[],
): keyof DebtDraft | 'root' {
  if (field === 'scheduleItems') {
    if (nestedField === 'amount') {
      return 'totalAmount';
    }

    if (nestedField === 'dueDate') {
      return 'dueDate';
    }

    return 'root';
  }

  if (
    field === 'description' ||
    field === 'totalAmount' ||
    field === 'currency'
  ) {
    return field;
  }

  return 'root';
}
