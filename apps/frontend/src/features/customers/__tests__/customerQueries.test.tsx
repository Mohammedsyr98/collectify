import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  CustomerDetailsResponse,
  UpdateCustomerRequest,
} from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { renderWithAppProviders } from '../../../shared/test/render';
import { server } from '../../../shared/test/server';
import {
  useCustomerDetailsQuery,
  useUpdateCustomerMutation,
} from '../customerQueries';
import { baseCustomer, resetCustomerTestEnvironment } from './customerTestData';

describe('customer queries', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
  });

  afterEach(() => {
    cleanup();
  });

  it('updates a customer and refreshes active customer details', async () => {
    const user = userEvent.setup();
    const patchBodies: unknown[] = [];
    let customer: CustomerDetailsResponse = {
      ...baseCustomer,
      address: 'Main Street 42',
    };

    server.use(
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

        return HttpResponse.json(customer);
      }),
      http.patch(`${getBackendUrl()}/customers/:customerId`, async ({ params, request }) => {
        if (params.customerId !== baseCustomer.id) {
          return HttpResponse.json(
            {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Customer was not found.',
            },
            { status: 404 },
          );
        }

        const body = (await request.json()) as UpdateCustomerRequest;
        patchBodies.push(body);
        customer = {
          ...customer,
          ...body,
          updatedAt: '2026-08-28T13:00:00.000Z',
        };

        return HttpResponse.json(customer);
      }),
    );

    renderWithAppProviders(<CustomerUpdateHarness customerId={baseCustomer.id} />);

    expect(await screen.findByText('Acme Market')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update customer' }));

    await waitFor(() =>
      expect(patchBodies).toEqual([
        {
          name: 'Acme Wholesale',
        },
      ]),
    );
    expect(await screen.findByText('Acme Wholesale')).toBeInTheDocument();
    expect(
      await screen.findByRole('status', { name: 'Customer updated' }),
    ).toHaveTextContent('Acme Wholesale changes were saved.');
  });
});

function CustomerUpdateHarness({ customerId }: { customerId: string }) {
  const customerQuery = useCustomerDetailsQuery(customerId);
  const { isUpdating, updateCustomer } = useUpdateCustomerMutation();

  return (
    <div>
      <p>{customerQuery.data?.name ?? 'Loading customer'}</p>
      <button
        disabled={isUpdating}
        onClick={() => {
          void updateCustomer({
            customerId,
            request: {
              name: 'Acme Wholesale',
            },
          });
        }}
        type="button"
      >
        Update customer
      </button>
    </div>
  );
}
