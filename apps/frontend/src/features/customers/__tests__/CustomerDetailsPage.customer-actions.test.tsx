import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '../../../shared/api/http';
import { server } from '../../../shared/test/server';
import { emptyDebtList } from '../../debts/__tests__/debtTestData';
import {
  baseCustomer,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const customerWithAddress = {
  ...baseCustomer,
  address: 'Istanbul',
};

describe('CustomerDetailsPage customer actions', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(emptyCustomerList),
      ),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('opens a prefilled edit form from loaded details', async () => {
    const user = userEvent.setup();
    let detailsRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, ({ params }) => {
        detailsRequestCount += 1;

        if (params.customerId !== customerWithAddress.id) {
          return HttpResponse.json(
            {
              code: 'CUSTOMER_NOT_FOUND',
              message: 'Customer was not found.',
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(customerWithAddress);
      }),
    );

    renderCustomerRoutes([`/customers/${customerWithAddress.id}`]);

    expect(
      await screen.findByRole('heading', { name: 'Acme Market' }),
    ).toBeInTheDocument();
    expect(detailsRequestCount).toBe(1);

    const editButton = screen.getByRole('button', { name: 'Edit customer' });
    await user.click(editButton);

    expect(detailsRequestCount).toBe(1);
    expect(screen.getByRole('heading', { name: 'Edit customer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Acme Market');
    expect(screen.getByLabelText('Code')).toHaveValue('ACME-001');
    expect(screen.getByLabelText('Phone number')).toHaveValue('+90 555 123 45 67');
    expect(screen.getByLabelText('Address')).toHaveValue('Istanbul');

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Edit customer' }),
      ).not.toBeInTheDocument(),
    );
    expect(editButton).toHaveFocus();
  });
});
