import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateDebtRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtDrawer } from '../editor/DebtDrawer';

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

  it('shows the generated schedule and updates it when installment settings change', async () => {
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
    await user.type(within(drawer).getByLabelText('Total amount'), '100.01');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');

    const table = within(drawer).getByRole('table', {
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

    await user.click(within(drawer).getByRole('button', { name: 'Weekly' }));
    rows = within(table).getAllByRole('row');
    expect(rows[2].querySelector('time')).toHaveAttribute('datetime', '2026-10-08');

    await user.clear(within(drawer).getByLabelText('Installment count'));
    await user.type(within(drawer).getByLabelText('Installment count'), '4');

    const updatedTable = within(drawer).getByRole('table', {
      name: 'Generated installment schedule',
    });
    rows = within(updatedTable).getAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(rows[1]).toHaveTextContent('$25.00');
    expect(rows[4]).toHaveTextContent('$25.01');
    expect(rows[4].querySelector('time')).toHaveAttribute('datetime', '2026-10-22');
  });

  it('does not show a preview until the installment settings are complete', async () => {
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
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));

    expect(
      within(drawer).queryByRole('table', { name: 'Generated installment schedule' }),
    ).not.toBeInTheDocument();

    await user.type(within(drawer).getByLabelText('Total amount'), '100.01');

    expect(within(drawer).getByText('Choose between 2 and 60 installments.')).toBeInTheDocument();
    expect(
      within(drawer).queryByRole('table', { name: 'Generated installment schedule' }),
    ).not.toBeInTheDocument();
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

  it('customizes the visible preview into editable rows and saves the edited schedule', async () => {
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
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');
    await user.clear(within(drawer).getByLabelText('Installment count'));
    await user.type(within(drawer).getByLabelText('Installment count'), '3');

    await user.click(within(drawer).getByRole('button', { name: 'Customize installments' }));

    expect(within(drawer).getByRole('button', { name: 'Reset to automatic schedule' })).toBeInTheDocument();
    expect(within(drawer).queryByLabelText('Installment count')).not.toBeInTheDocument();
    expect(within(drawer).getByLabelText('Installment 1 amount')).toHaveValue('33.33');
    expect(within(drawer).getByLabelText('Installment 2 amount')).toHaveValue('33.33');
    expect(within(drawer).getByLabelText('Installment 3 amount')).toHaveValue('33.35');
    expect(within(drawer).getByLabelText('Installment 1 due date')).toHaveValue('2026-10-01');
    expect(within(drawer).getByLabelText('Installment 2 due date')).toHaveValue('2026-11-01');
    expect(within(drawer).getByLabelText('Installment 3 due date')).toHaveValue('2026-12-01');

    await user.clear(within(drawer).getByLabelText('Installment 1 amount'));
    await user.type(within(drawer).getByLabelText('Installment 1 amount'), '20');
    await user.clear(within(drawer).getByLabelText('Installment 2 amount'));
    await user.type(within(drawer).getByLabelText('Installment 2 amount'), '30.0');
    await user.clear(within(drawer).getByLabelText('Installment 3 amount'));
    await user.type(within(drawer).getByLabelText('Installment 3 amount'), '50.01');
    await user.clear(within(drawer).getByLabelText('Installment 2 due date'));
    await user.type(within(drawer).getByLabelText('Installment 2 due date'), '2026-11-05');
    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

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

  it('appends a blank row and removes only the selected row', async () => {
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
    await user.type(within(drawer).getByLabelText('Total amount'), '100.01');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');
    await user.clear(within(drawer).getByLabelText('Installment count'));
    await user.type(within(drawer).getByLabelText('Installment count'), '2');
    await user.click(within(drawer).getByRole('button', { name: 'Customize installments' }));

    await user.click(within(drawer).getByRole('button', { name: 'Add installment' }));

    expect(within(drawer).getByLabelText('Installment 3 amount')).toHaveValue('');
    expect(within(drawer).getByLabelText('Installment 3 due date')).toHaveValue('');

    await user.type(within(drawer).getByLabelText('Installment 3 amount'), '12.34');
    await user.type(within(drawer).getByLabelText('Installment 3 due date'), '2026-12-01');
    await user.click(
      within(drawer).getByRole('button', { name: 'Remove installment 2' }),
    );

    expect(within(drawer).getByLabelText('Installment 1 amount')).toHaveValue('50.00');
    expect(within(drawer).getByLabelText('Installment 2 amount')).toHaveValue('12.34');
    expect(within(drawer).getByLabelText('Installment 2 due date')).toHaveValue('2026-12-01');
  });

  it('keeps Remove visible at the minimum and disables Add at the dynamic maximum', async () => {
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
    await user.type(within(drawer).getByLabelText('Total amount'), '0.03');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');
    await user.click(within(drawer).getByRole('button', { name: 'Customize installments' }));

    const addButton = within(drawer).getByRole('button', { name: 'Add installment' });
    const removeButtons = within(drawer).getAllByRole('button', {
      name: /Remove installment/,
    });

    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]).toBeDisabled();
    expect(removeButtons[1]).toBeDisabled();
    expect(addButton).toBeEnabled();

    await user.click(addButton);

    expect(
      within(drawer).getAllByRole('button', { name: /Remove installment/ }),
    ).toHaveLength(3);
    expect(
      within(drawer).getAllByRole('button', { name: /Remove installment/ }).every(
        (button) => !button.hasAttribute('disabled'),
      ),
    ).toBe(true);
    expect(addButton).toBeDisabled();
  });

  it('disables Add when the total cannot provide a truthful maximum', async () => {
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
    const totalAmount = within(drawer).getByLabelText('Total amount');
    await user.type(totalAmount, '100.01');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');
    await user.click(within(drawer).getByRole('button', { name: 'Customize installments' }));

    const addButton = within(drawer).getByRole('button', { name: 'Add installment' });
    expect(addButton).toBeEnabled();

    await user.clear(totalAmount);
    await user.type(totalAmount, 'not-a-number');

    expect(addButton).toBeDisabled();
  });

  it('keeps manual values and rows when a total change lowers the maximum', async () => {
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
    const totalAmount = within(drawer).getByLabelText('Total amount');
    await user.type(totalAmount, '0.03');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');
    await user.click(within(drawer).getByRole('button', { name: 'Customize installments' }));
    await user.click(within(drawer).getByRole('button', { name: 'Add installment' }));

    const firstAmount = within(drawer).getByLabelText('Installment 1 amount');
    await user.clear(within(drawer).getByLabelText('Installment 3 amount'));
    await user.type(within(drawer).getByLabelText('Installment 3 amount'), '0.01');
    await user.type(within(drawer).getByLabelText('Installment 3 due date'), '2026-12-01');

    await user.clear(totalAmount);
    await user.type(totalAmount, '0.02');

    expect(within(drawer).getByLabelText('Installment 1 amount')).toBe(firstAmount);
    expect(within(drawer).getByLabelText('Installment 1 amount')).toHaveValue('0.01');
    expect(within(drawer).getByLabelText('Installment 2 amount')).toHaveValue('0.02');
    expect(within(drawer).getByLabelText('Installment 3 amount')).toHaveValue('0.01');
    expect(within(drawer).getByLabelText('Installment 3 due date')).toHaveValue('2026-12-01');
    expect(within(drawer).getByRole('button', { name: 'Add installment' })).toBeDisabled();
    expect(within(drawer).getByRole('button', { name: 'Remove installment 3' })).toBeEnabled();
  });

  it('preserves the manual schedule through a one-payment round trip', async () => {
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
    await user.type(within(drawer).getByLabelText('Total amount'), '100.01');
    await user.type(within(drawer).getByLabelText('Due date'), '2026-09-30');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.click(within(drawer).getByRole('button', { name: 'Customize installments' }));
    await user.clear(within(drawer).getByLabelText('Installment 1 amount'));
    await user.type(within(drawer).getByLabelText('Installment 1 amount'), '20');

    await user.click(within(drawer).getByRole('button', { name: 'One payment' }));
    expect(within(drawer).getByLabelText('Due date')).toHaveValue('2026-09-30');

    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));

    expect(
      within(drawer).getByRole('button', { name: 'Reset to automatic schedule' }),
    ).toBeInTheDocument();
    expect(within(drawer).getByLabelText('Installment 1 amount')).toHaveValue('20');
    expect(within(drawer).getByLabelText('Installment 2 amount')).toHaveValue('50.01');
  });

  it('shows a manual row amount error on the matching row', async () => {
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
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');
    await user.clear(within(drawer).getByLabelText('Installment count'));
    await user.type(within(drawer).getByLabelText('Installment count'), '3');
    await user.click(within(drawer).getByRole('button', { name: 'Customize installments' }));

    const secondAmount = within(drawer).getByLabelText('Installment 2 amount');
    await user.clear(secondAmount);
    await user.type(secondAmount, '0');
    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

    expect(secondAmount).toHaveAccessibleDescription('Payment amount must be greater than zero.');
    expect(within(drawer).getByLabelText('Total amount')).not.toHaveAccessibleDescription();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('resets manual edits to the current automatic preview and preserves its settings', async () => {
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
    await user.type(within(drawer).getByLabelText('Total amount'), '100.01');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));
    await user.clear(within(drawer).getByLabelText('First installment due date'));
    await user.type(within(drawer).getByLabelText('First installment due date'), '2026-10-01');
    await user.clear(within(drawer).getByLabelText('Installment count'));
    await user.type(within(drawer).getByLabelText('Installment count'), '3');
    await user.click(within(drawer).getByRole('button', { name: 'Customize installments' }));

    const firstAmount = within(drawer).getByLabelText('Installment 1 amount');
    await user.clear(firstAmount);
    await user.type(firstAmount, '20');
    await user.click(within(drawer).getByRole('button', { name: 'Reset to automatic schedule' }));

    expect(within(drawer).getByLabelText('Installment count')).toHaveValue('3');
    expect(within(drawer).getByLabelText('First installment due date')).toHaveValue('2026-10-01');
    expect(within(drawer).getByRole('button', { name: 'Monthly' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(drawer).queryByLabelText('Installment 1 amount')).not.toBeInTheDocument();
    expect(
      within(drawer).getByRole('button', { name: 'Customize installments' }),
    ).toBeInTheDocument();

    const table = within(drawer).getByRole('table', {
      name: 'Generated installment schedule',
    });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('$33.33');
    expect(rows[2]).toHaveTextContent('$33.33');
    expect(rows[3]).toHaveTextContent('$33.35');
  });

  it('submits only the active plan while preserving the inactive draft', async () => {
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
    await user.click(within(drawer).getByRole('button', { name: 'One payment' }));
    await user.clear(within(drawer).getByLabelText('Due date'));
    await user.type(within(drawer).getByLabelText('Due date'), '2026-11-05');
    await user.click(within(drawer).getByRole('button', { name: 'Installments' }));

    expect(within(drawer).getByLabelText('First installment due date')).toHaveValue('2026-10-01');

    await user.click(within(drawer).getByRole('button', { name: 'Save debt' }));

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

    await user.click(within(drawer).getByRole('button', { name: 'One payment' }));
    expect(within(drawer).getByLabelText('Due date')).toHaveValue('2026-11-05');
  });
});
