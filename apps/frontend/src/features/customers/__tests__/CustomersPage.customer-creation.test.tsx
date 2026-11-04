import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { server } from '../../../shared/test/server';
import {
  baseCustomer,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

describe('CustomersPage customer creation', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(emptyCustomerList)),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('creates a customer, shows a success toast, and navigates to durable details', async () => {
    server.use(
      http.post(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(baseCustomer, { status: 201 }),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        if (params.customerId !== baseCustomer.id) {
          return HttpResponse.json(
            {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Customer was not found.',
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(baseCustomer);
      }),
    );

    renderCustomerRoutes();

    fireEvent.click(await screen.findByRole('button', { name: 'Create customer' }));
    fillCreateCustomerForm({
      code: 'ACME-001',
      name: 'Acme Market',
      phoneNumber: '+90 555 123 45 67',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(await screen.findByRole('status', { name: 'Customer created' })).toHaveTextContent(
      'Acme Market is ready for debt tracking.',
    );
    expect(await screen.findByRole('heading', { name: 'Acme Market' })).toBeInTheDocument();
    expect(screen.getByText('Code: ACME-001')).toBeInTheDocument();
  });

  it('shows a duplicate-code create error toast and keeps the create modal open', async () => {
    server.use(
      http.post(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(
          {
            code: 'CUSTOMER_CODE_ALREADY_EXISTS',
            message: 'A customer with this code already exists.',
            fieldErrors: {
              code: ['A customer with this code already exists.'],
            },
          },
          { status: 409 },
        ),
      ),
    );

    renderCustomerRoutes();

    fireEvent.click(await screen.findByRole('button', { name: 'Create customer' }));
    fillCreateCustomerForm({
      code: 'ACME-001',
      name: 'Acme Market',
      phoneNumber: '+90 555 123 45 67',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(
      await screen.findByRole('alert', { name: 'Could not create customer' }),
    ).toHaveTextContent('A customer with this code already exists.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Market');
  });
});

function fillCreateCustomerForm({
  address,
  code,
  name,
  phoneNumber,
}: {
  address?: string;
  code: string;
  name: string;
  phoneNumber: string;
}) {
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText('Code'), {
    target: { value: code },
  });
  fireEvent.change(screen.getByLabelText('Phone number'), {
    target: { value: phoneNumber },
  });

  if (address !== undefined) {
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: address },
    });
  }
}
