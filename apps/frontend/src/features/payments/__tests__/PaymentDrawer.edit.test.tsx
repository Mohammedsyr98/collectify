import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import type { PaymentHistoryItem, ReplacePaymentRequest } from '@collectify/contracts';

import { paymentResources } from '../localization/resources';
import { renderWithAppProviders } from './render';
import { PaymentDrawer } from '../ui/editor/PaymentDrawer';

const messages = paymentResources.en.common.payments;

const payment: PaymentHistoryItem = {
  id: 'payment_edit_123',
  scheduleItemId: 'schedule_edit_123',
  debtId: 'debt_edit_123',
  debtDescription: 'Office equipment',
  debtVersion: 7,
  amount: '25.00',
  maximumReplacementAmount: '70.00',
  currency: 'USD',
  paymentDate: '2026-10-20',
  note: 'Original note',
  plan: { type: 'installment', position: 2, total: 3 },
};

describe('PaymentDrawer edit mode', () => {
  afterEach(() => cleanup());

  it('prefills editable fields, fixes the target, and submits the replacement shape', async () => {
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
    expect(
      within(drawer).queryByRole('button', { name: messages.drawer.changeTarget }),
    ).not.toBeInTheDocument();

    await user.clear(within(drawer).getByLabelText(messages.drawer.correctedAmountLabel));
    await user.type(within(drawer).getByLabelText(messages.drawer.correctedAmountLabel), '35.00');
    await user.click(within(drawer).getByRole('button', { name: messages.drawer.saveCorrection }));

    expect(onSubmit).toHaveBeenCalledWith({
      amount: '35.00',
      paymentDate: '2026-10-20',
      note: 'Original note',
      expectedSourceDebtVersion: 7,
    });
  });

  it('keeps save enabled and shows a persistent conflict alert without recovery controls', () => {
    renderWithAppProviders(
      <PaymentDrawer
        conflictKind="version"
        customerId="customer_edit_123"
        mode="edit"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        payment={payment}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: messages.drawer.editTitle });
    expect(within(drawer).getByRole('alert')).toHaveTextContent(messages.drawer.versionConflict);
    expect(within(drawer).getByRole('button', { name: messages.drawer.saveCorrection })).toBeEnabled();
    expect(within(drawer).queryByRole('button', { name: /refresh|retry/i })).not.toBeInTheDocument();
  });

  it('blocks a corrected amount above the snapshot maximum before submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);

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
    await user.type(amountInput, '70.01');
    await user.click(within(drawer).getByRole('button', { name: messages.drawer.saveCorrection }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(within(drawer).getByRole('alert')).toHaveTextContent(
      'Payment exceeds the target remaining amount.',
    );
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
