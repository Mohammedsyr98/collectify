import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { customerApiErrorCode } from '@collectify/contracts';

import { getBackendUrl } from '../../../shared/api/http';
import { server } from '../../../shared/test/server';
import { emptyDebtList } from '../../debts/__tests__/debtTestData';
import { customerResources } from '../localization/resources';
import {
  baseCustomer,
  emptyCustomerList,
  resetCustomerTestEnvironment,
} from './customerTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const customerMessages = customerResources.en.common.customers;
const customerCreateSuccessDescription = (name: string) =>
  customerMessages.toast.create.successDescription.replace('{{name}}', name);

describe('CustomersPage customer creation', () => {
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

  it('creates a customer, shows a success toast, and navigates to durable details', async () => {
    const user = userEvent.setup();
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

    await user.click(
      await screen.findByRole('button', { name: customerMessages.actions.create }),
    );
    await fillCreateCustomerForm(user, {
      code: 'ACME-001',
      name: 'Acme Market',
      phoneNumber: '+90 555 123 45 67',
    });
    await user.click(screen.getByRole('button', { name: customerMessages.actions.save }));

    expect(
      await screen.findByRole('status', { name: customerMessages.toast.create.successTitle }),
    ).toHaveTextContent(customerCreateSuccessDescription('Acme Market'));
    expect(await screen.findByRole('heading', { name: 'Acme Market' })).toBeInTheDocument();
    expect(
      screen.getByText(`${customerMessages.details.code}: ACME-001`),
    ).toBeInTheDocument();
  });

  it('shows a duplicate-code create error toast and keeps the create modal open', async () => {
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

    await user.click(
      await screen.findByRole('button', { name: customerMessages.actions.create }),
    );
    await fillCreateCustomerForm(user, {
      code: 'ACME-001',
      name: 'Acme Market',
      phoneNumber: '+90 555 123 45 67',
    });
    await user.click(screen.getByRole('button', { name: customerMessages.actions.save }));

    expect(
      await screen.findByRole('alert', { name: customerMessages.toast.create.errorTitle }),
    ).toHaveTextContent(
      customerMessages.errors[customerApiErrorCode.customerCodeAlreadyExists],
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(customerMessages.form.nameLabel)).toHaveValue('Acme Market');
  });
});

async function fillCreateCustomerForm(
  user: ReturnType<typeof userEvent.setup>,
  {
    address,
    code,
    name,
    phoneNumber,
  }: {
    address?: string;
    code: string;
    name: string;
    phoneNumber: string;
  },
) {
  await user.clear(screen.getByLabelText(customerMessages.form.nameLabel));
  await user.type(screen.getByLabelText(customerMessages.form.nameLabel), name);
  await user.clear(screen.getByLabelText(customerMessages.form.codeLabel));
  await user.type(screen.getByLabelText(customerMessages.form.codeLabel), code);
  await user.clear(screen.getByLabelText(customerMessages.form.phoneNumberLabel));
  await user.type(screen.getByLabelText(customerMessages.form.phoneNumberLabel), phoneNumber);

  if (address !== undefined) {
    await user.clear(screen.getByLabelText(customerMessages.form.addressLabel));
    await user.type(screen.getByLabelText(customerMessages.form.addressLabel), address);
  }
}
