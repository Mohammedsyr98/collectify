import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateDebtRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtDrawer } from '../DebtDrawer';

describe('DebtDrawer payment plans', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['en-US'],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('seeds the first installment date from the one-payment date on first activation', async () => {
    const user = userEvent.setup();

    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Add debt' });
    expect(within(drawer).getByRole('button', { name: 'One payment' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.type(within(drawer).getByLabelText('Due date'), '2026-09-30');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));

    expect(within(drawer).getByRole('button', { name: 'Installments' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(drawer).getByLabelText('Installment count')).toHaveValue('2');
    expect(within(drawer).getByRole('button', { name: 'Monthly' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(drawer).getByLabelText('First installment due date')).toHaveValue('2026-09-30');
  });

  it('preserves each plan branch and frequency across later switches', async () => {
    const user = userEvent.setup();

    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Add debt' });
    const dueDate = within(drawer).getByLabelText('Due date');
    await user.type(dueDate, '2026-09-30');

    const installments = within(drawer).getByRole('button', {
      name: 'Installments',
    });
    await user.click(installments);
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');
    await user.clear(within(drawer).getByLabelText('Installment count'));
    await user.type(within(drawer).getByLabelText('Installment count'), '4');

    const weekly = within(drawer).getByRole('button', { name: 'Weekly' });
    weekly.focus();
    await user.keyboard('{Enter}');

    const onePayment = within(drawer).getByRole('button', {
      name: 'One payment',
    });
    onePayment.focus();
    await user.keyboard('{Enter}');
    await user.clear(within(drawer).getByLabelText('Due date'));
    await user.type(within(drawer).getByLabelText('Due date'), '2026-11-05');

    installments.focus();
    await user.keyboard('{Enter}');

    expect(installments).toHaveAttribute('aria-pressed', 'true');
    expect(within(drawer).getByLabelText('Installment count')).toHaveValue('4');
    expect(weekly).toHaveAttribute('aria-pressed', 'true');
    expect(within(drawer).getByLabelText('First installment due date')).toHaveValue('2026-10-01');

    onePayment.focus();
    await user.keyboard('{Enter}');

    expect(onePayment).toHaveAttribute('aria-pressed', 'true');
    expect(within(drawer).getByLabelText('Due date')).toHaveValue('2026-11-05');
  });

  it('submits the generated request for the selected installment plan', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined);

    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Add debt' });
    await user.type(within(drawer).getByLabelText('Description'), 'Website redesign');
    await user.type(within(drawer).getByLabelText('Total amount'), '100.01');
    await user.type(within(drawer).getByLabelText('Due date'), '2026-09-30');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');
    await user.clear(within(drawer).getByLabelText('Installment count'));
    await user.type(within(drawer).getByLabelText('Installment count'), '3');
    await user.click(within(drawer).getByRole('button', { name: 'Weekly' }));
    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    expect(onSubmit).toHaveBeenCalledWith({
      description: 'Website redesign',
      totalAmount: '100.01',
      currency: 'USD',
      scheduleItems: [
        { amount: '33.33', dueDate: '2026-10-01' },
        { amount: '33.33', dueDate: '2026-10-08' },
        { amount: '33.35', dueDate: '2026-10-15' },
      ],
    });
  });
});
