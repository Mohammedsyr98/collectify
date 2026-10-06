import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateDebtRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtDrawer } from '../editor/DebtDrawer';

function renderDebtDrawer(
  onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined),
) {
  const user = userEvent.setup();

  renderWithAppProviders(
    <DebtDrawer defaultCurrency="USD" isSubmitting={false} onClose={vi.fn()} onSubmit={onSubmit} />,
  );

  const drawer = within(screen.getByRole('dialog', { name: 'Add debt' }));

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

  describe('automatic schedule', () => {
    it('seeds the first installment date from the one-payment date on first activation', async () => {
      const { drawer, user } = renderDebtDrawer();
      expect(drawer.getByRole('button', { name: 'One payment' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await user.type(drawer.getByLabelText('Due date'), '2026-09-30');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));

      expect(drawer.getByRole('button', { name: 'Installments' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(drawer.getByLabelText('Installment count')).toHaveValue('2');
      expect(drawer.getByRole('button', { name: 'Monthly' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(drawer.getByLabelText('First installment due date')).toHaveValue('2026-09-30');
    });

    it('preserves each plan branch and frequency across later switches', async () => {
      const { drawer, user } = renderDebtDrawer();
      const dueDate = drawer.getByLabelText('Due date');
      await user.type(dueDate, '2026-09-30');

      const installments = drawer.getByRole('button', {
        name: 'Installments',
      });
      await user.click(installments);
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '4');

      const weekly = drawer.getByRole('button', { name: 'Weekly' });
      weekly.focus();
      await user.keyboard('{Enter}');

      const onePayment = drawer.getByRole('button', {
        name: 'One payment',
      });
      onePayment.focus();
      await user.keyboard('{Enter}');
      await user.clear(drawer.getByLabelText('Due date'));
      await user.type(drawer.getByLabelText('Due date'), '2026-11-05');

      installments.focus();
      await user.keyboard('{Enter}');

      expect(installments).toHaveAttribute('aria-pressed', 'true');
      expect(drawer.getByLabelText('Installment count')).toHaveValue('4');
      expect(weekly).toHaveAttribute('aria-pressed', 'true');
      expect(drawer.getByLabelText('First installment due date')).toHaveValue('2026-10-01');

      onePayment.focus();
      await user.keyboard('{Enter}');

      expect(onePayment).toHaveAttribute('aria-pressed', 'true');
      expect(drawer.getByLabelText('Due date')).toHaveValue('2026-11-05');
    });

    it('shows the generated schedule and updates it when installment settings change', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText('Total amount'), '100.01');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');

      const table = drawer.getByRole('table', {
        name: 'Generated installment schedule',
      });
      let rows = within(table).getAllByRole('row');

      expect(rows).toHaveLength(3);
      expect(rows[1]).toHaveTextContent('1');
      expect(rows[1]).toHaveTextContent('$50.00');
      expect(rows[1].querySelector('bdi[dir="ltr"]')).toHaveTextContent('$50.00');
      expect(rows[1].querySelector('time')).toHaveAttribute('datetime', '2026-10-01');
      expect(rows[2]).toHaveTextContent('$50.01');
      expect(rows[2].querySelector('time')).toHaveAttribute('datetime', '2026-11-01');

      await user.click(drawer.getByRole('button', { name: 'Weekly' }));
      rows = within(table).getAllByRole('row');
      expect(rows[2].querySelector('time')).toHaveAttribute('datetime', '2026-10-08');

      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '4');

      const updatedTable = drawer.getByRole('table', {
        name: 'Generated installment schedule',
      });
      rows = within(updatedTable).getAllByRole('row');
      expect(rows).toHaveLength(5);
      expect(rows[1]).toHaveTextContent('$25.00');
      expect(rows[4]).toHaveTextContent('$25.01');
      expect(rows[4].querySelector('time')).toHaveAttribute('datetime', '2026-10-22');
    });

    it('does not show a preview until the installment settings are complete', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.click(drawer.getByRole('button', { name: 'Installments' }));

      expect(
        drawer.queryByRole('table', { name: 'Generated installment schedule' }),
      ).not.toBeInTheDocument();

      await user.type(drawer.getByLabelText('Total amount'), '100.01');

      expect(drawer.getByText('Choose between 2 and 60 installments.')).toBeInTheDocument();
      expect(
        drawer.queryByRole('table', { name: 'Generated installment schedule' }),
      ).not.toBeInTheDocument();
    });

    it('submits the generated request for the selected installment plan', async () => {
      const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined);
      const { drawer, user } = renderDebtDrawer(onSubmit);
      await user.type(drawer.getByLabelText('Description'), 'Website redesign');
      await user.type(drawer.getByLabelText('Total amount'), '100.01');
      await user.type(drawer.getByLabelText('Due date'), '2026-09-30');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '3');
      await user.click(drawer.getByRole('button', { name: 'Weekly' }));
      await user.click(drawer.getByRole('button', { name: 'Save debt' }));

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

  describe('manual schedule', () => {
    it('customizes the visible preview into editable rows and saves the edited schedule', async () => {
      const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined);
      const { drawer, user } = renderDebtDrawer(onSubmit);
      await user.type(drawer.getByLabelText('Description'), 'Website redesign');
      await user.type(drawer.getByLabelText('Total amount'), '100.01');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '3');

      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));

      expect(
        drawer.getByRole('button', { name: 'Reset to automatic schedule' }),
      ).toBeInTheDocument();
      expect(drawer.queryByLabelText('Installment count')).not.toBeInTheDocument();
      expect(drawer.getByLabelText('Installment 1 amount')).toHaveValue('33.33');
      expect(drawer.getByLabelText('Installment 2 amount')).toHaveValue('33.33');
      expect(drawer.getByLabelText('Installment 3 amount')).toHaveValue('33.35');
      expect(drawer.getByLabelText('Installment 1 due date')).toHaveValue('2026-10-01');
      expect(drawer.getByLabelText('Installment 2 due date')).toHaveValue('2026-11-01');
      expect(drawer.getByLabelText('Installment 3 due date')).toHaveValue('2026-12-01');

      await user.clear(drawer.getByLabelText('Installment 1 amount'));
      await user.type(drawer.getByLabelText('Installment 1 amount'), '20');
      await user.clear(drawer.getByLabelText('Installment 2 amount'));
      await user.type(drawer.getByLabelText('Installment 2 amount'), '30.0');
      await user.clear(drawer.getByLabelText('Installment 3 amount'));
      await user.type(drawer.getByLabelText('Installment 3 amount'), '50.01');
      await user.clear(drawer.getByLabelText('Installment 2 due date'));
      await user.type(drawer.getByLabelText('Installment 2 due date'), '2026-11-05');
      await user.click(drawer.getByRole('button', { name: 'Save debt' }));

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
      const totalAmount = drawer.getByLabelText('Total amount');

      await user.type(totalAmount, '100.01');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '3');
      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));

      const initialSummary = drawer.getByRole('region', { name: 'Installment summary' });
      expect(within(initialSummary).getByText('$0.00')).toBeInTheDocument();
      expect(within(initialSummary).getByText('Remaining')).toBeInTheDocument();

      const firstAmount = drawer.getByLabelText('Installment 1 amount');
      const secondAmount = drawer.getByLabelText('Installment 2 amount');
      const thirdAmount = drawer.getByLabelText('Installment 3 amount');
      await user.clear(firstAmount);
      await user.type(firstAmount, '20');
      await user.clear(secondAmount);
      await user.type(secondAmount, '30.0');
      await user.clear(thirdAmount);
      await user.type(thirdAmount, '40');

      let summary = drawer.getByRole('region', { name: 'Installment summary' });
      expect(within(summary).getByText('$100.01')).toBeInTheDocument();
      expect(within(summary).getByText('$90.00')).toBeInTheDocument();
      expect(within(summary).getByText('$10.01')).toBeInTheDocument();
      expect(within(summary).getByText('Remaining')).toBeInTheDocument();

      await user.selectOptions(drawer.getByLabelText('Currency'), 'EUR');
      summary = drawer.getByRole('region', { name: 'Installment summary' });
      expect(within(summary).getByText('€100.01')).toBeInTheDocument();
      await user.selectOptions(drawer.getByLabelText('Currency'), 'USD');

      await user.clear(totalAmount);

      summary = drawer.getByRole('region', { name: 'Installment summary' });
      expect(within(summary).getByText('Debt total').parentElement).toHaveTextContent('$0.00');
      expect(within(summary).getByText('Schedule total').parentElement).toHaveTextContent('$90.00');
      expect(within(summary).getByText('Excess').parentElement).toHaveTextContent('$90.00');

      await user.type(totalAmount, '95');

      summary = drawer.getByRole('region', { name: 'Installment summary' });
      expect(within(summary).getByText('$95.00')).toBeInTheDocument();
      expect(within(summary).getByText('$5.00')).toBeInTheDocument();
      expect(firstAmount).toHaveValue('20');
      expect(secondAmount).toHaveValue('30.0');
      expect(thirdAmount).toHaveValue('40');

      await user.clear(thirdAmount);
      summary = drawer.getByRole('region', { name: 'Installment summary' });
      expect(within(summary).getByText('$50.00')).toBeInTheDocument();
      expect(within(summary).getByText('$45.00')).toBeInTheDocument();
      expect(within(summary).getByText('Remaining')).toBeInTheDocument();

      await user.type(thirdAmount, '60.');
      summary = drawer.getByRole('region', { name: 'Installment summary' });
      expect(within(summary).getByText('$110.00')).toBeInTheDocument();
      expect(within(summary).getByText('$15.00')).toBeInTheDocument();
      expect(within(summary).getByText('Excess')).toBeInTheDocument();

      await user.type(thirdAmount, '01');
      summary = drawer.getByRole('region', { name: 'Installment summary' });
      expect(within(summary).getByText('$110.01')).toBeInTheDocument();
      expect(within(summary).getByText('$15.01')).toBeInTheDocument();
      expect(within(summary).getByText('Excess')).toBeInTheDocument();
      expect(firstAmount).toHaveValue('20');
      expect(secondAmount).toHaveValue('30.0');
      expect(thirdAmount).toHaveValue('60.01');
    });

    it('sets date bounds from neighboring rows without blocking a past first date', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText('Total amount'), '100.01');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-01-31');
      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '3');
      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));

      const firstDueDate = drawer.getByLabelText('Installment 1 due date');
      const secondDueDate = drawer.getByLabelText('Installment 2 due date');
      const thirdDueDate = drawer.getByLabelText('Installment 3 due date');

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
      await user.type(drawer.getByLabelText('Total amount'), '100.01');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '2');
      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));

      await user.click(drawer.getByRole('button', { name: 'Add installment' }));

      expect(drawer.getByLabelText('Installment 3 amount')).toHaveValue('');
      expect(drawer.getByLabelText('Installment 3 due date')).toHaveValue('');

      await user.type(drawer.getByLabelText('Installment 3 amount'), '12.34');
      await user.type(drawer.getByLabelText('Installment 3 due date'), '2026-12-01');
      await user.click(drawer.getByRole('button', { name: 'Remove installment 2' }));

      expect(drawer.getByLabelText('Installment 1 amount')).toHaveValue('50.00');
      expect(drawer.getByLabelText('Installment 2 amount')).toHaveValue('12.34');
      expect(drawer.getByLabelText('Installment 2 due date')).toHaveValue('2026-12-01');
    });

    it('keeps Remove visible at the minimum and disables Add at the dynamic maximum', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText('Total amount'), '0.03');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));

      const addButton = drawer.getByRole('button', { name: 'Add installment' });
      const removeButtons = drawer.getAllByRole('button', {
        name: /Remove installment/,
      });

      expect(removeButtons).toHaveLength(2);
      expect(removeButtons[0]).toBeDisabled();
      expect(removeButtons[1]).toBeDisabled();
      expect(addButton).toBeEnabled();

      await user.click(addButton);

      expect(drawer.getAllByRole('button', { name: /Remove installment/ })).toHaveLength(3);
      expect(
        drawer
          .getAllByRole('button', { name: /Remove installment/ })
          .every((button) => !button.hasAttribute('disabled')),
      ).toBe(true);
      expect(addButton).toBeDisabled();
    });

    it('disables Add when the total cannot provide a truthful maximum', async () => {
      const { drawer, user } = renderDebtDrawer();
      const totalAmount = drawer.getByLabelText('Total amount');
      await user.type(totalAmount, '100.01');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));

      const addButton = drawer.getByRole('button', { name: 'Add installment' });
      expect(addButton).toBeEnabled();

      await user.clear(totalAmount);
      await user.type(totalAmount, 'not-a-number');

      expect(addButton).toBeDisabled();
    });

    it('keeps manual values and rows when a total change lowers the maximum', async () => {
      const { drawer, user } = renderDebtDrawer();
      const totalAmount = drawer.getByLabelText('Total amount');
      await user.type(totalAmount, '0.03');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));
      await user.click(drawer.getByRole('button', { name: 'Add installment' }));

      const firstAmount = drawer.getByLabelText('Installment 1 amount');
      await user.clear(drawer.getByLabelText('Installment 3 amount'));
      await user.type(drawer.getByLabelText('Installment 3 amount'), '0.01');
      await user.type(drawer.getByLabelText('Installment 3 due date'), '2026-12-01');

      await user.clear(totalAmount);
      await user.type(totalAmount, '0.02');

      expect(drawer.getByLabelText('Installment 1 amount')).toBe(firstAmount);
      expect(drawer.getByLabelText('Installment 1 amount')).toHaveValue('0.01');
      expect(drawer.getByLabelText('Installment 2 amount')).toHaveValue('0.02');
      expect(drawer.getByLabelText('Installment 3 amount')).toHaveValue('0.01');
      expect(drawer.getByLabelText('Installment 3 due date')).toHaveValue('2026-12-01');
      expect(drawer.getByRole('button', { name: 'Add installment' })).toBeDisabled();
      expect(drawer.getByRole('button', { name: 'Remove installment 3' })).toBeEnabled();
    });

    it('preserves the manual schedule through a one-payment round trip', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText('Total amount'), '100.01');
      await user.type(drawer.getByLabelText('Due date'), '2026-09-30');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));
      await user.clear(drawer.getByLabelText('Installment 1 amount'));
      await user.type(drawer.getByLabelText('Installment 1 amount'), '20');

      await user.click(drawer.getByRole('button', { name: 'One payment' }));
      expect(drawer.getByLabelText('Due date')).toHaveValue('2026-09-30');

      await user.click(drawer.getByRole('button', { name: 'Installments' }));

      expect(
        drawer.getByRole('button', { name: 'Reset to automatic schedule' }),
      ).toBeInTheDocument();
      expect(drawer.getByLabelText('Installment 1 amount')).toHaveValue('20');
      expect(drawer.getByLabelText('Installment 2 amount')).toHaveValue('50.01');
    });

    it('shows a manual row amount error on the matching row', async () => {
      const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(async () => undefined);
      const { drawer, user } = renderDebtDrawer(onSubmit);
      await user.type(drawer.getByLabelText('Description'), 'Website redesign');
      await user.type(drawer.getByLabelText('Total amount'), '100.01');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '3');
      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));

      const secondAmount = drawer.getByLabelText('Installment 2 amount');
      await user.clear(secondAmount);
      await user.type(secondAmount, '0');
      await user.click(drawer.getByRole('button', { name: 'Save debt' }));

      expect(secondAmount).toHaveAccessibleDescription('Payment amount must be greater than zero.');
      expect(drawer.getByLabelText('Total amount')).not.toHaveAccessibleDescription();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('resets manual edits to the current automatic preview and preserves its settings', async () => {
      const { drawer, user } = renderDebtDrawer();
      await user.type(drawer.getByLabelText('Total amount'), '100.01');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '3');
      await user.click(drawer.getByRole('button', { name: 'Customize installments' }));

      const firstAmount = drawer.getByLabelText('Installment 1 amount');
      await user.clear(firstAmount);
      await user.type(firstAmount, '20');
      await user.click(drawer.getByRole('button', { name: 'Reset to automatic schedule' }));

      expect(drawer.getByLabelText('Installment count')).toHaveValue('3');
      expect(drawer.getByLabelText('First installment due date')).toHaveValue('2026-10-01');
      expect(drawer.getByRole('button', { name: 'Monthly' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(drawer.queryByLabelText('Installment 1 amount')).not.toBeInTheDocument();
      expect(drawer.getByRole('button', { name: 'Customize installments' })).toBeInTheDocument();

      const table = drawer.getByRole('table', {
        name: 'Generated installment schedule',
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
      await user.type(drawer.getByLabelText('Description'), 'Website redesign');
      await user.type(drawer.getByLabelText('Total amount'), '100.01');
      await user.type(drawer.getByLabelText('Due date'), '2026-09-30');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));
      await user.clear(drawer.getByLabelText('First installment due date'));
      await user.type(drawer.getByLabelText('First installment due date'), '2026-10-01');
      await user.clear(drawer.getByLabelText('Installment count'));
      await user.type(drawer.getByLabelText('Installment count'), '3');
      await user.click(drawer.getByRole('button', { name: 'One payment' }));
      await user.clear(drawer.getByLabelText('Due date'));
      await user.type(drawer.getByLabelText('Due date'), '2026-11-05');
      await user.click(drawer.getByRole('button', { name: 'Installments' }));

      expect(drawer.getByLabelText('First installment due date')).toHaveValue('2026-10-01');

      await user.click(drawer.getByRole('button', { name: 'Save debt' }));

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

      await user.click(drawer.getByRole('button', { name: 'One payment' }));
      expect(drawer.getByLabelText('Due date')).toHaveValue('2026-11-05');
    });
  });
});
