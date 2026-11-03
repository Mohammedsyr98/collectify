export const debtApiErrorCode = {
  validationError: 'VALIDATION_ERROR',
  debtNotFound: 'DEBT_NOT_FOUND',
  debtVersionConflict: 'DEBT_VERSION_CONFLICT',
  debtHasPayments: 'DEBT_HAS_PAYMENTS',
  debtCurrencyChangeBlocked: 'DEBT_CURRENCY_CHANGE_BLOCKED',
  debtPaymentPlanChangeBlocked: 'DEBT_PAYMENT_PLAN_CHANGE_BLOCKED',
  debtScheduleItemHasPayments: 'DEBT_SCHEDULE_ITEM_HAS_PAYMENTS',
  debtScheduleItemAmountBelowPaid: 'DEBT_SCHEDULE_ITEM_AMOUNT_BELOW_PAID',
  debtTotalAmountBelowPaid: 'DEBT_TOTAL_AMOUNT_BELOW_PAID',
} as const;

export const debtApiErrorCodes = [
  debtApiErrorCode.validationError,
  debtApiErrorCode.debtNotFound,
  debtApiErrorCode.debtVersionConflict,
  debtApiErrorCode.debtHasPayments,
  debtApiErrorCode.debtCurrencyChangeBlocked,
  debtApiErrorCode.debtPaymentPlanChangeBlocked,
  debtApiErrorCode.debtScheduleItemHasPayments,
  debtApiErrorCode.debtScheduleItemAmountBelowPaid,
  debtApiErrorCode.debtTotalAmountBelowPaid,
] as const;

export type DebtApiErrorCode = (typeof debtApiErrorCodes)[number];

const debtApiErrorCodeSet = new Set<string>(debtApiErrorCodes);

export function isDebtApiErrorCode(
  code: string | undefined,
): code is DebtApiErrorCode {
  return typeof code === 'string' && debtApiErrorCodeSet.has(code);
}
