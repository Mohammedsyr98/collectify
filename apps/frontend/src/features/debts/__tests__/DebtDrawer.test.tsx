import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateDebtRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtDrawer } from '../DebtDrawer';

describe('DebtDrawer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['en-US'],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('submits a normalized one-payment debt request', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(
      async () => undefined,
    );

    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Description'), '  Website redesign  ');
    await user.type(screen.getByLabelText('Total amount'), '125.5');
    await user.type(screen.getByLabelText('Due date'), '2026-09-30');
    await user.click(screen.getByRole('button', { name: 'Save debt' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        description: 'Website redesign',
        totalAmount: '125.50',
        currency: 'USD',
        paymentPlan: {
          type: 'onePayment',
          dueDate: '2026-09-30',
        },
      }),
    );
  });

  it('shows an accessible localized error and preserves the draft when validation blocks submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(request: CreateDebtRequest) => Promise<void>>(
      async () => undefined,
    );

    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const description = screen.getByLabelText('Description');
    const dueDate = screen.getByLabelText('Due date');

    await user.type(description, 'Website redesign');
    await user.type(screen.getByLabelText('Total amount'), '125.50');
    await user.click(screen.getByRole('button', { name: 'Save debt' }));

    expect(dueDate).toHaveAccessibleDescription('Due date is required.');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(description).toHaveValue('Website redesign');
    expect(screen.getByRole('dialog', { name: 'Add debt' })).toBeInTheDocument();
  });
});
