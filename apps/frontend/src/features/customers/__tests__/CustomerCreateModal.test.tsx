import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateCustomerRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { CustomerCreateModal } from '../CustomerCreateModal';
import { resetCustomerTestEnvironment } from './customerTestData';

describe('CustomerCreateModal', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens as a described dialog focused on the name field', () => {
    renderCustomerCreateHarness({
      onSubmit: vi.fn<() => Promise<void>>(async () => undefined),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open create' }));

    expect(
      screen.getByRole('dialog', { name: 'Create customer' }),
    ).toHaveAccessibleDescription(
      'Create a customer for debt and payment tracking.',
    );
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('closes with Escape and returns focus to the opening button', async () => {
    const user = userEvent.setup();
    renderCustomerCreateHarness({
      onSubmit: vi.fn<() => Promise<void>>(async () => undefined),
    });
    const openButton = screen.getByRole('button', { name: 'Open create' });

    await user.click(openButton);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it('keeps keyboard focus inside the dialog', async () => {
    const user = userEvent.setup();
    renderCustomerCreateHarness({
      onSubmit: vi.fn<() => Promise<void>>(async () => undefined),
    });

    await user.click(screen.getByRole('button', { name: 'Open create' }));
    const dialog = screen.getByRole('dialog', { name: 'Create customer' });
    const closeButton = within(dialog).getByRole('button', {
      name: 'Close customer form',
    });
    const saveButton = within(dialog).getByRole('button', {
      name: 'Save customer',
    });

    saveButton.focus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(saveButton).toHaveFocus();
  });

  it('blocks every dismissal path while submission is pending', async () => {
    const user = userEvent.setup();
    renderCustomerCreateHarness({
      isSubmitting: true,
      onSubmit: vi.fn<() => Promise<void>>(async () => undefined),
    });

    await user.click(screen.getByRole('button', { name: 'Open create' }));
    const dialog = screen.getByRole('dialog', { name: 'Create customer' });

    expect(
      within(dialog).getByRole('button', { name: 'Close customer form' }),
    ).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await user.keyboard('{Escape}');
    await user.click(screen.getByTestId('customer-create-overlay'));

    expect(dialog).toBeInTheDocument();
  });

  it('closes from the header button without submitting and clears draft values after reopening', () => {
    const onSubmit = vi.fn<() => Promise<void>>(async () => undefined);
    renderCustomerCreateHarness({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open create' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Draft Customer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close customer form' }));

    fireEvent.click(screen.getByRole('button', { name: 'Open create' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('closes from cancel without submitting and clears draft values after reopening', () => {
    const onSubmit = vi.fn<() => Promise<void>>(async () => undefined);
    renderCustomerCreateHarness({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open create' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Draft Customer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    fireEvent.click(screen.getByRole('button', { name: 'Open create' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('closes from the overlay without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<() => Promise<void>>(async () => undefined);
    renderCustomerCreateHarness({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open create' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Draft Customer' },
    });
    await user.click(screen.getByTestId('customer-create-overlay'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a normalized create request', async () => {
    const onSubmit = vi.fn<(request: CreateCustomerRequest) => Promise<void>>(
      async () => undefined,
    );
    renderCustomerCreateHarness({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open create' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: '  Acme Market  ' },
    });
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: '  ACME-001  ' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '  +90 555 123 45 67  ' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save customer' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Acme Market',
        code: 'ACME-001',
        phoneNumber: '+90 555 123 45 67',
      }),
    );
  });

  it('keeps entered values when validation blocks submission', async () => {
    const onSubmit = vi.fn<(request: CreateCustomerRequest) => Promise<void>>(
      async () => undefined,
    );
    renderCustomerCreateHarness({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open create' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Acme Market' },
    });
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: 'ACME-001' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '42 Market Street' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(await screen.findByText('Phone number is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Market');
    expect(screen.getByLabelText('Code')).toHaveValue('ACME-001');
    expect(screen.getByLabelText('Phone number')).toHaveValue('');
    expect(screen.getByLabelText('Address')).toHaveValue('42 Market Street');
  });
});

function renderCustomerCreateHarness({
  isSubmitting = false,
  onSubmit,
}: {
  isSubmitting?: boolean;
  onSubmit: (request: CreateCustomerRequest) => Promise<void>;
}) {
  function CustomerCreateHarness() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const openButtonRef = useRef<HTMLButtonElement>(null);

    return (
      <>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          ref={openButtonRef}
          type="button"
        >
          Open create
        </button>
        {isCreateModalOpen ? (
          <CustomerCreateModal
            isSubmitting={isSubmitting}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={onSubmit}
            returnFocusRef={openButtonRef}
          />
        ) : null}
      </>
    );
  }

  return renderWithAppProviders(<CustomerCreateHarness />);
}
