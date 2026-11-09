import '@testing-library/jest-dom/vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { customerApiErrorCode } from '@collectify/contracts';

import { customerResources } from '@/features/customers';
import { getBackendUrl } from '@/shared/api';
import { server } from '@/shared/test';

import { customerDirectoryResources } from '../localization/resources';
import {
  baseCustomer,
  emptyDebtList,
  emptyCustomerList,
  resetCustomerDirectoryTestEnvironment,
} from './customerDirectoryTestData';
import { renderCustomerRoutes } from './renderCustomerRoutes';

const customerMessages = customerResources.en.common.customers;
const customerDirectoryMessages = customerDirectoryResources.en.common.customerDirectory;
const customerCreateSuccessDescription = (name: string) =>
  customerMessages.toast.create.successDescription.replace('{{name}}', name);

describe('CustomersPage customer creation', () => {
  beforeEach(() => {
    resetCustomerDirectoryTestEnvironment();
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

  it('creates a customer, shows a success toast, and navigates to its details route', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${getBackendUrl()}/customers`, () =>
        HttpResponse.json(baseCustomer, { status: 201 }),
      ),
    );

    renderCustomerRoutes();

    await user.click(
      await screen.findByRole('button', { name: customerDirectoryMessages.actions.create }),
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
    expect(screen.getByTestId('router-location')).toHaveTextContent(
      `/customers/${baseCustomer.id}`,
    );
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
      await screen.findByRole('button', { name: customerDirectoryMessages.actions.create }),
    );
    await fillCreateCustomerForm(user, {
      code: 'ACME-001',
      name: 'Acme Market',
      phoneNumber: '+90 555 123 45 67',
    });
    await user.click(screen.getByRole('button', { name: customerMessages.actions.save }));

    expect(
      await screen.findByRole('alert', { name: customerMessages.toast.create.errorTitle }),
    ).toHaveTextContent(customerMessages.errors[customerApiErrorCode.customerCodeAlreadyExists]);
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
