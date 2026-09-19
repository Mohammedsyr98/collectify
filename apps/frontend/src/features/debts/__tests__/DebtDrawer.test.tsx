import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateDebtRequest } from '@collectify/contracts';

import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtDrawer } from '../DebtDrawer';
import { createDebtFixture } from './debtTestData';

describe('DebtDrawer', () => {
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

  it('focuses the description when the drawer opens', () => {
    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByLabelText('Description')).toHaveFocus();
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

  it('prefills the edit form from the selected debt', () => {
    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="TRY"
        debt={createDebtFixture('customer_123', {
          description: 'Website redesign',
          totalAmount: '275.75',
          currency: 'EUR',
          scheduleItems: [
            {
              id: 'schedule_123',
              position: 1,
              amount: '275.75',
              dueDate: '2026-10-01',
              timing: 'upcoming',
            },
          ],
        })}
        isSubmitting={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Edit debt' });

    expect(within(drawer).getByLabelText('Description')).toHaveValue(
      'Website redesign',
    );
    expect(within(drawer).getByLabelText('Total amount')).toHaveValue('275.75');
    expect(within(drawer).getByLabelText('Currency')).toHaveValue('EUR');
    expect(within(drawer).getByLabelText('Due date')).toHaveValue('2026-10-01');
  });

  it('describes edit mode accessibly', () => {
    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        debt={createDebtFixture('customer_123')}
        isSubmitting={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Edit debt' })).toHaveAccessibleDescription(
      'Edit this one-payment debt for this customer.',
    );
  });

  it('locks the drawer while a submission is pending', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn(async () => undefined);

    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Add debt' });
    const saveButton = within(dialog).getByRole('button', { name: 'Saving' });

    expect(saveButton).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: 'Close debt form' }),
    ).toBeDisabled();

    await user.click(saveButton);
    await user.keyboard('{Escape}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toBeInTheDocument();
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

  it('keeps keyboard focus inside the drawer', async () => {
    const user = userEvent.setup();

    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Add debt' });
    expect(dialog).toHaveAccessibleDescription(
      'Create a one-payment debt for this customer.',
    );
    const closeButton = within(dialog).getByRole('button', {
      name: 'Close debt form',
    });
    const saveButton = within(dialog).getByRole('button', { name: 'Save debt' });

    saveButton.focus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(saveButton).toHaveFocus();
  });

  it.each([
    {
      descriptionLabel: 'الوصف',
      dueDateLabel: 'تاريخ الاستحقاق',
      locale: 'ar',
      saveLabel: 'حفظ الدين',
      title: 'إضافة دين',
    },
    {
      descriptionLabel: 'Açıklama',
      dueDateLabel: 'Vade tarihi',
      locale: 'tr',
      saveLabel: 'Borcu kaydet',
      title: 'Borç ekle',
    },
  ])(
    'renders localized $locale controls',
    ({ descriptionLabel, dueDateLabel, locale, saveLabel, title }) => {
      window.localStorage.setItem(localeStorageKey, locale);

      renderWithAppProviders(
        <DebtDrawer
          defaultCurrency="USD"
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={vi.fn(async () => undefined)}
        />,
      );

      const drawer = screen.getByRole('dialog', { name: title });

      expect(within(drawer).getByLabelText(descriptionLabel)).toBeInTheDocument();
      expect(within(drawer).getByLabelText(dueDateLabel)).toBeInTheDocument();
      expect(
        within(drawer).getByRole('button', { name: saveLabel }),
      ).toBeInTheDocument();
    },
  );

  it('uses logical inline-end positioning', () => {
    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    const drawer = screen.getByRole('dialog', { name: 'Add debt' });

    expect(drawer).toHaveClass('end-0');
    expect(drawer).not.toHaveClass('left-0', 'right-0');
  });
});
