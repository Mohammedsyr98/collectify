import { debtApiErrorCode } from '@collectify/contracts';
import { describe, expect, it } from 'vitest';

import { checkDebtPaymentHistoryChange } from './debt-payment-history';

const currentDebt = { currency: 'USD' };
const onePaymentSchedule = [{ id: 'schedule_one' }];

function facts(
  entries: ReadonlyArray<readonly [string, readonly string[]]>,
) {
  return new Map(entries);
}

describe('checkDebtPaymentHistoryChange', () => {
  it('allows a replacement when no payment has been recorded', () => {
    expect(
      checkDebtPaymentHistoryChange({
        currentDebt,
        currentScheduleItems: onePaymentSchedule,
        paymentAmountsByScheduleItemId: facts([]),
        change: {
          kind: 'replace',
          replacement: {
            currency: 'EUR',
            totalAmount: '100.00',
            scheduleItems: [{ id: 'schedule_one', amount: '100.00' }],
          },
        },
      }),
    ).toBeNull();
  });

  it('rejects deleting a debt with recorded payments', () => {
    expect(
      checkDebtPaymentHistoryChange({
        currentDebt,
        currentScheduleItems: onePaymentSchedule,
        paymentAmountsByScheduleItemId: facts([['schedule_one', ['25.00']]]),
        change: { kind: 'delete' },
      }),
    ).toBe(debtApiErrorCode.debtHasPayments);
  });

  it('rejects changing currency after a payment is recorded', () => {
    expect(
      checkDebtPaymentHistoryChange({
        currentDebt,
        currentScheduleItems: onePaymentSchedule,
        paymentAmountsByScheduleItemId: facts([['schedule_one', ['25.00']]]),
        change: {
          kind: 'replace',
          replacement: {
            currency: 'EUR',
            totalAmount: '100.00',
            scheduleItems: [{ id: 'schedule_one', amount: '100.00' }],
          },
        },
      }),
    ).toBe(debtApiErrorCode.debtCurrencyChangeBlocked);
  });

  it('rejects changing between one payment and installments after a payment', () => {
    expect(
      checkDebtPaymentHistoryChange({
        currentDebt,
        currentScheduleItems: onePaymentSchedule,
        paymentAmountsByScheduleItemId: facts([['schedule_one', ['25.00']]]),
        change: {
          kind: 'replace',
          replacement: {
            currency: 'USD',
            totalAmount: '100.00',
            scheduleItems: [
              { id: 'schedule_one', amount: '60.00' },
              { amount: '40.00' },
            ],
          },
        },
      }),
    ).toBe(debtApiErrorCode.debtPaymentPlanChangeBlocked);
  });

  it('rejects removing a schedule item with recorded payments', () => {
    expect(
      checkDebtPaymentHistoryChange({
        currentDebt,
        currentScheduleItems: [
          { id: 'schedule_one' },
          { id: 'schedule_two' },
        ],
        paymentAmountsByScheduleItemId: facts([['schedule_one', ['25.00']]]),
        change: {
          kind: 'replace',
          replacement: {
            currency: 'USD',
            totalAmount: '100.00',
            scheduleItems: [
              { amount: '25.00' },
              { id: 'schedule_two', amount: '75.00' },
            ],
          },
        },
      }),
    ).toBe(debtApiErrorCode.debtScheduleItemHasPayments);
  });

  it('rejects reducing a schedule item below its recorded payments', () => {
    expect(
      checkDebtPaymentHistoryChange({
        currentDebt,
        currentScheduleItems: onePaymentSchedule,
        paymentAmountsByScheduleItemId: facts([['schedule_one', ['25.30']]]),
        change: {
          kind: 'replace',
          replacement: {
            currency: 'USD',
            totalAmount: '20.00',
            scheduleItems: [{ id: 'schedule_one', amount: '20.00' }],
          },
        },
      }),
    ).toBe(debtApiErrorCode.debtScheduleItemAmountBelowPaid);
  });

  it('rejects reducing the debt total below all recorded payments', () => {
    expect(
      checkDebtPaymentHistoryChange({
        currentDebt,
        currentScheduleItems: [
          { id: 'schedule_one' },
          { id: 'schedule_two' },
        ],
        paymentAmountsByScheduleItemId: facts([
          ['schedule_one', ['30.00']],
          ['schedule_two', ['30.00']],
        ]),
        change: {
          kind: 'replace',
          replacement: {
            currency: 'USD',
            totalAmount: '50.00',
            scheduleItems: [
              { id: 'schedule_one', amount: '30.00' },
              { id: 'schedule_two', amount: '30.00' },
            ],
          },
        },
      }),
    ).toBe(debtApiErrorCode.debtTotalAmountBelowPaid);
  });
});
