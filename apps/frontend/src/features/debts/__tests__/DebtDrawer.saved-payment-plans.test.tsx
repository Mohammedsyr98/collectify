import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DebtResponse, ReplaceDebtRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtDrawer } from '../ui/editor/DebtDrawer';
import { debtResources } from '../localization/resources';
import { createDebtFixture } from './debtTestData';

const debtMessages = debtResources.en.common.debts;
const installmentAmountLabel = (number: number) =>
  debtMessages.form.installmentAmountFieldLabel.replace('{{number}}', String(number));
const installmentDueDateLabel = (number: number) =>
  debtMessages.form.installmentDueDateFieldLabel.replace('{{number}}', String(number));
const removeInstallmentLabel = (number: number) =>
  debtMessages.form.removeInstallment.replace('{{number}}', String(number));

const savedInstallmentDebt: Extract<DebtResponse, { paymentPlanType: 'installment' }> = {
  id: 'debt_installments_123',
  customerId: 'customer_123',
  description: 'Website redesign installments',
  totalAmount: '100.00',
  paidAmount: '0.00',
  remainingAmount: '100.00',
  paymentState: 'unpaid',
  paymentCount: 0,
  currency: 'USD',
  paymentPlanType: 'installment',
  scheduleItems: [
    {
      id: 'schedule_a',
      position: 1,
      amount: '40.00',
      dueDate: '2026-10-01',
      timing: 'upcoming',
      paidAmount: '0.00',
      remainingAmount: '40.00',
      paymentState: 'unpaid',
      paymentCount: 0,
    },
    {
      id: 'schedule_b',
      position: 2,
      amount: '30.00',
      dueDate: '2026-11-01',
      timing: 'upcoming',
      paidAmount: '0.00',
      remainingAmount: '30.00',
      paymentState: 'unpaid',
      paymentCount: 0,
    },
    {
      id: 'schedule_c',
      position: 3,
      amount: '30.00',
      dueDate: '2026-12-01',
      timing: 'upcoming',
      paidAmount: '0.00',
      remainingAmount: '30.00',
      paymentState: 'unpaid',
      paymentCount: 0,
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

      await user.clear(screen.getByLabelText(debtMessages.form.totalAmountLabel));
      await user.type(screen.getByLabelText(debtMessages.form.totalAmountLabel), '275.7');
      await user.clear(screen.getByLabelText(debtMessages.form.dueDateLabel));
      await user.type(screen.getByLabelText(debtMessages.form.dueDateLabel), '2026-10-15');
      await user.click(screen.getByRole('button', { name: debtMessages.form.save }));

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

      const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle }));

      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));

      expect(drawer.getByLabelText(debtMessages.form.installmentCountLabel)).toHaveValue('2');
      expect(drawer.getByRole('button', { name: debtMessages.form.monthlyOption })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel)).toHaveValue('2026-09-30');
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

      const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle }));

      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.click(drawer.getByRole('button', { name: debtMessages.form.save }));

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

    const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle }));

    expect(drawer.getByLabelText(installmentAmountLabel(1))).toHaveValue('40.00');
    expect(drawer.getByLabelText(installmentAmountLabel(2))).toHaveValue('30.00');
    expect(drawer.getByLabelText(installmentAmountLabel(3))).toHaveValue('30.00');
    expect(drawer.queryByLabelText(debtMessages.form.installmentCountLabel)).not.toBeInTheDocument();
    expect(
      drawer.queryByRole('button', { name: debtMessages.form.customizeInstallments }),
    ).not.toBeInTheDocument();
    expect(
      drawer.queryByRole('button', { name: debtMessages.form.resetToAutomaticSchedule }),
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

    const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle }));

    await user.click(drawer.getByRole('button', { name: debtMessages.form.onePaymentOption }));

    expect(drawer.getByLabelText(debtMessages.form.dueDateLabel)).toHaveValue('2026-12-01');
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

    const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle }));

    await user.click(drawer.getByRole('button', { name: debtMessages.form.onePaymentOption }));
    await user.click(drawer.getByRole('button', { name: debtMessages.form.save }));

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

    const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle }));
    const totalAmount = drawer.getByLabelText(debtMessages.form.totalAmountLabel);
    const splitButton = drawer.getByRole('button', { name: debtMessages.form.splitAmountsEqually });

    await user.click(splitButton);

    expect(drawer.getByLabelText(installmentAmountLabel(1))).toHaveValue('33.00');
    expect(drawer.getByLabelText(installmentAmountLabel(2))).toHaveValue('33.00');
    expect(drawer.getByLabelText(installmentAmountLabel(3))).toHaveValue('33.00');

    await user.clear(totalAmount);
    await user.type(totalAmount, '90');
    await user.click(splitButton);

    expect(drawer.getByLabelText(installmentAmountLabel(1))).toHaveValue('30.00');
    expect(drawer.getByLabelText(installmentAmountLabel(2))).toHaveValue('30.00');
    expect(drawer.getByLabelText(installmentAmountLabel(3))).toHaveValue('30.00');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(drawer.getByRole('button', { name: debtMessages.form.save }));

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

    const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle }));
    const totalAmount = drawer.getByLabelText(debtMessages.form.totalAmountLabel);
    const splitButton = drawer.getByRole('button', { name: debtMessages.form.splitAmountsEqually });

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

    const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle }));
    const firstInstallmentAmount = drawer.getByLabelText(installmentAmountLabel(1));

    await user.clear(firstInstallmentAmount);
    await user.type(firstInstallmentAmount, '45');
    await user.click(drawer.getByRole('button', { name: debtMessages.form.onePaymentOption }));

    const onePaymentDueDate = drawer.getByLabelText(debtMessages.form.dueDateLabel);
    await user.clear(onePaymentDueDate);
    await user.type(onePaymentDueDate, '2027-01-15');
    await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));

    expect(drawer.getByLabelText(installmentAmountLabel(1))).toHaveValue('45');

    await user.click(drawer.getByRole('button', { name: debtMessages.form.onePaymentOption }));

    expect(drawer.getByLabelText(debtMessages.form.dueDateLabel)).toHaveValue('2027-01-15');
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

    const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle }));

    await user.click(drawer.getByRole('button', { name: removeInstallmentLabel(2) }));
    await user.clear(drawer.getByLabelText(installmentAmountLabel(2)));
    await user.type(drawer.getByLabelText(installmentAmountLabel(2)), '35');
    await user.click(drawer.getByRole('button', { name: debtMessages.form.addInstallment }));
    await user.type(drawer.getByLabelText(installmentAmountLabel(3)), '25');
    await user.type(drawer.getByLabelText(installmentDueDateLabel(3)), '2027-01-01');

    await user.click(drawer.getByRole('button', { name: debtMessages.form.save }));

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
