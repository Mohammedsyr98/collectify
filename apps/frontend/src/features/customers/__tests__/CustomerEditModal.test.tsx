import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpdateCustomerRequest } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { CustomerEditModal } from '../CustomerEditModal';
import { baseCustomer, resetCustomerTestEnvironment } from './customerTestData';

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

  it('renders a prefilled edit form from a customer', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn<(request: UpdateCustomerRequest) => Promise<void>>(
      async () => undefined,
    );

    renderWithAppProviders(
      <CustomerEditModal
        customer={customerWithAddress}
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Edit customer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Market');
    expect(screen.getByLabelText('Code')).toHaveValue('ACME-001');
    expect(screen.getByLabelText('Phone number')).toHaveValue('+90 555 123 45 67');
    expect(screen.getByLabelText('Address')).toHaveValue('Istanbul');
  });
});
