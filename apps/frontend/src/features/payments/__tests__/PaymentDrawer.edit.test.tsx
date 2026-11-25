import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import type { PaymentHistoryItem, ReplacePaymentRequest } from '@collectify/contracts';

import { localeStorageKey } from '@/shared/localization';
import { paymentResources } from '../localization/resources';
import { getBackendUrl } from '@/shared/api';
import { server } from '@/shared/test';
import { renderWithAppProviders } from './render';
import { PaymentDrawer } from '../ui/editor/PaymentDrawer';
import { createPaymentTargetFixture } from './paymentTestData';

const messages = paymentResources.en.common.payments;
const arabicMessages = paymentResources.ar.common.payments;

const payment: PaymentHistoryItem = {
  id: 'payment_edit_123',
  scheduleItemId: 'schedule_edit_123',
  debtId: 'debt_edit_123',
  debtDescription: 'Office equipment',
  debtVersion: 7,
  amount: '25.00',
  maximumReplacementAmount: '70.00',
  paymentStateAfterDeletion: 'partiallyPaid',
  currency: 'USD',
  paymentDate: '2026-10-20',
  note: 'Original note',
  plan: { type: 'installment', position: 2, total: 3 },
};

describe('PaymentDrawer edit mode', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
  });

  it('prefills editable fields and submits the replacement shape', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(request: ReplacePaymentRequest) => Promise<void>>(
      async () => undefined,
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_edit_123"
        mode="edit"
        onClose={vi.fn()}
        onSubmit={onSubmit}
        payment={payment}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: messages.drawer.editTitle });
    expect(within(drawer).getByLabelText(messages.drawer.correctedAmountLabel)).toHaveValue('25.00');
    expect(within(drawer).getByLabelText(messages.drawer.dateLabel)).toHaveValue('2026-10-20');
    expect(within(drawer).getByLabelText(messages.drawer.noteLabel)).toHaveValue('Original note');
    expect(drawer).toHaveTextContent(messages.drawer.maximumCorrectedAmountLabel);
    expect(within(drawer).getByRole('button', { name: messages.drawer.changeTarget })).toBeInTheDocument();

    await user.clear(within(drawer).getByLabelText(messages.drawer.correctedAmountLabel));
    await user.type(within(drawer).getByLabelText(messages.drawer.correctedAmountLabel), '35.00');
    await user.click(within(drawer).getByRole('button', { name: messages.drawer.saveCorrection }));

    expect(onSubmit).toHaveBeenCalledWith({
      targetScheduleItemId: payment.scheduleItemId,
      amount: '35.00',
      paymentDate: '2026-10-20',
      note: 'Original note',
      expectedSourceDebtVersion: 7,
    });
  });

  it('blocks a corrected amount above the maximum from the payment snapshot', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    const paymentSnapshot = {
      ...payment,
      maximumReplacementAmount: '70.00',
    };

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_edit_123"
        mode="edit"
        onClose={vi.fn()}
        onSubmit={onSubmit}
        payment={paymentSnapshot}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: messages.drawer.editTitle });
    expect(drawer).toHaveTextContent(messages.drawer.maximumCorrectedAmountLabel);
    expect(drawer).toHaveTextContent('$70.00');
    const amountInput = within(drawer).getByLabelText(messages.drawer.correctedAmountLabel);
    await user.clear(amountInput);
    await user.type(amountInput, '70.01');
    await user.click(within(drawer).getByRole('button', { name: messages.drawer.saveCorrection }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(within(drawer).getByRole('alert')).toHaveTextContent(
      'Payment exceeds the target remaining amount.',
    );
  });

  it('moves the target, keeps the changed-from summary, and submits both debt versions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(request: ReplacePaymentRequest) => Promise<void>>(
      async () => undefined,
    );
    const replacementTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_replacement',
      debtId: 'debt_replacement',
      debtDescription: 'Travel expenses',
      debtVersion: 11,
      availableToPayAmount: '50.00',
    });
    const otherTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_other',
      debtId: 'debt_other',
      debtDescription: 'Other expenses',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('editingPaymentId')).toBe(payment.id);
        return HttpResponse.json({
          items: [replacementTarget, otherTarget],
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
        });
      }),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_edit_123"
        mode="edit"
        onClose={vi.fn()}
        onSubmit={onSubmit}
        payment={payment}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: messages.drawer.editTitle });
    const amountInput = within(drawer).getByLabelText(messages.drawer.correctedAmountLabel);
    await user.clear(amountInput);
    await user.type(amountInput, '30.00');
    await user.click(within(drawer).getByRole('button', { name: messages.drawer.changeTarget }));
    await user.click(await within(drawer).findByRole('button', { name: /Travel expenses/ }));

    expect(within(drawer).getByText(messages.drawer.changedFrom.replace('{{description}}', payment.debtDescription))).toBeInTheDocument();
    expect(within(drawer).getByLabelText(messages.drawer.correctedAmountLabel)).toHaveValue('30.00');

    await user.click(within(drawer).getByRole('button', { name: messages.drawer.saveCorrection }));
    expect(onSubmit).toHaveBeenCalledWith({
      targetScheduleItemId: replacementTarget.scheduleItemId,
      amount: '30.00',
      paymentDate: payment.paymentDate,
      note: payment.note,
      expectedSourceDebtVersion: payment.debtVersion,
      expectedDestinationDebtVersion: replacementTarget.debtVersion,
    });
  });

  it('clears an edit amount for a cross-currency target and focuses the new amount field', async () => {
    const user = userEvent.setup();
    const crossCurrencyTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_cross_currency',
      debtId: 'debt_cross_currency',
      debtDescription: 'Travel expenses',
      currency: 'EUR',
      availableToPayAmount: '50.00',
    });
    const otherTarget = createPaymentTargetFixture({
      scheduleItemId: 'schedule_cross_currency_other',
      debtId: 'debt_cross_currency_other',
      debtDescription: 'Other expenses',
    });

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [crossCurrencyTarget, otherTarget],
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
        }),
      ),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_edit_123"
        mode="edit"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        payment={payment}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: messages.drawer.editTitle });
    await user.click(within(drawer).getByRole('button', { name: messages.drawer.changeTarget }));
    await user.click(await within(drawer).findByRole('button', { name: /Travel expenses/ }));

    const amountInput = within(drawer).getByLabelText(messages.drawer.correctedAmountLabel);
    await waitFor(() => expect(amountInput).toHaveFocus());
    expect(amountInput).toHaveValue('');
    expect(drawer).toHaveTextContent(messages.drawer.crossCurrencyAmountReset);
    expect(within(drawer).getByLabelText(messages.drawer.dateLabel)).toHaveValue(payment.paymentDate);
    expect(within(drawer).getByLabelText(messages.drawer.noteLabel)).toHaveValue(payment.note);
  });

  it('keeps the edit target picker localized and right-to-left in Arabic', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(localeStorageKey, 'ar');
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId/payment-targets`, () =>
        HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        }),
      ),
    );

    renderWithAppProviders(
      <PaymentDrawer
        customerId="customer_edit_123"
        mode="edit"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        payment={payment}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: arabicMessages.drawer.editTitle });
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    await user.click(within(drawer).getByRole('button', { name: arabicMessages.drawer.changeTarget }));
    expect(within(drawer).getByRole('heading', { name: arabicMessages.drawer.chooseTargetTitle })).toBeInTheDocument();
  });

  it('discards a dirty draft on close and restores focus when the edit is reopened', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Open payment editor
          </button>
          {open ? (
            <PaymentDrawer
              customerId="customer_edit_123"
              mode="edit"
              onClose={() => setOpen(false)}
              onSubmit={vi.fn(async () => undefined)}
              payment={payment}
              returnFocusTarget={document.querySelector('button')}
            />
          ) : null}
        </>
      );
    }

    renderWithAppProviders(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open payment editor' });
    await user.click(trigger);
    const firstDrawer = screen.getByRole('dialog', { name: messages.drawer.editTitle });
    const amountInput = within(firstDrawer).getByLabelText(messages.drawer.correctedAmountLabel);
    await user.clear(amountInput);
    await user.type(amountInput, '35.00');
    await user.click(within(firstDrawer).getByRole('button', { name: messages.drawer.cancel }));

    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('dialog', { name: messages.drawer.editTitle })).not.toBeInTheDocument();

    await user.click(trigger);
    const reopenedDrawer = screen.getByRole('dialog', { name: messages.drawer.editTitle });
    expect(within(reopenedDrawer).getByLabelText(messages.drawer.correctedAmountLabel)).toHaveValue(
      '25.00',
    );
  });
});
