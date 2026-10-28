import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderPaymentDrawer } from './paymentDrawerTestUtils';
import { createPaymentTargetFixture } from './paymentTestData';

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

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '25.20');
    await user.clear(within(drawer).getByLabelText('Payment date'));
    await user.type(within(drawer).getByLabelText('Payment date'), '2026-10-01');
    await user.type(within(drawer).getByLabelText('Note (optional)'), 'cash');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

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

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    expect(within(drawer).getByText('$45.05')).toBeInTheDocument();
    expect(within(drawer).queryByText('Debt remaining')).not.toBeInTheDocument();
    expect(within(drawer).getByLabelText('Payment amount')).toHaveFocus();
    expect(within(drawer).getByLabelText('Payment amount')).toHaveValue('');

    await user.type(within(drawer).getByLabelText('Payment amount'), '12.30');

    expect(within(drawer).getByText('$32.75')).toBeInTheDocument();
    expect(within(drawer).queryByText('Debt remaining after payment')).not.toBeInTheDocument();
  });

  it("fills the selected target's remaining amount without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const target = createPaymentTargetFixture({
      amount: '60.00',
      remainingAmount: '45.05',
      plan: { type: 'installment', position: 1 },
    });

    renderPaymentDrawer(target, onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });

    await user.click(within(drawer).getByRole('button', { name: 'Pay full remaining amount' }));

    expect(within(drawer).getByLabelText('Payment amount')).toHaveValue('45.05');
    expect(within(drawer).getByText('$0.00')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
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
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    const amountInput = within(drawer).getByLabelText('Payment amount');
    const paymentDateInput = within(drawer).getByLabelText('Payment date');
    await user.type(amountInput, '40.01');
    await user.clear(paymentDateInput);
    await user.type(paymentDateInput, '9999-01-01');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() => {
      expect(amountInput).toHaveAccessibleDescription(
        'Payment exceeds the target remaining amount.',
      );
      expect(paymentDateInput).toHaveAccessibleDescription(
        'Payment date cannot be in the future.',
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a payment dated before the current business date', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);

    renderPaymentDrawer(createPaymentTargetFixture(), onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '10');
    await user.clear(within(drawer).getByLabelText('Payment date'));
    await user.type(within(drawer).getByLabelText('Payment date'), '2000-01-01');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ paymentDate: '2000-01-01' })),
    );
  });

  it('defaults the payment date to the Istanbul date on either side of midnight', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const target = createPaymentTargetFixture();

    vi.setSystemTime(new Date('2026-09-10T20:59:59Z'));
    const firstRender = renderPaymentDrawer(target);
    expect(screen.getByLabelText('Payment date')).toHaveValue('2026-09-10');

    firstRender.unmount();
    vi.setSystemTime(new Date('2026-09-10T21:00:00Z'));
    renderPaymentDrawer(target);
    expect(screen.getByLabelText('Payment date')).toHaveValue('2026-09-11');
  });

  it('allows only one submission while recording', async () => {
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
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '10');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const amountInput = within(drawer).getByLabelText('Payment amount');
    await user.click(amountInput);
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(amountInput).toHaveValue('10');
    expect(within(drawer).getByRole('button', { name: 'Recording' })).toBeDisabled();
    expect(within(drawer).getByRole('button', { name: 'Close payment form' })).toBeDisabled();

    resolveSubmit?.();
    await waitFor(() =>
      expect(within(drawer).getByRole('button', { name: 'Record payment' })).toBeEnabled(),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
