import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  debtPlanIssueCode,
  debtRequestValidationCode,
  type CreateDebtRequest,
} from '@collectify/contracts';

import { localeStorageKey } from '../../../shared/localization';
import { renderWithAppProviders } from '../../../shared/test/render';
import { DebtDrawer } from '../ui/editor/DebtDrawer';
import { debtResources } from '../localization/resources';
import { createDebtFixture } from './debtTestData';

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
