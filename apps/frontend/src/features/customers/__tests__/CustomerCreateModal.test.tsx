import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
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

  it('closes from the overlay without submitting', () => {
    const onSubmit = vi.fn<() => Promise<void>>(async () => undefined);
    renderCustomerCreateHarness({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Open create' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Draft Customer' },
    });
    fireEvent.mouseDown(screen.getByRole('dialog'));

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
  onSubmit,
}: {
  onSubmit: (request: CreateCustomerRequest) => Promise<void>;
}) {
  function CustomerCreateHarness() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
      <>
        <button onClick={() => setIsCreateModalOpen(true)} type="button">
          Open create
        </button>
        {isCreateModalOpen ? (
          <CustomerCreateModal
            isSubmitting={false}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={onSubmit}
          />
        ) : null}
      </>
    );
  }

  return renderWithAppProviders(<CustomerCreateHarness />);
}
