import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createCustomerRequestSchema,
  type CustomerDetailsResponse,
} from '@collectify/contracts';

import { getBackendUrl } from '../../shared/api/http';
import { renderWithAppProviders } from '../../shared/test/render';
import { server } from '../../shared/test/server';
import { CustomerDetailsPage } from './CustomerDetailsPage';
import { CustomersPage } from './CustomersPage';

const baseCustomer: CustomerDetailsResponse = {
  id: 'customer_123',
  name: 'Acme Market',
  code: 'ACME-001',
  phoneNumber: '+90 555 123 45 67',
  address: null,
  createdAt: '2026-08-28T12:00:00.000Z',
  updatedAt: '2026-08-28T12:00:00.000Z',
  financialSummary: {
    totalDebtAmount: '0.00',
    totalPaidAmount: '0.00',
    balanceAmount: '0.00',
  },
};

function renderCustomerRoutes(initialEntries: string[] = ['/customers']) {
  return renderWithAppProviders(
    <Routes>
      <Route element={<CustomersPage />} path="/customers" />
      <Route element={<CustomerDetailsPage />} path="/customers/:customerId" />
    </Routes>,
    { initialEntries },
  );
}

function setBrowserLanguages(languages: readonly string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
}

describe('CustomersPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.removeAttribute('dir');
    setBrowserLanguages(['en-US']);
  });

  afterEach(() => {
    cleanup();
  });

  it('closes the create modal without posting and clears draft values', async () => {
    const user = userEvent.setup();
    let createRequestCount = 0;
    server.use(
      http.post(`${getBackendUrl()}/customers`, () => {
        createRequestCount += 1;

        return HttpResponse.json(baseCustomer, { status: 201 });
      }),
    );

    renderCustomerRoutes();

    await user.click(await screen.findByRole('button', { name: 'Create customer' }));
    await user.type(screen.getByLabelText('Name'), 'Draft Customer');
    await user.click(screen.getByRole('button', { name: 'Close customer form' }));

    await user.click(screen.getByRole('button', { name: 'Create customer' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
    await user.type(screen.getByLabelText('Name'), 'Draft Customer');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(screen.getByRole('button', { name: 'Create customer' }));
    expect(screen.getByLabelText('Name')).toHaveValue('');
    await user.type(screen.getByLabelText('Name'), 'Draft Customer');
    fireEvent.mouseDown(screen.getByRole('dialog'));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(createRequestCount).toBe(0);
  });

  it('creates a customer, shows a success toast, and navigates to durable details', async () => {
    const user = userEvent.setup();
    let capturedCreateBody: unknown;
    server.use(
      http.post(`${getBackendUrl()}/customers`, async ({ request }) => {
        capturedCreateBody = await request.json();
        const createRequestResult =
          createCustomerRequestSchema.safeParse(capturedCreateBody);

        if (!createRequestResult.success) {
          return HttpResponse.json(
            {
              code: 'VALIDATION_ERROR',
              message: 'Check the highlighted fields.',
            },
            { status: 400 },
          );
        }

        return HttpResponse.json(baseCustomer, { status: 201 });
      }),
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

    await user.click(await screen.findByRole('button', { name: 'Create customer' }));
    await user.type(screen.getByLabelText('Name'), '  Acme Market  ');
    await user.type(screen.getByLabelText('Code'), '  ACME-001  ');
    await user.type(
      screen.getByLabelText('Phone number'),
      '  +90 555 123 45 67  ',
    );
    await user.type(screen.getByLabelText('Address'), '   ');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(
      await screen.findByRole('status', { name: 'Customer created' }),
    ).toHaveTextContent('Acme Market is ready for debt tracking.');
    expect(
      await screen.findByRole('heading', { name: 'Acme Market' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Code: ACME-001')).toBeInTheDocument();
    expect(capturedCreateBody).toEqual({
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
    });
  });

  it('keeps entered values and shows the duplicate-code toast when creation fails', async () => {
    const user = userEvent.setup();
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

    await user.click(await screen.findByRole('button', { name: 'Create customer' }));
    await user.type(screen.getByLabelText('Name'), 'Acme Market');
    await user.type(screen.getByLabelText('Code'), 'ACME-001');
    await user.type(screen.getByLabelText('Phone number'), '+90 555 123 45 67');
    await user.click(screen.getByRole('button', { name: 'Save customer' }));

    expect(
      await screen.findByRole('alert', { name: 'Could not create customer' }),
    ).toHaveTextContent('A customer with this code already exists.');
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Market');
    expect(screen.getByLabelText('Code')).toHaveValue('ACME-001');
    expect(screen.getByLabelText('Phone number')).toHaveValue(
      '+90 555 123 45 67',
    );
  });
});
