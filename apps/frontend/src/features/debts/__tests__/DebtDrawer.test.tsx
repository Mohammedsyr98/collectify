import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  debtPlanIssueCode,
  debtRequestValidationCode,
  type CreateDebtRequest,
  type ReplaceDebtRequest,
} from '@collectify/contracts';

import { localeStorageKey } from '@/shared/localization';
import { renderWithAppProviders } from './render';
import { DebtDrawer } from '../ui/editor/DebtDrawer';
import { debtResources } from '../localization/resources';
import { createDebtFixture, createInstallmentDebtFixture } from './debtTestData';

const debtMessages = debtResources.en.common.debts;

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

    expect(screen.getByLabelText(debtMessages.form.descriptionLabel)).toHaveFocus();
  });

  it('prefills the edit form from the selected debt', () => {
    renderWithAppProviders(
      <DebtDrawer
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

    const drawer = screen.getByRole('dialog', { name: debtMessages.drawer.editTitle });

    expect(within(drawer).getByLabelText(debtMessages.form.descriptionLabel)).toHaveValue(
      'Website redesign',
    );
    expect(within(drawer).getByLabelText(debtMessages.form.totalAmountLabel)).toHaveValue('275.75');
    expect(within(drawer).getByLabelText(debtMessages.form.currencyLabel)).toHaveValue('EUR');
    expect(within(drawer).getByLabelText(debtMessages.form.dueDateLabel)).toHaveValue('2026-10-01');
    expect(within(drawer).queryByRole('note')).not.toBeInTheDocument();
  });

  it('locks currency and payment plan after a payment while preserving them for allowed edits', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(request: ReplaceDebtRequest) => Promise<void>>(
      async () => undefined,
    );
    const debt = createDebtFixture('customer_123', {
      totalAmount: '125.50',
      paidAmount: '25.00',
      remainingAmount: '100.50',
      paymentState: 'partiallyPaid',
      paymentCount: 1,
      scheduleItems: [
        {
          id: 'schedule_123',
          position: 1,
          amount: '125.50',
          dueDate: '2026-10-01',
          timing: 'upcoming',
          paidAmount: '25.00',
          remainingAmount: '100.50',
          paymentState: 'partiallyPaid',
          paymentCount: 1,
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

    const drawer = screen.getByRole('dialog', { name: debtMessages.drawer.editTitle });
    const currency = within(drawer).getByLabelText(debtMessages.form.currencyLabel);
    const totalAmount = within(drawer).getByLabelText(debtMessages.form.totalAmountLabel);
    const description = within(drawer).getByLabelText(debtMessages.form.descriptionLabel);
    const dueDate = within(drawer).getByLabelText(debtMessages.form.dueDateLabel);

    expect(
      within(drawer).getByText(
        'Payments are recorded. Currency and payment plan are locked. The total must stay at least the amount already paid.',
      ),
    ).toBeInTheDocument();
    expect(currency).toBeDisabled();
    expect(
      within(drawer).getByRole('button', { name: debtMessages.form.onePaymentOption }),
    ).toBeDisabled();
    expect(totalAmount).toBeEnabled();
    expect(description).toBeEnabled();
    expect(dueDate).toBeEnabled();

    await user.clear(description);
    await user.type(description, 'Updated description');
    await user.clear(dueDate);
    await user.type(dueDate, '2026-10-15');
    await user.click(within(drawer).getByRole('button', { name: debtMessages.form.save }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedVersion: 1,
          description: 'Updated description',
          totalAmount: '125.50',
          currency: 'USD',
          scheduleItems: [
            expect.objectContaining({
              id: 'schedule_123',
              amount: '125.50',
              dueDate: '2026-10-15',
            }),
          ],
        }),
      ),
    );
  });

  it('locks the total and installment addition when the debt is fully paid', () => {
    const debt = createInstallmentDebtFixture('customer_123', {
      totalAmount: '100.00',
      paidAmount: '100.00',
      remainingAmount: '0.00',
      paymentState: 'paid',
      paymentCount: 4,
      scheduleItems: [
        {
          id: 'schedule_paid_1',
          position: 1,
          amount: '50.00',
          dueDate: '2026-09-30',
          timing: 'upcoming',
          paidAmount: '50.00',
          remainingAmount: '0.00',
          paymentState: 'paid',
          paymentCount: 2,
        },
        {
          id: 'schedule_paid_2',
          position: 2,
          amount: '50.00',
          dueDate: '2026-10-30',
          timing: 'upcoming',
          paidAmount: '50.00',
          remainingAmount: '0.00',
          paymentState: 'paid',
          paymentCount: 2,
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

    const drawer = screen.getByRole('dialog', { name: debtMessages.drawer.editTitle });
    expect(
      within(drawer).getByText(debtMessages.drawer.fullyPaidRestrictions),
    ).toBeInTheDocument();
    expect(within(drawer).getByLabelText(debtMessages.form.currencyLabel)).toBeDisabled();
    expect(within(drawer).getByLabelText(debtMessages.form.totalAmountLabel)).toBeDisabled();
    expect(
      within(drawer).getByRole('button', { name: debtMessages.form.installmentsOption }),
    ).toBeDisabled();
    expect(
      within(drawer).getByRole('button', { name: debtMessages.form.addInstallment }),
    ).toBeDisabled();
    expect(within(drawer).getByLabelText(debtMessages.form.descriptionLabel)).toBeEnabled();
    expect(
      within(drawer).getByLabelText(debtMessages.form.installmentDueDateFieldLabel.replace('{{number}}', '1')),
    ).toBeEnabled();
  });

  it('disables removal for installments with any recorded payment', () => {
    const debt = createInstallmentDebtFixture('customer_123', {
      totalAmount: '100.00',
      paidAmount: '20.00',
      remainingAmount: '80.00',
      paymentState: 'partiallyPaid',
      paymentCount: 1,
      scheduleItems: [
        {
          id: 'schedule_paid',
          position: 1,
          amount: '40.00',
          dueDate: '2026-09-30',
          timing: 'overdue',
          paidAmount: '20.00',
          remainingAmount: '20.00',
          paymentState: 'partiallyPaid',
          paymentCount: 1,
        },
        {
          id: 'schedule_unpaid_1',
          position: 2,
          amount: '30.00',
          dueDate: '2026-10-30',
          timing: 'upcoming',
        },
        {
          id: 'schedule_unpaid_2',
          position: 3,
          amount: '30.00',
          dueDate: '2026-11-30',
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

    const drawer = screen.getByRole('dialog', { name: debtMessages.drawer.editTitle });

    expect(screen.getByRole('note')).toHaveTextContent(
      debtMessages.drawer.installmentsWithPaymentsCannotBeRemoved,
    );
    const paidInstallmentRemoveButton = within(drawer).getByRole('button', {
      name: debtMessages.form.removeInstallment.replace('{{number}}', '1'),
    });
    expect(paidInstallmentRemoveButton).toBeDisabled();
    expect(paidInstallmentRemoveButton).toHaveAccessibleDescription(
      expect.stringContaining(debtMessages.drawer.installmentsWithPaymentsCannotBeRemoved),
    );
    expect(
      within(drawer).getByRole('button', {
        name: debtMessages.form.removeInstallment.replace('{{number}}', '2'),
      }),
    ).toBeEnabled();
  });

  it.each([
    {
      locale: 'en',
      notice: debtResources.en.common.debts.drawer.paymentRestrictions,
      direction: 'ltr',
    },
    {
      locale: 'tr',
      notice: debtResources.tr.common.debts.drawer.paymentRestrictions,
      direction: 'ltr',
    },
    {
      locale: 'ar',
      notice: debtResources.ar.common.debts.drawer.paymentRestrictions,
      direction: 'rtl',
    },
  ])('renders the payment restrictions in $locale with the correct direction', ({
    locale,
    notice,
    direction,
  }) => {
    window.localStorage.setItem(localeStorageKey, locale);
    const debt = createDebtFixture('customer_123', {
      paymentCount: 1,
      paidAmount: '25.00',
      remainingAmount: '100.50',
      paymentState: 'partiallyPaid',
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

    expect(screen.getByRole('note')).toHaveTextContent(notice);
    expect(document.documentElement).toHaveAttribute('dir', direction);
  });

  it('describes edit mode accessibly', () => {
    renderWithAppProviders(
      <DebtDrawer
        debt={createDebtFixture('customer_123')}
        isSubmitting={false}
        mode="edit"
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByRole('dialog', { name: debtMessages.drawer.editTitle })).toHaveAccessibleDescription(
      debtMessages.drawer.editDescription,
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

    const dialog = screen.getByRole('dialog', { name: debtMessages.drawer.createTitle });
    const saveButton = within(dialog).getByRole('button', { name: debtMessages.form.saving });

    expect(saveButton).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: debtMessages.form.cancel })).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: debtMessages.drawer.close }),
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

    const description = screen.getByLabelText(debtMessages.form.descriptionLabel);
    const dueDate = screen.getByLabelText(debtMessages.form.dueDateLabel);

    await user.type(description, 'Website redesign');
    await user.type(screen.getByLabelText(debtMessages.form.totalAmountLabel), '125.50');
    await user.click(screen.getByRole('button', { name: debtMessages.form.save }));

    expect(dueDate).toHaveAccessibleDescription(
      debtMessages.validation[debtRequestValidationCode.debtDueDateRequired],
    );
    expect(dueDate).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(description).toHaveValue('Website redesign');
    expect(screen.getByRole('dialog', { name: debtMessages.drawer.createTitle })).toBeInTheDocument();
  });

  it('shows schedule-item amount errors on the total amount field after submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);

    renderWithAppProviders(
      <DebtDrawer
        defaultCurrency="USD"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const totalAmount = screen.getByLabelText(debtMessages.form.totalAmountLabel);
    const dueDate = screen.getByLabelText(debtMessages.form.dueDateLabel);
    await user.type(screen.getByLabelText(debtMessages.form.descriptionLabel), 'Website redesign');
    await user.type(totalAmount, '0');
    await user.type(dueDate, '2026-09-30');

    expect(totalAmount).not.toHaveAccessibleDescription();

    await user.click(screen.getByRole('button', { name: debtMessages.form.save }));

    expect(totalAmount).toHaveAccessibleDescription(
      debtMessages.validation[debtPlanIssueCode.scheduleItemAmountNotPositive],
    );
    expect(totalAmount).toHaveFocus();
    expect(dueDate).not.toHaveAccessibleDescription();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(totalAmount).toHaveValue('0');
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

    const dialog = screen.getByRole('dialog', { name: debtMessages.drawer.createTitle });
    expect(dialog).toHaveAccessibleDescription(
      debtMessages.drawer.description,
    );
    const closeButton = within(dialog).getByRole('button', {
      name: debtMessages.drawer.close,
    });
    const saveButton = within(dialog).getByRole('button', { name: debtMessages.form.save });

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

});
