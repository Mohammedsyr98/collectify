import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DebtResponse, ReplaceDebtRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtDrawer } from '../editor/DebtDrawer';
import { createDebtFixture } from './debtTestData';

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

describe('DebtDrawer saved payment plans', () => {
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

  describe('saved plan conversions', () => {
    it('submits an edited one-payment debt with its saved currency and schedule identity', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<(request: ReplaceDebtRequest) => Promise<void>>(
        async () => undefined,
      );
      const debt = createDebtFixture('customer_123', { currency: 'EUR' });

      renderWithAppProviders(
        <DebtDrawer
          debt={debt}
          isSubmitting={false}
          mode="edit"
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />,
      );

      await user.clear(screen.getByLabelText('Total amount'));
      await user.type(screen.getByLabelText('Total amount'), '275.7');
      await user.clear(screen.getByLabelText('Due date'));
      await user.type(screen.getByLabelText('Due date'), '2026-10-15');
      await user.click(screen.getByRole('button', { name: 'Save debt' }));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          description: debt.description,
          totalAmount: '275.70',
          currency: 'EUR',
          expectedVersion: debt.version,
          scheduleItems: [
            {
              id: debt.scheduleItems[0].id,
              amount: '275.70',
              dueDate: '2026-10-15',
            },
          ],
        }),
      );
    });

    it('starts a saved one-payment conversion with two monthly installments from its due date', async () => {
      const user = userEvent.setup();
      const debt = createDebtFixture('customer_123', {
        totalAmount: '100.00',
        scheduleItems: [
          {
            id: 'schedule_123',
            position: 1,
            amount: '100.00',
            dueDate: '2026-09-30',
            timing: 'upcoming',
          },
        ],
      });

      renderWithAppProviders(
        <DebtDrawer
          debt={debt}
          isSubmitting={false}
          mode="edit"
          onClose={vi.fn()}
          onSubmit={vi.fn(async () => undefined)}
        />,
      );

      const drawer = within(screen.getByRole('dialog', { name: 'Edit debt' }));

      await user.click(drawer.getByRole('button', { name: 'Installments' }));

      expect(drawer.getByLabelText('Installment count')).toHaveValue('2');
      expect(drawer.getByRole('button', { name: 'Monthly' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(drawer.getByLabelText('First installment due date')).toHaveValue('2026-09-30');
    });

    it('submits a saved one-payment conversion with fresh schedule identities', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<(request: ReplaceDebtRequest) => Promise<void>>(
        async () => undefined,
      );
      const debt = createDebtFixture('customer_123', {
        totalAmount: '100.00',
        scheduleItems: [
          {
            id: 'schedule_123',
            position: 1,
            amount: '100.00',
            dueDate: '2026-09-30',
            timing: 'upcoming',
          },
        ],
      });

      renderWithAppProviders(
        <DebtDrawer
          debt={debt}
          isSubmitting={false}
          mode="edit"
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />,
      );

      const drawer = within(screen.getByRole('dialog', { name: 'Edit debt' }));

      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.click(drawer.getByRole('button', { name: 'Save debt' }));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          description: debt.description,
          totalAmount: '100.00',
          currency: 'USD',
          expectedVersion: debt.version,
          scheduleItems: [
            { amount: '50.00', dueDate: '2026-09-30' },
            { amount: '50.00', dueDate: '2026-10-30' },
          ],
        }),
      );
    });
  });

  describe('saved installment schedules', () => {
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

  it('re-splits saved installments from the current total and saves the same schedule rows', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(request: ReplaceDebtRequest) => Promise<void>>(
      async () => undefined,
    );
    const debt = {
      ...savedInstallmentDebt,
      totalAmount: '99.00',
      scheduleItems: savedInstallmentDebt.scheduleItems.map((item, index) => ({
        ...item,
        amount: index === 2 ? '29.00' : item.amount,
      })),
    } satisfies DebtResponse;

    renderWithAppProviders(
      <DebtDrawer
        debt={debt}
        isSubmitting={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const drawer = within(screen.getByRole('dialog', { name: 'Edit debt' }));
    const totalAmount = drawer.getByLabelText('Total amount');
    const splitButton = drawer.getByRole('button', { name: 'Split amounts equally' });

    await user.click(splitButton);

    expect(drawer.getByLabelText('Installment 1 amount')).toHaveValue('33.00');
    expect(drawer.getByLabelText('Installment 2 amount')).toHaveValue('33.00');
    expect(drawer.getByLabelText('Installment 3 amount')).toHaveValue('33.00');

    await user.clear(totalAmount);
    await user.type(totalAmount, '90');
    await user.click(splitButton);

    expect(drawer.getByLabelText('Installment 1 amount')).toHaveValue('30.00');
    expect(drawer.getByLabelText('Installment 2 amount')).toHaveValue('30.00');
    expect(drawer.getByLabelText('Installment 3 amount')).toHaveValue('30.00');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(drawer.getByRole('button', { name: 'Save debt' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        description: debt.description,
        totalAmount: '90.00',
        currency: 'USD',
        expectedVersion: debt.version,
        scheduleItems: [
          {
            id: 'schedule_a',
            amount: '30.00',
            dueDate: '2026-10-01',
          },
          {
            id: 'schedule_b',
            amount: '30.00',
            dueDate: '2026-11-01',
          },
          {
            id: 'schedule_c',
            amount: '30.00',
            dueDate: '2026-12-01',
          },
        ],
      }),
    );
  });

  it('enables splitting only when the total can fund every saved installment', async () => {
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
    const totalAmount = drawer.getByLabelText('Total amount');
    const splitButton = drawer.getByRole('button', { name: 'Split amounts equally' });

    expect(splitButton).toBeEnabled();

    await user.clear(totalAmount);

    expect(splitButton).toBeDisabled();

    await user.type(totalAmount, '0.02');

    expect(splitButton).toBeDisabled();

    await user.clear(totalAmount);
    await user.type(totalAmount, '0.03');

    expect(splitButton).toBeEnabled();
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
});
