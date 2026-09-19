export const debtApiErrorCode = {
  validationError: 'VALIDATION_ERROR',
  debtNotFound: 'DEBT_NOT_FOUND',
} as const;

export const debtApiErrorCodes = [
  debtApiErrorCode.validationError,
  debtApiErrorCode.debtNotFound,
] as const;

export type DebtApiErrorCode = (typeof debtApiErrorCodes)[number];

const debtApiErrorCodeSet = new Set<string>(debtApiErrorCodes);

export function isDebtApiErrorCode(
  code: string | undefined,
): code is DebtApiErrorCode {
  return typeof code === 'string' && debtApiErrorCodeSet.has(code);
}
