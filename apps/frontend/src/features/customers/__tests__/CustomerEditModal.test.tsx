import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpdateCustomerRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { CustomerEditModal } from '../CustomerEditModal';
import { customerResources } from '../localization/resources';
import { baseCustomer, resetCustomerTestEnvironment } from './customerTestData';

const customerMessages = customerResources.en.common.customers;

const customerWithAddress = {
  ...baseCustomer,
  address: 'Istanbul',
};

describe('CustomerEditModal', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens as a described dialog focused on the name field', () => {
    renderWithAppProviders(
      <CustomerEditModal
        state="ready"
        customer={customerWithAddress}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(
      screen.getByRole('dialog', { name: customerMessages.edit.title }),
    ).toHaveAccessibleDescription(customerMessages.edit.description);
    expect(screen.getByLabelText(customerMessages.form.nameLabel)).toHaveFocus();
  });

  it('keeps keyboard focus inside the dialog', async () => {
    const user = userEvent.setup();
    renderWithAppProviders(
      <CustomerEditModal
        state="ready"
        customer={customerWithAddress}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: customerMessages.edit.title });
    const closeButton = within(dialog).getByRole('button', {
      name: customerMessages.edit.close,
    });
    const saveButton = within(dialog).getByRole('button', {
      name: customerMessages.actions.save,
    });

    saveButton.focus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(saveButton).toHaveFocus();
  });

  it('blocks every dismissal path while submission is pending', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithAppProviders(
      <CustomerEditModal
        state="ready"
        customer={customerWithAddress}
        isSubmitting
        onClose={onClose}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: customerMessages.edit.title });

    expect(
      within(dialog).getByRole('button', { name: customerMessages.edit.close }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole('button', { name: customerMessages.form.cancel }),
    ).toBeDisabled();

    await user.keyboard('{Escape}');
    await user.click(screen.getByTestId('customer-edit-overlay'));

    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toBeInTheDocument();
  });

  it('requests dismissal from an outside interaction while idle', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithAppProviders(
      <CustomerEditModal
        state="ready"
        customer={customerWithAddress}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    await user.click(screen.getByTestId('customer-edit-overlay'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders a prefilled edit form from a customer', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn<(request: UpdateCustomerRequest) => Promise<void>>(
      async () => undefined,
    );

    renderWithAppProviders(
      <CustomerEditModal
        state="ready"
        customer={customerWithAddress}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('dialog', { name: customerMessages.edit.title })).toBeInTheDocument();
    expect(screen.getByLabelText(customerMessages.form.nameLabel)).toHaveValue('Acme Market');
    expect(screen.getByLabelText(customerMessages.form.codeLabel)).toHaveValue('ACME-001');
    expect(screen.getByLabelText(customerMessages.form.phoneNumberLabel)).toHaveValue(
      '+90 555 123 45 67',
    );
    expect(screen.getByLabelText(customerMessages.form.addressLabel)).toHaveValue('Istanbul');
  });

  it('submits edited customer values', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn<(request: UpdateCustomerRequest) => Promise<void>>(
      async () => undefined,
    );

    renderWithAppProviders(
      <CustomerEditModal
        state="ready"
        customer={customerWithAddress}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(customerMessages.form.nameLabel), {
      target: { value: 'Acme Wholesale' },
    });
    fireEvent.click(screen.getByRole('button', { name: customerMessages.actions.save }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Acme Wholesale',
        code: 'ACME-001',
        phoneNumber: '+90 555 123 45 67',
        address: 'Istanbul',
      }),
    );
  });
});
