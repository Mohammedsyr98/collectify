import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { paymentApiErrorCode } from '@collectify/contracts';

import { paymentResources } from '../localization/resources';
import { renderPaymentDrawer } from './paymentDrawerTestUtils';
import { createPaymentTargetFixture } from './paymentTestData';

const paymentMessages = paymentResources.en.common.payments;

describe('PaymentDrawer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('submits the payment against the selected target and current debt version', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const target = createPaymentTargetFixture({
      scheduleItemId: 'schedule_123',
      debtVersion: 7,
    });

    renderPaymentDrawer(target, onSubmit);

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    await user.type(within(drawer).getByLabelText(paymentMessages.drawer.amountLabel), '25.20');
    await user.clear(within(drawer).getByLabelText(paymentMessages.drawer.dateLabel));
    await user.type(
      within(drawer).getByLabelText(paymentMessages.drawer.dateLabel),
      '2026-10-01',
    );
    await user.type(within(drawer).getByLabelText(paymentMessages.drawer.noteLabel), 'cash');
    await user.click(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      amount: '25.20',
      expectedDebtVersion: 7,
      note: 'cash',
      paymentDate: '2026-10-01',
      targetScheduleItemId: 'schedule_123',
    });
  }, 10_000);

  it('shows the selected target remaining and exact payment preview', async () => {
    const user = userEvent.setup();
    const target = createPaymentTargetFixture({
      amount: '60.00',
      remainingAmount: '45.05',
      plan: { type: 'installment', position: 1 },
    });

    renderPaymentDrawer(target);

    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    expect(within(drawer).getByText('$45.05')).toBeInTheDocument();
    expect(
      within(drawer).queryByText(paymentMessages.drawer.debtRemainingLabel),
    ).not.toBeInTheDocument();
    expect(within(drawer).getByLabelText(paymentMessages.drawer.amountLabel)).toHaveFocus();
    expect(within(drawer).getByLabelText(paymentMessages.drawer.amountLabel)).toHaveValue('');
    expect(
      within(drawer).getByLabelText(paymentMessages.drawer.amountLabel),
    ).toHaveAccessibleDescription(
      `${paymentMessages.drawer.targetAfterLabel}: ${paymentMessages.drawer.previewNotCalculated}`,
    );
    expect(
      within(drawer).queryByRole('button', { name: 'Pay full remaining amount' }),
    ).not.toBeInTheDocument();

    await user.type(within(drawer).getByLabelText(paymentMessages.drawer.amountLabel), '12.30');

    expect(within(drawer).getByText('$32.75')).toBeInTheDocument();
    expect(
      within(drawer).getByLabelText(paymentMessages.drawer.amountLabel),
    ).toHaveAccessibleDescription(`${paymentMessages.drawer.targetAfterLabel}: $32.75`);
    expect(
      within(drawer).queryByText(paymentMessages.drawer.debtAfterLabel),
    ).not.toBeInTheDocument();
  });

  it('rejects an amount above the selected target and a future payment date before submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const target = createPaymentTargetFixture({
      scheduleItemId: 'schedule_123',
      remainingAmount: '40.00',
      dueDate: '2026-10-30',
      timing: 'upcoming',
    });

    renderPaymentDrawer(target, onSubmit);
    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    const amountInput = within(drawer).getByLabelText(paymentMessages.drawer.amountLabel);
    const paymentDateInput = within(drawer).getByLabelText(paymentMessages.drawer.dateLabel);
    await user.type(amountInput, '40.01');
    await user.clear(paymentDateInput);
    await user.type(paymentDateInput, '9999-01-01');
    await user.click(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }),
    );

    await waitFor(() => {
      expect(amountInput).toHaveAccessibleDescription(
        paymentMessages.errors[paymentApiErrorCode.paymentAmountExceedsRemaining],
      );
      expect(paymentDateInput).toHaveAccessibleDescription(
        paymentMessages.errors[paymentApiErrorCode.paymentDateInFuture],
      );
    });
    expect(
      within(drawer).queryByText(`${paymentMessages.drawer.targetAfterLabel}:`, {
        exact: false,
      }),
    ).toBeNull();
    expect(within(drawer).queryByText('—')).toBeNull();
    expect(
      within(drawer).queryByText(paymentMessages.drawer.previewNotCalculated),
    ).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a payment dated before the current business date', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);

    renderPaymentDrawer(createPaymentTargetFixture(), onSubmit);
    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    await user.type(within(drawer).getByLabelText(paymentMessages.drawer.amountLabel), '10');
    await user.clear(within(drawer).getByLabelText(paymentMessages.drawer.dateLabel));
    await user.type(
      within(drawer).getByLabelText(paymentMessages.drawer.dateLabel),
      '2000-01-01',
    );
    await user.click(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }),
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ paymentDate: '2000-01-01' })),
    );
  });

  it('defaults the payment date to the Istanbul date on either side of midnight', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const target = createPaymentTargetFixture();

    vi.setSystemTime(new Date('2026-09-10T20:59:59Z'));
    const firstRender = renderPaymentDrawer(target);
    expect(screen.getByLabelText(paymentMessages.drawer.dateLabel)).toHaveValue('2026-09-10');

    firstRender.unmount();
    vi.setSystemTime(new Date('2026-09-10T21:00:00Z'));
    renderPaymentDrawer(target);
    expect(screen.getByLabelText(paymentMessages.drawer.dateLabel)).toHaveValue('2026-09-11');
  });

  it('allows only one submission and prevents dismissal while recording', async () => {
    const user = userEvent.setup();
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const onClose = vi.fn();

    renderPaymentDrawer(createPaymentTargetFixture(), onSubmit, onClose);
    const drawer = screen.getByRole('dialog', { name: paymentMessages.drawer.title });
    await user.type(within(drawer).getByLabelText(paymentMessages.drawer.amountLabel), '10');
    await user.click(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const amountInput = within(drawer).getByLabelText(paymentMessages.drawer.amountLabel);
    await user.click(amountInput);
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(amountInput).toHaveValue('10');
    expect(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.submitting }),
    ).toBeDisabled();
    expect(
      within(drawer).getByRole('button', { name: paymentMessages.drawer.close }),
    ).toBeDisabled();

    await user.keyboard('{Escape}');
    fireEvent.pointerDown(document.body);
    expect(drawer).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    resolveSubmit?.();
    await waitFor(() =>
      expect(
        within(drawer).getByRole('button', { name: paymentMessages.drawer.submit }),
      ).toBeEnabled(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
