import { parseMoney } from '../money/index.js';

export type PaymentValidationInput = {
  readonly amount: string;
  readonly remainingAmount: string;
  readonly paymentDate: string;
  readonly businessDate: string;
};

export const paymentIssueCode = {
  paymentDateInFuture: 'PAYMENT_DATE_IN_FUTURE',
  paymentAmountExceedsRemaining: 'PAYMENT_AMOUNT_EXCEEDS_REMAINING',
} as const;

export type PaymentIssueCode =
  (typeof paymentIssueCode)[keyof typeof paymentIssueCode];

export type PaymentIssueTarget = 'amount' | 'paymentDate';

export type PaymentIssue = {
  readonly code: PaymentIssueCode;
  readonly target: PaymentIssueTarget;
};

export type PaymentValidationResult =
  | { readonly success: true }
  | { readonly success: false; readonly issues: readonly PaymentIssue[] };

export function validatePayment(
  input: PaymentValidationInput,
): PaymentValidationResult {
  const issues: PaymentIssue[] = [];

  if (input.paymentDate > input.businessDate) {
    issues.push({
      code: paymentIssueCode.paymentDateInFuture,
      target: 'paymentDate',
    });
  }

  if (parseMoney(input.amount) > parseMoney(input.remainingAmount)) {
    issues.push({
      code: paymentIssueCode.paymentAmountExceedsRemaining,
      target: 'amount',
    });
  }

  return issues.length === 0 ? { success: true } : { success: false, issues };
}
