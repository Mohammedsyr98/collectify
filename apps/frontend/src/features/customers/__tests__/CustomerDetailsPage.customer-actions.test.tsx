import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
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

  it('opens the customer editor from loaded details and restores focus', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    expect(
      await screen.findByRole('heading', { name: baseCustomer.name }),
    ).toBeInTheDocument();

    const editButton = screen.getByRole('button', { name: 'Edit customer' });
    await user.click(editButton);

    expect(
      await screen.findByRole('dialog', { name: 'Edit customer' }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Edit customer' }),
      ).not.toBeInTheDocument(),
    );
    expect(editButton).toHaveFocus();
  });

  it('saves an edited customer and updates the details page', async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(baseCustomer),
      ),
      http.patch(`${getBackendUrl()}/customers/:customerId`, async ({ request }) => {
        const requestBody = (await request.json()) as { name?: string };

        return HttpResponse.json({
          ...baseCustomer,
          name: requestBody.name ?? baseCustomer.name,
          updatedAt: '2026-08-28T13:00:00.000Z',
        });
      }),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    expect(
      await screen.findByRole('heading', { name: baseCustomer.name }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit customer' }));
    const editDialog = await screen.findByRole('dialog', { name: 'Edit customer' });
    const nameInput = within(editDialog).getByLabelText('Name');

    await user.clear(nameInput);
    await user.type(nameInput, 'Acme Wholesale');
    await user.click(within(editDialog).getByRole('button', { name: 'Save customer' }));

    expect(
      await screen.findByRole('heading', { name: 'Acme Wholesale' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('status', { name: 'Customer updated' }),
    ).toHaveTextContent('Acme Wholesale changes were saved.');
    expect(screen.queryByRole('dialog', { name: 'Edit customer' })).not.toBeInTheDocument();
  });
});
