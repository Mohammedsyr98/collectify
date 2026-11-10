import '@testing-library/jest-dom/vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getBackendUrl } from '@/shared/api';
import { server } from '@/shared/test';
import { emptyDebtList } from './debtTestData';
import { customerMessages, debtMessages } from './customerDetailsTestMessages';
import {
  baseCustomer,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerDetailsTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const customerWithAddress = {
  ...baseCustomer,
  address: 'Istanbul',
};

describe('CustomerDetailsPage view and lifecycle', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
    server.use(
      http.get(`${getBackendUrl()}/customers`, () => HttpResponse.json(emptyCustomerList)),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () =>
        HttpResponse.json(emptyDebtList),
      ),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('fetches and renders durable customer details from the route id', async () => {
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

    expect(await screen.findByRole('heading', { name: 'Acme Market' })).toBeInTheDocument();
    expect(screen.getByText(`${customerMessages.details.code}: ACME-001`)).toBeInTheDocument();
    expect(screen.getByText('+90 555 123 45 67')).toBeInTheDocument();
    expect(screen.getByText('Istanbul')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: customerMessages.details.financialSummary }),
    ).toHaveTextContent(customerMessages.details.noFinancialActivity);
    expect(screen.getByRole('region', { name: debtMessages.section.title })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: customerMessages.details.payments }),
    ).toHaveTextContent(customerMessages.details.paymentsUnavailable);
    await waitFor(() => expect(detailsRequestCount).toBe(1));
  });

  it('starts loading debts only after customer details resolve', async () => {
    let resolveCustomer!: () => void;
    const customerRequest = new Promise<void>((resolve) => {
      resolveCustomer = resolve;
    });
    let debtRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, async () => {
        await customerRequest;
        return HttpResponse.json(baseCustomer);
      }),
      http.get(`${getBackendUrl()}/customers/:customerId/debts`, () => {
        debtRequestCount += 1;
        return HttpResponse.json(emptyDebtList);
      }),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    await waitFor(() => expect(debtRequestCount).toBe(0));
    resolveCustomer();

    expect(await screen.findByRole('heading', { name: baseCustomer.name })).toBeInTheDocument();
    await waitFor(() => expect(debtRequestCount).toBe(1));
  });

  it('retries a failed customer-details request from the page error state', async () => {
    const user = userEvent.setup();
    let detailsRequestCount = 0;

    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () => {
        detailsRequestCount += 1;

        if (detailsRequestCount === 1) {
          return HttpResponse.json({ message: 'Unexpected server error.' }, { status: 500 });
        }

        return HttpResponse.json(baseCustomer);
      }),
    );

    renderCustomerRoutes([`/customers/${baseCustomer.id}`]);

    const retryButton = await waitFor(() => within(screen.getByRole('main')).getByRole('button'));
    expect(detailsRequestCount).toBe(1);
    await user.click(retryButton);

    expect(await screen.findByRole('heading', { name: baseCustomer.name })).toBeInTheDocument();
    await waitFor(() => expect(detailsRequestCount).toBe(2));
  });

  it('renders a customer-specific not-found state and routes back to customers', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${getBackendUrl()}/customers/:customerId`, () =>
        HttpResponse.json(
          {
            code: 'CUSTOMER_NOT_FOUND',
            message: 'Customer was not found.',
          },
          { status: 404 },
        ),
      ),
    );

    renderCustomerRoutes(['/customers/missing']);

    expect(
      await screen.findByRole('heading', { name: customerMessages.notFound.title }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: customerMessages.notFound.action }));
    expect(await screen.findByTestId('customers-directory-route')).toBeInTheDocument();
  });
});
