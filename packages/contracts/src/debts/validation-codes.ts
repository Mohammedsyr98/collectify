import {
  debtPlanIssueCode,
  type DebtPlanIssueCode,
} from '@collectify/domain/debt-plan';

export { debtPlanIssueCode } from '@collectify/domain/debt-plan';

export const debtRequestValidationCode = {
  debtDescriptionRequired: 'DEBT_DESCRIPTION_REQUIRED',
  debtDescriptionTooLong: 'DEBT_DESCRIPTION_TOO_LONG',
  debtDueDateInvalid: 'DEBT_DUE_DATE_INVALID',
  debtDueDateRequired: 'DEBT_DUE_DATE_REQUIRED',
  debtScheduleItemAmountInvalid: 'DEBT_SCHEDULE_ITEM_AMOUNT_INVALID',
  debtTotalAmountInvalid: 'DEBT_TOTAL_AMOUNT_INVALID',
  debtTotalAmountTooLarge: 'DEBT_TOTAL_AMOUNT_TOO_LARGE',
} as const;

export type DebtValidationCode =
  | (typeof debtRequestValidationCode)[keyof typeof debtRequestValidationCode]
  | DebtPlanIssueCode;

export const debtValidationCodes: readonly DebtValidationCode[] = [
  ...Object.values(debtRequestValidationCode),
  ...Object.values(debtPlanIssueCode),
];

const debtValidationCodeSet = new Set<string>(debtValidationCodes);

export function isDebtValidationCode(
  code: string | undefined,
): code is DebtValidationCode {
  return typeof code === 'string' && debtValidationCodeSet.has(code);
}
