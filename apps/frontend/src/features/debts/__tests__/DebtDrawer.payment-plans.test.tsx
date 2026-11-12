import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  debtPlanIssueCode,
  debtRequestValidationCode,
  type CreateDebtRequest,
} from '@collectify/contracts';

import { renderWithAppProviders } from './render';
import { DebtDrawer } from '../ui/editor/DebtDrawer';
import { debtResources } from '../localization/resources';

const debtMessages = debtResources.en.common.debts;
const installmentAmountLabel = (number: number) =>
  debtMessages.form.installmentAmountFieldLabel.replace('{{number}}', String(number));
const installmentDueDateLabel = (number: number) =>
  debtMessages.form.installmentDueDateFieldLabel.replace('{{number}}', String(number));
const removeInstallmentLabel = (number: number) =>
  debtMessages.form.removeInstallment.replace('{{number}}', String(number));
const installmentGuidance = debtMessages.form.installmentCountGuidance
  .replace('{{minimum}}', '2')
  .replace('{{maximum}}', '60');

function renderDebtDrawer(
  onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined),
) {
  const user = userEvent.setup();

  renderWithAppProviders(
    <DebtDrawer defaultCurrency="USD" isSubmitting={false} onClose={vi.fn()} onSubmit={onSubmit} />,
  );

  const drawer = within(screen.getByRole('dialog', { name: debtMessages.drawer.createTitle }));

  return { drawer, onSubmit, user };
}

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

  describe('one-payment plan', () => {
    it('submits a normalized create request with an id-less schedule item', async () => {
      const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(
        async () => undefined,
      );
      const { user } = renderDebtDrawer(onSubmit);

      await user.type(screen.getByLabelText(debtMessages.form.descriptionLabel), '  Website redesign  ');
      await user.type(screen.getByLabelText(debtMessages.form.totalAmountLabel), '125.5');
      await user.type(screen.getByLabelText(debtMessages.form.dueDateLabel), '2026-09-30');
      await user.click(screen.getByRole('button', { name: debtMessages.form.save }));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          description: 'Website redesign',
          totalAmount: '125.50',
          currency: 'USD',
          scheduleItems: [{ amount: '125.50', dueDate: '2026-09-30' }],
        }),
      );
    });
  });

  describe('installment plan / automatic schedule', () => {
    it('seeds the first installment date from the one-payment date on first activation', async () => {
      const { drawer, user } = renderDebtDrawer();
      expect(drawer.getByRole('button', { name: debtMessages.form.onePaymentOption })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await user.type(drawer.getByLabelText(debtMessages.form.dueDateLabel), '2026-09-30');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));

      expect(drawer.getByRole('button', { name: debtMessages.form.installmentsOption })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(drawer.getByLabelText(debtMessages.form.installmentCountLabel)).toHaveValue('2');
      expect(drawer.getByRole('button', { name: debtMessages.form.monthlyOption })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel)).toHaveValue('2026-09-30');
    });

    it('preserves each plan branch and frequency across later switches', async () => {
      const { drawer, user } = renderDebtDrawer();
      const dueDate = drawer.getByLabelText(debtMessages.form.dueDateLabel);
      await user.type(dueDate, '2026-09-30');

      const installments = drawer.getByRole('button', {
        name: debtMessages.form.installmentsOption,
      });
      await user.click(installments);
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '4');

      const weekly = drawer.getByRole('button', { name: debtMessages.form.weeklyOption });
      weekly.focus();
      await user.keyboard('{Enter}');

      const onePayment = drawer.getByRole('button', {
        name: debtMessages.form.onePaymentOption,
      });
      onePayment.focus();
      await user.keyboard('{Enter}');
      await user.clear(drawer.getByLabelText(debtMessages.form.dueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.dueDateLabel), '2026-11-05');

      installments.focus();
      await user.keyboard('{Enter}');

      expect(installments).toHaveAttribute('aria-pressed', 'true');
      expect(drawer.getByLabelText(debtMessages.form.installmentCountLabel)).toHaveValue('4');
      expect(weekly).toHaveAttribute('aria-pressed', 'true');
      expect(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel)).toHaveValue('2026-10-01');

      onePayment.focus();
      await user.keyboard('{Enter}');

      expect(onePayment).toHaveAttribute('aria-pressed', 'true');
      expect(drawer.getByLabelText(debtMessages.form.dueDateLabel)).toHaveValue('2026-11-05');
    });

    it('shows the generated schedule and updates it when installment settings change', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');

      const table = drawer.getByRole('table', {
        name: debtMessages.form.installmentPreviewCaption,
      });
      let rows = within(table).getAllByRole('row');

      expect(rows).toHaveLength(3);
      expect(rows[1]).toHaveTextContent('1');
      expect(rows[1]).toHaveTextContent('$50.00');
      expect(rows[1].querySelector('bdi[dir="ltr"]')).toHaveTextContent('$50.00');
      expect(rows[1].querySelector('time')).toHaveAttribute('datetime', '2026-10-01');
      expect(rows[2]).toHaveTextContent('$50.01');
      expect(rows[2].querySelector('time')).toHaveAttribute('datetime', '2026-11-01');

      await user.click(drawer.getByRole('button', { name: debtMessages.form.weeklyOption }));
      rows = within(table).getAllByRole('row');
      expect(rows[2].querySelector('time')).toHaveAttribute('datetime', '2026-10-08');

      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '4');

      const updatedTable = drawer.getByRole('table', {
        name: debtMessages.form.installmentPreviewCaption,
      });
      rows = within(updatedTable).getAllByRole('row');
      expect(rows).toHaveLength(5);
      expect(rows[1]).toHaveTextContent('$25.00');
      expect(rows[4]).toHaveTextContent('$25.01');
      expect(rows[4].querySelector('time')).toHaveAttribute('datetime', '2026-10-22');
    });

    it('does not show a preview until the installment settings are complete', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));

      expect(
        drawer.queryByRole('table', { name: debtMessages.form.installmentPreviewCaption }),
      ).not.toBeInTheDocument();

      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');

      expect(drawer.queryByText(installmentGuidance)).not.toBeInTheDocument();
      expect(
        drawer.queryByRole('table', { name: debtMessages.form.installmentPreviewCaption }),
      ).not.toBeInTheDocument();
    });

    it('submits the generated request for the selected installment plan', async () => {
      const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined);
      const { drawer, user } = renderDebtDrawer(onSubmit);
      await user.type(drawer.getByLabelText(debtMessages.form.descriptionLabel), 'Website redesign');
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');
      await user.type(drawer.getByLabelText(debtMessages.form.dueDateLabel), '2026-09-30');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '3');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.weeklyOption }));
      await user.click(drawer.getByRole('button', { name: debtMessages.form.save }));

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

  describe('installment plan / manual schedule', () => {
    it('customizes the visible preview into editable rows and saves the edited schedule', async () => {
      const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined);
      const { drawer, user } = renderDebtDrawer(onSubmit);
      await user.type(drawer.getByLabelText(debtMessages.form.descriptionLabel), 'Website redesign');
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '3');

      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      expect(
        drawer.getByRole('button', { name: debtMessages.form.resetToAutomaticSchedule }),
      ).toBeInTheDocument();
      expect(
        drawer.queryByRole('button', { name: debtMessages.form.splitAmountsEqually }),
      ).not.toBeInTheDocument();
      expect(drawer.queryByLabelText(debtMessages.form.installmentCountLabel)).not.toBeInTheDocument();
      expect(drawer.getByLabelText(installmentAmountLabel(1))).toHaveValue('33.33');
      expect(drawer.getByLabelText(installmentAmountLabel(2))).toHaveValue('33.33');
      expect(drawer.getByLabelText(installmentAmountLabel(3))).toHaveValue('33.35');
      expect(drawer.getByLabelText(installmentDueDateLabel(1))).toHaveValue('2026-10-01');
      expect(drawer.getByLabelText(installmentDueDateLabel(2))).toHaveValue('2026-11-01');
      expect(drawer.getByLabelText(installmentDueDateLabel(3))).toHaveValue('2026-12-01');

      await user.clear(drawer.getByLabelText(installmentAmountLabel(1)));
      await user.type(drawer.getByLabelText(installmentAmountLabel(1)), '20');
      await user.clear(drawer.getByLabelText(installmentAmountLabel(2)));
      await user.type(drawer.getByLabelText(installmentAmountLabel(2)), '30.0');
      await user.clear(drawer.getByLabelText(installmentAmountLabel(3)));
      await user.type(drawer.getByLabelText(installmentAmountLabel(3)), '50.01');
      await user.clear(drawer.getByLabelText(installmentDueDateLabel(2)));
      await user.type(drawer.getByLabelText(installmentDueDateLabel(2)), '2026-11-05');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.save }));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          description: 'Website redesign',
          totalAmount: '100.01',
          currency: 'USD',
          scheduleItems: [
            { amount: '20.00', dueDate: '2026-10-01' },
            { amount: '30.00', dueDate: '2026-11-05' },
            { amount: '50.01', dueDate: '2026-12-01' },
          ],
        }),
      );
    });

    it('shows an exact live summary without changing manual row values', async () => {
      const { drawer, user } = renderDebtDrawer();
      const totalAmount = drawer.getByLabelText(debtMessages.form.totalAmountLabel);

      await user.type(totalAmount, '100.01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '3');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      const initialSummary = drawer.getByRole('region', { name: debtMessages.form.installmentSummaryLabel });
      expect(within(initialSummary).getByText('$0.00')).toBeInTheDocument();
      expect(within(initialSummary).getByText(debtMessages.form.remainingAmountLabel)).toBeInTheDocument();

      const firstAmount = drawer.getByLabelText(installmentAmountLabel(1));
      const secondAmount = drawer.getByLabelText(installmentAmountLabel(2));
      const thirdAmount = drawer.getByLabelText(installmentAmountLabel(3));
      await user.clear(firstAmount);
      await user.type(firstAmount, '20');
      await user.clear(secondAmount);
      await user.type(secondAmount, '30.0');
      await user.clear(thirdAmount);
      await user.type(thirdAmount, '40');

      let summary = drawer.getByRole('region', { name: debtMessages.form.installmentSummaryLabel });
      expect(within(summary).getByText('$100.01')).toBeInTheDocument();
      expect(within(summary).getByText('$90.00')).toBeInTheDocument();
      expect(within(summary).getByText('$10.01')).toBeInTheDocument();
      expect(within(summary).getByText(debtMessages.form.remainingAmountLabel)).toBeInTheDocument();

      await user.selectOptions(drawer.getByLabelText(debtMessages.form.currencyLabel), 'EUR');
      summary = drawer.getByRole('region', { name: debtMessages.form.installmentSummaryLabel });
      expect(within(summary).getByText('€100.01')).toBeInTheDocument();
      await user.selectOptions(drawer.getByLabelText(debtMessages.form.currencyLabel), 'USD');

      await user.clear(totalAmount);

      summary = drawer.getByRole('region', { name: debtMessages.form.installmentSummaryLabel });
      expect(within(summary).getByText(debtMessages.form.debtTotalLabel).parentElement).toHaveTextContent('$0.00');
      expect(within(summary).getByText(debtMessages.form.scheduleTotalLabel).parentElement).toHaveTextContent('$90.00');
      expect(within(summary).getByText(debtMessages.form.excessAmountLabel).parentElement).toHaveTextContent('$90.00');

      await user.type(totalAmount, '95');

      summary = drawer.getByRole('region', { name: debtMessages.form.installmentSummaryLabel });
      expect(within(summary).getByText('$95.00')).toBeInTheDocument();
      expect(within(summary).getByText('$5.00')).toBeInTheDocument();
      expect(firstAmount).toHaveValue('20');
      expect(secondAmount).toHaveValue('30.0');
      expect(thirdAmount).toHaveValue('40');

      await user.clear(thirdAmount);
      summary = drawer.getByRole('region', { name: debtMessages.form.installmentSummaryLabel });
      expect(within(summary).getByText('$50.00')).toBeInTheDocument();
      expect(within(summary).getByText('$45.00')).toBeInTheDocument();
      expect(within(summary).getByText(debtMessages.form.remainingAmountLabel)).toBeInTheDocument();

      await user.type(thirdAmount, '60.');
      summary = drawer.getByRole('region', { name: debtMessages.form.installmentSummaryLabel });
      expect(within(summary).getByText('$110.00')).toBeInTheDocument();
      expect(within(summary).getByText('$15.00')).toBeInTheDocument();
      expect(within(summary).getByText(debtMessages.form.excessAmountLabel)).toBeInTheDocument();

      await user.type(thirdAmount, '01');
      summary = drawer.getByRole('region', { name: debtMessages.form.installmentSummaryLabel });
      expect(within(summary).getByText('$110.01')).toBeInTheDocument();
      expect(within(summary).getByText('$15.01')).toBeInTheDocument();
      expect(within(summary).getByText(debtMessages.form.excessAmountLabel)).toBeInTheDocument();
      expect(firstAmount).toHaveValue('20');
      expect(secondAmount).toHaveValue('30.0');
      expect(thirdAmount).toHaveValue('60.01');
    });

    it('keeps the manual summary visible when an amount is malformed', async () => {
      const { drawer, user } = renderDebtDrawer();

      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      const firstAmount = drawer.getByLabelText(installmentAmountLabel(1));
      await user.clear(firstAmount);
      await user.type(firstAmount, '1.2.3');

      const summary = drawer.getByRole('region', { name: debtMessages.form.installmentSummaryLabel });
      expect(
        within(summary).getByText(debtMessages.form.installmentSummaryUnavailable),
      ).toBeInTheDocument();
    });

    it('sets date bounds from neighboring rows without blocking a past first date', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-01-31');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '3');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      const firstDueDate = drawer.getByLabelText(installmentDueDateLabel(1));
      const secondDueDate = drawer.getByLabelText(installmentDueDateLabel(2));
      const thirdDueDate = drawer.getByLabelText(installmentDueDateLabel(3));

      expect(firstDueDate).not.toHaveAttribute('min');
      expect(firstDueDate).toHaveAttribute('max', '2026-02-27');
      expect(secondDueDate).toHaveAttribute('min', '2026-02-01');
      expect(secondDueDate).toHaveAttribute('max', '2026-03-30');
      expect(thirdDueDate).toHaveAttribute('min', '2026-03-01');
      expect(thirdDueDate).not.toHaveAttribute('max');

      await user.clear(secondDueDate);

      expect(firstDueDate).not.toHaveAttribute('max');
      expect(thirdDueDate).not.toHaveAttribute('min');
      expect(secondDueDate).toHaveAttribute('min', '2026-02-01');
      expect(secondDueDate).toHaveAttribute('max', '2026-03-30');
    });

    it('appends a blank row and removes only the selected row', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '2');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      await user.click(drawer.getByRole('button', { name: debtMessages.form.addInstallment }));

      expect(drawer.getByLabelText(installmentAmountLabel(3))).toHaveValue('');
      expect(drawer.getByLabelText(installmentDueDateLabel(3))).toHaveValue('');

      await user.type(drawer.getByLabelText(installmentAmountLabel(3)), '12.34');
      await user.type(drawer.getByLabelText(installmentDueDateLabel(3)), '2026-12-01');
      await user.click(drawer.getByRole('button', { name: removeInstallmentLabel(2) }));

      expect(drawer.getByLabelText(installmentAmountLabel(1))).toHaveValue('50.00');
      expect(drawer.getByLabelText(installmentAmountLabel(2))).toHaveValue('12.34');
      expect(drawer.getByLabelText(installmentDueDateLabel(2))).toHaveValue('2026-12-01');
    });

    it('keeps Remove visible at the minimum and disables Add at the dynamic maximum', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '0.03');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      const addButton = drawer.getByRole('button', { name: debtMessages.form.addInstallment });
      const removeButtons = drawer.getAllByRole('button', {
        name: new RegExp(debtMessages.form.removeInstallment.replace(' {{number}}', '')),
      });

      expect(removeButtons).toHaveLength(2);
      expect(removeButtons[0]).toBeDisabled();
      expect(removeButtons[1]).toBeDisabled();
      expect(addButton).toBeEnabled();

      await user.click(addButton);

      expect(
        drawer.getAllByRole('button', {
          name: new RegExp(debtMessages.form.removeInstallment.replace(' {{number}}', '')),
        }),
      ).toHaveLength(3);
      expect(
        drawer
          .getAllByRole('button', {
            name: new RegExp(debtMessages.form.removeInstallment.replace(' {{number}}', '')),
          })
          .every((button) => !button.hasAttribute('disabled')),
      ).toBe(true);
      expect(addButton).toBeDisabled();
    });

    it('disables Add when the total cannot provide a truthful maximum', async () => {
      const { drawer, user } = renderDebtDrawer();
      const totalAmount = drawer.getByLabelText(debtMessages.form.totalAmountLabel);
      await user.type(totalAmount, '100.01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      const addButton = drawer.getByRole('button', { name: debtMessages.form.addInstallment });
      expect(addButton).toBeEnabled();

      await user.clear(totalAmount);
      await user.type(totalAmount, 'not-a-number');

      expect(addButton).toBeDisabled();
    });

    it('keeps manual values and rows when a total change lowers the maximum', async () => {
      const { drawer, user } = renderDebtDrawer();
      const totalAmount = drawer.getByLabelText(debtMessages.form.totalAmountLabel);
      await user.type(totalAmount, '0.03');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));
      await user.click(drawer.getByRole('button', { name: debtMessages.form.addInstallment }));

      await user.clear(drawer.getByLabelText(installmentAmountLabel(3)));
      await user.type(drawer.getByLabelText(installmentAmountLabel(3)), '0.01');
      await user.type(drawer.getByLabelText(installmentDueDateLabel(3)), '2026-12-01');

      await user.clear(totalAmount);
      await user.type(totalAmount, '0.02');

      expect(drawer.getByLabelText(installmentAmountLabel(1))).toHaveValue('0.01');
      expect(drawer.getByLabelText(installmentAmountLabel(2))).toHaveValue('0.02');
      expect(drawer.getByLabelText(installmentAmountLabel(3))).toHaveValue('0.01');
      expect(drawer.getByLabelText(installmentDueDateLabel(3))).toHaveValue('2026-12-01');
      expect(drawer.getByRole('button', { name: debtMessages.form.addInstallment })).toBeDisabled();
      expect(drawer.getByRole('button', { name: removeInstallmentLabel(3) })).toBeEnabled();
    });

    it('preserves the manual schedule through a one-payment round trip', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');
      await user.type(drawer.getByLabelText(debtMessages.form.dueDateLabel), '2026-09-30');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));
      await user.clear(drawer.getByLabelText(installmentAmountLabel(1)));
      await user.type(drawer.getByLabelText(installmentAmountLabel(1)), '20');

      await user.click(drawer.getByRole('button', { name: debtMessages.form.onePaymentOption }));
      expect(drawer.getByLabelText(debtMessages.form.dueDateLabel)).toHaveValue('2026-09-30');

      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));

      expect(
        drawer.getByRole('button', { name: debtMessages.form.resetToAutomaticSchedule }),
      ).toBeInTheDocument();
      expect(drawer.getByLabelText(installmentAmountLabel(1))).toHaveValue('20');
      expect(drawer.getByLabelText(installmentAmountLabel(2))).toHaveValue('50.01');
    });

    it('shows a manual row amount error on the matching row', async () => {
      const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined);
      const { drawer, user } = renderDebtDrawer(onSubmit);
      await user.type(drawer.getByLabelText(debtMessages.form.descriptionLabel), 'Website redesign');
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '3');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      const secondAmount = drawer.getByLabelText(installmentAmountLabel(2));
      await user.clear(secondAmount);
      await user.type(secondAmount, '0');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.save }));

      expect(secondAmount).toHaveAccessibleDescription(
        debtMessages.validation[debtPlanIssueCode.scheduleItemAmountNotPositive],
      );
      expect(drawer.getByLabelText(debtMessages.form.totalAmountLabel)).not.toHaveAccessibleDescription();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows and updates all actionable manual errors after the first failed save', async () => {
      const { drawer, onSubmit, user } = renderDebtDrawer();
      const totalAmount = drawer.getByLabelText(debtMessages.form.totalAmountLabel);
      await user.type(totalAmount, '100.01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '3');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      await user.clear(totalAmount);
      await user.type(totalAmount, '0.02');

      const secondAmount = drawer.getByLabelText(installmentAmountLabel(2));
      await user.clear(secondAmount);
      await user.type(secondAmount, '0');

      const secondDueDate = drawer.getByLabelText(installmentDueDateLabel(2));
      await user.clear(secondDueDate);
      await user.type(secondDueDate, '2026-10-01');

      await user.click(drawer.getByRole('button', { name: debtMessages.form.save }));

      const description = drawer.getByLabelText(debtMessages.form.descriptionLabel);
      expect(description).toHaveFocus();
      expect(description).toHaveAccessibleDescription(
        debtMessages.validation[debtRequestValidationCode.debtDescriptionRequired],
      );
      expect(secondAmount).toHaveAccessibleDescription(
        debtMessages.validation[debtPlanIssueCode.scheduleItemAmountNotPositive],
      );
      expect(secondDueDate).toHaveAccessibleDescription(
        debtMessages.validation[debtPlanIssueCode.scheduleItemDueDateNotAfterPrevious],
      );
      expect(
        drawer.getByText(debtMessages.validation[debtPlanIssueCode.scheduleItemCountInvalid]),
      ).toBeInTheDocument();
      expect(
        drawer.getByText(debtMessages.validation[debtPlanIssueCode.scheduleTotalAmountMismatch]),
      ).toBeInTheDocument();

      await user.clear(totalAmount);
      await user.type(totalAmount, '66.68');

      await waitFor(() => {
        expect(
          drawer.queryByText(debtMessages.validation[debtPlanIssueCode.scheduleItemCountInvalid]),
        ).not.toBeInTheDocument();
        expect(
          drawer.queryByText(debtMessages.validation[debtPlanIssueCode.scheduleTotalAmountMismatch]),
        ).not.toBeInTheDocument();
      });
      expect(description).toHaveAccessibleDescription(
        debtMessages.validation[debtRequestValidationCode.debtDescriptionRequired],
      );
      expect(secondAmount).toHaveAccessibleDescription(
        debtMessages.validation[debtPlanIssueCode.scheduleItemAmountNotPositive],
      );
      expect(secondDueDate).toHaveAccessibleDescription(
        debtMessages.validation[debtPlanIssueCode.scheduleItemDueDateNotAfterPrevious],
      );
      expect(drawer.getByLabelText(installmentAmountLabel(1))).toHaveValue('33.33');
      expect(secondAmount).toHaveValue('0');
      expect(drawer.getByLabelText(installmentAmountLabel(3))).toHaveValue('33.35');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('resets manual edits to the current automatic preview and preserves its settings', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '3');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments }));

      const firstAmount = drawer.getByLabelText(installmentAmountLabel(1));
      await user.clear(firstAmount);
      await user.type(firstAmount, '20');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.resetToAutomaticSchedule }));

      expect(drawer.getByLabelText(debtMessages.form.installmentCountLabel)).toHaveValue('3');
      expect(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel)).toHaveValue('2026-10-01');
      expect(drawer.getByRole('button', { name: debtMessages.form.monthlyOption })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(drawer.queryByLabelText(installmentAmountLabel(1))).not.toBeInTheDocument();
      expect(drawer.getByRole('button', { name: debtMessages.form.customizeInstallments })).toBeInTheDocument();

      const table = drawer.getByRole('table', {
        name: debtMessages.form.installmentPreviewCaption,
      });
      const rows = within(table).getAllByRole('row');
      expect(rows[1]).toHaveTextContent('$33.33');
      expect(rows[2]).toHaveTextContent('$33.33');
      expect(rows[3]).toHaveTextContent('$33.35');
    });
  });
  describe('plan switching', () => {
    it('submits only the active plan while preserving the inactive draft', async () => {
      const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined);
      const { drawer, user } = renderDebtDrawer(onSubmit);
      await user.type(drawer.getByLabelText(debtMessages.form.descriptionLabel), 'Website redesign');
      await user.type(drawer.getByLabelText(debtMessages.form.totalAmountLabel), '100.01');
      await user.type(drawer.getByLabelText(debtMessages.form.dueDateLabel), '2026-09-30');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel), '2026-10-01');
      await user.clear(drawer.getByLabelText(debtMessages.form.installmentCountLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.installmentCountLabel), '3');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.onePaymentOption }));
      await user.clear(drawer.getByLabelText(debtMessages.form.dueDateLabel));
      await user.type(drawer.getByLabelText(debtMessages.form.dueDateLabel), '2026-11-05');
      await user.click(drawer.getByRole('button', { name: debtMessages.form.installmentsOption }));

      expect(drawer.getByLabelText(debtMessages.form.firstInstallmentDueDateLabel)).toHaveValue('2026-10-01');

      await user.click(drawer.getByRole('button', { name: debtMessages.form.save }));

      expect(onSubmit).toHaveBeenCalledWith({
        description: 'Website redesign',
        totalAmount: '100.01',
        currency: 'USD',
        scheduleItems: [
          { amount: '33.33', dueDate: '2026-10-01' },
          { amount: '33.33', dueDate: '2026-11-01' },
          { amount: '33.35', dueDate: '2026-12-01' },
        ],
      });

      await user.click(drawer.getByRole('button', { name: debtMessages.form.onePaymentOption }));
      expect(drawer.getByLabelText(debtMessages.form.dueDateLabel)).toHaveValue('2026-11-05');
    });
  });
});
