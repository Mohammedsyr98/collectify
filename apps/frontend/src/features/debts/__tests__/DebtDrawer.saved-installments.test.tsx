import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DebtResponse, ReplaceDebtRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtDrawer } from '../editor/DebtDrawer';

const savedInstallmentDebt: Extract<DebtResponse, { paymentPlanType: 'installment' }> = {
  id: 'debt_installments_123',
  customerId: 'customer_123',
  description: 'Website redesign installments',
  totalAmount: '100.00',
  currency: 'USD',
  paymentPlanType: 'installment',
  scheduleItems: [
    {
      id: 'schedule_a',
      position: 1,
      amount: '40.00',
      dueDate: '2026-10-01',
      timing: 'upcoming',
    },
    {
      id: 'schedule_b',
      position: 2,
      amount: '30.00',
      dueDate: '2026-11-01',
      timing: 'upcoming',
    },
    {
      id: 'schedule_c',
      position: 3,
      amount: '30.00',
      dueDate: '2026-12-01',
      timing: 'upcoming',
    },
  ],
  createdAt: '2026-09-12T10:00:00.000Z',
  updatedAt: '2026-09-12T10:00:00.000Z',
  version: 3,
};

describe('DebtDrawer saved installment editing', () => {
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

  it('renders saved installments without automatic schedule controls', () => {
    renderWithAppProviders(
      <DebtDrawer
        debt={savedInstallmentDebt}
        isSubmitting={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    const drawer = within(screen.getByRole('dialog', { name: 'Edit debt' }));

    expect(drawer.getByLabelText('Installment 1 amount')).toHaveValue('40.00');
    expect(drawer.getByLabelText('Installment 2 amount')).toHaveValue('30.00');
    expect(drawer.getByLabelText('Installment 3 amount')).toHaveValue('30.00');
    expect(drawer.queryByLabelText('Installment count')).not.toBeInTheDocument();
    expect(
      drawer.queryByRole('button', { name: 'Customize installments' }),
    ).not.toBeInTheDocument();
    expect(
      drawer.queryByRole('button', { name: 'Reset to automatic schedule' }),
    ).not.toBeInTheDocument();
  });

  it('initializes one-payment conversion from the final installment date', async () => {
    const user = userEvent.setup();

    renderWithAppProviders(
      <DebtDrawer
        debt={savedInstallmentDebt}
        isSubmitting={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    const drawer = within(screen.getByRole('dialog', { name: 'Edit debt' }));

    await user.click(drawer.getByRole('button', { name: 'One payment' }));

    expect(drawer.getByLabelText('Due date')).toHaveValue('2026-12-01');
  });

  it('submits an installment conversion with a fresh one-payment identity', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(request: ReplaceDebtRequest) => Promise<void>>(
      async () => undefined,
    );

    renderWithAppProviders(
      <DebtDrawer
        debt={savedInstallmentDebt}
        isSubmitting={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const drawer = within(screen.getByRole('dialog', { name: 'Edit debt' }));

    await user.click(drawer.getByRole('button', { name: 'One payment' }));
    await user.click(drawer.getByRole('button', { name: 'Save debt' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        description: savedInstallmentDebt.description,
        totalAmount: '100.00',
        currency: 'USD',
        expectedVersion: savedInstallmentDebt.version,
        scheduleItems: [{ amount: '100.00', dueDate: '2026-12-01' }],
      }),
    );
  });

  it('preserves both edited plan drafts across repeated plan switches', async () => {
    const user = userEvent.setup();

    renderWithAppProviders(
      <DebtDrawer
        debt={savedInstallmentDebt}
        isSubmitting={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    const drawer = within(screen.getByRole('dialog', { name: 'Edit debt' }));
    const firstInstallmentAmount = drawer.getByLabelText('Installment 1 amount');

    await user.clear(firstInstallmentAmount);
    await user.type(firstInstallmentAmount, '45');
    await user.click(drawer.getByRole('button', { name: 'One payment' }));

    const onePaymentDueDate = drawer.getByLabelText('Due date');
    await user.clear(onePaymentDueDate);
    await user.type(onePaymentDueDate, '2027-01-15');
    await user.click(drawer.getByRole('button', { name: 'Installments' }));

    expect(drawer.getByLabelText('Installment 1 amount')).toHaveValue('45');

    await user.click(drawer.getByRole('button', { name: 'One payment' }));

    expect(drawer.getByLabelText('Due date')).toHaveValue('2027-01-15');
  });

  it('replaces saved installment rows while preserving retained ids and omitting new ids', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(request: ReplaceDebtRequest) => Promise<void>>(
      async () => undefined,
    );

    renderWithAppProviders(
      <DebtDrawer
        debt={savedInstallmentDebt}
        isSubmitting={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const drawer = within(screen.getByRole('dialog', { name: 'Edit debt' }));

    await user.click(drawer.getByRole('button', { name: 'Remove installment 2' }));
    await user.clear(drawer.getByLabelText('Installment 2 amount'));
    await user.type(drawer.getByLabelText('Installment 2 amount'), '35');
    await user.click(drawer.getByRole('button', { name: 'Add installment' }));
    await user.type(drawer.getByLabelText('Installment 3 amount'), '25');
    await user.type(drawer.getByLabelText('Installment 3 due date'), '2027-01-01');

    await user.click(drawer.getByRole('button', { name: 'Save debt' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        description: savedInstallmentDebt.description,
        totalAmount: '100.00',
        currency: 'USD',
        expectedVersion: savedInstallmentDebt.version,
        scheduleItems: [
          {
            id: 'schedule_a',
            amount: '40.00',
            dueDate: '2026-10-01',
          },
          {
            id: 'schedule_c',
            amount: '35.00',
            dueDate: '2026-12-01',
          },
          {
            amount: '25.00',
            dueDate: '2027-01-01',
          },
        ],
      }),
    );
  });
});
