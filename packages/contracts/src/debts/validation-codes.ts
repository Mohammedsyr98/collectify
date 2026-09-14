export const debtValidationCode = {
  debtDescriptionRequired: 'DEBT_DESCRIPTION_REQUIRED',
  debtDescriptionTooLong: 'DEBT_DESCRIPTION_TOO_LONG',
  debtDueDateInvalid: 'DEBT_DUE_DATE_INVALID',
  debtDueDateRequired: 'DEBT_DUE_DATE_REQUIRED',
  debtTotalAmountInvalid: 'DEBT_TOTAL_AMOUNT_INVALID',
  debtTotalAmountTooLarge: 'DEBT_TOTAL_AMOUNT_TOO_LARGE',
  debtTotalAmountMustBePositive: 'DEBT_TOTAL_AMOUNT_MUST_BE_POSITIVE',
} as const;

export const debtValidationCodes = [
  debtValidationCode.debtDescriptionRequired,
  debtValidationCode.debtDescriptionTooLong,
  debtValidationCode.debtDueDateInvalid,
  debtValidationCode.debtDueDateRequired,
  debtValidationCode.debtTotalAmountInvalid,
  debtValidationCode.debtTotalAmountTooLarge,
  debtValidationCode.debtTotalAmountMustBePositive,
] as const;

export type DebtValidationCode = (typeof debtValidationCodes)[number];

const debtValidationCodeSet = new Set<string>(debtValidationCodes);

export function isDebtValidationCode(
  code: string | undefined,
): code is DebtValidationCode {
  return typeof code === 'string' && debtValidationCodeSet.has(code);
}
