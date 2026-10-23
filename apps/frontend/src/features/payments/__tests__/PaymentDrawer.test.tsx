import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DebtResponse } from '@collectify/contracts';

import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { createDebtFixture, createInstallmentDebtFixture } from '../../debts/__tests__/debtTestData';
import {
  PaymentDrawer,
} from '../editor/PaymentDrawer';
import type { PaymentSubmissionRequest } from '../api/record-payment';

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

  it('shows the selected target, debt remaining, and exact payment preview', async () => {
    const user = userEvent.setup();
    const debt = createInstallmentDebtFixture('customer_123', {
      totalAmount: '100.00',
      remainingAmount: '85.05',
      scheduleItems: [
        {
          id: 'schedule_1',
          position: 1,
          amount: '60.00',
          remainingAmount: '45.05',
          dueDate: '2026-10-01',
          timing: 'overdue',
        },
        {
          id: 'schedule_2',
          position: 2,
          amount: '40.00',
          remainingAmount: '40.00',
          dueDate: '2026-11-01',
          timing: 'upcoming',
        },
      ],
    });

    renderPaymentDrawer(debt, 'schedule_1');

    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    expect(within(drawer).getByText('$45.05')).toBeInTheDocument();
    expect(within(drawer).getByText('$85.05')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Payment amount')).toHaveFocus();

    await user.type(within(drawer).getByLabelText('Payment amount'), '12.30');

    expect(within(drawer).getByText('$32.75')).toBeInTheDocument();
    expect(within(drawer).getByText('$72.75')).toBeInTheDocument();
  });

  it("fills the selected target's remaining amount without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const debt = createInstallmentDebtFixture('customer_123', {
      totalAmount: '100.00',
      remainingAmount: '85.05',
      scheduleItems: [
        {
          id: 'schedule_1',
          position: 1,
          amount: '60.00',
          remainingAmount: '45.05',
          dueDate: '2026-10-01',
          timing: 'overdue',
        },
        {
          id: 'schedule_2',
          position: 2,
          amount: '40.00',
          remainingAmount: '40.00',
          dueDate: '2026-11-01',
          timing: 'upcoming',
        },
      ],
    });

    renderPaymentDrawer(debt, 'schedule_1', onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });

    await user.click(within(drawer).getByRole('button', { name: 'Pay full remaining amount' }));

    expect(within(drawer).getByLabelText('Payment amount')).toHaveValue('45.05');
    expect(within(drawer).getByText('$0.00')).toBeInTheDocument();
    expect(within(drawer).getByText('$40.00')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the selected target and current debt version', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const debt = createDebtFixture('customer_123', {
      totalAmount: '100.00',
      remainingAmount: '74.80',
      version: 7,
    });

    renderPaymentDrawer(debt, debt.scheduleItems[0].id, onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });

    await user.type(within(drawer).getByLabelText('Payment amount'), '25.20');
    await user.type(within(drawer).getByLabelText('Note (optional)'), 'cash');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '25.20',
          expectedDebtVersion: 7,
          note: 'cash',
          paymentDate: expect.any(String),
          targetScheduleItemId: debt.scheduleItems[0].id,
        }),
      ),
    );
  });

  it('rejects an amount above the selected target and a future payment date before submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const debt = createDebtFixture('customer_123', {
      totalAmount: '100.00',
      remainingAmount: '40.00',
      scheduleItems: [
        {
          id: 'schedule_123',
          position: 1,
          amount: '100.00',
          remainingAmount: '40.00',
          dueDate: '2026-10-30',
          timing: 'upcoming',
        },
      ],
    });

    renderPaymentDrawer(debt, debt.scheduleItems[0].id, onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '40.01');
    await user.clear(within(drawer).getByLabelText('Payment date'));
    await user.type(within(drawer).getByLabelText('Payment date'), '9999-01-01');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    expect(within(drawer).getByText('Payment exceeds the target remaining amount.')).toBeInTheDocument();
    expect(within(drawer).getByText('Payment date cannot be in the future.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a payment dated before the current business date', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const debt = createDebtFixture('customer_123');

    renderPaymentDrawer(debt, debt.scheduleItems[0].id, onSubmit);
    const drawer = screen.getByRole('dialog', { name: 'Record payment' });
    await user.type(within(drawer).getByLabelText('Payment amount'), '10');
    await user.clear(within(drawer).getByLabelText('Payment date'));
    await user.type(within(drawer).getByLabelText('Payment date'), '2000-01-01');
    await user.click(within(drawer).getByRole('button', { name: 'Record payment' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ paymentDate: '2000-01-01' }),
      ),
    );
  });

  it('defaults the payment date to the Istanbul date on either side of midnight', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const debt = createDebtFixture('customer_123');

    vi.setSystemTime(new Date('2026-09-10T20:59:59Z'));
    const firstRender = renderPaymentDrawer(debt, debt.scheduleItems[0].id);
    expect(screen.getByLabelText('Payment date')).toHaveValue('2026-09-10');

    firstRender.unmount();
    vi.setSystemTime(new Date('2026-09-10T21:00:00Z'));
    renderPaymentDrawer(debt, debt.scheduleItems[0].id);
    expect(screen.getByLabelText('Payment date')).toHaveValue('2026-09-11');
  });

  it('allows only one submission while recording', async () => {
    const user = userEvent.setup();
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(
      () => new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      }),
    );
    const onClose = vi.fn();
    const debt = createDebtFixture('customer_123');

    renderPaymentDrawer(debt, debt.scheduleItems[0].id, onSubmit, onClose);
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

  it('closes with Escape and returns focus to the opening button', async () => {
    const user = userEvent.setup();
    const debt = createDebtFixture('customer_123');

    renderWithAppProviders(<PaymentDrawerHarness debt={debt} />);
    const openButton = screen.getByRole('button', { name: 'Open payment' });
    await user.click(openButton);

    expect(screen.getByRole('dialog', { name: 'Record payment' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Record payment' })).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it('renders the payment drawer in Arabic right-to-left mode', () => {
    window.localStorage.setItem(localeStorageKey, 'ar');
    const debt = createDebtFixture('customer_123');

    renderPaymentDrawer(debt, debt.scheduleItems[0].id);

    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('dialog', { name: 'تسجيل دفعة' })).toBeInTheDocument();
  });
});

function renderPaymentDrawer(
  debt: DebtResponse,
  targetScheduleItemId: string,
  onSubmit: ((request: PaymentSubmissionRequest) => Promise<void>) | undefined = async () => undefined,
  onClose: () => void = vi.fn(),
) {
  return renderWithAppProviders(
    <PaymentDrawer
      debt={debt}
      onClose={onClose}
      onSubmit={onSubmit}
      targetScheduleItemId={targetScheduleItemId}
    />,
  );
}

function PaymentDrawerHarness({ debt }: { debt: DebtResponse }) {
  const [isOpen, setIsOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={openButtonRef} onClick={() => setIsOpen(true)} type="button">
        Open payment
      </button>
      {isOpen ? (
        <PaymentDrawer
          debt={debt}
          onClose={() => setIsOpen(false)}
          onSubmit={async () => undefined}
          returnFocusRef={openButtonRef}
          targetScheduleItemId={debt.scheduleItems[0].id}
        />
      ) : null}
    </>
  );
}
