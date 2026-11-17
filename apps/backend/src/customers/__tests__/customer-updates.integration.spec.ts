import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createIntegrationDatabase,
  startIntegrationBackend,
} from '../../test-support/integration-test-support';
import { createOwnerAuthClient } from '../../test-support/owner-auth-client';
import {
  createCustomerTestHelpers,
  type CustomerTestContext,
} from './customer-integration-test-support';


import { customerDetailsResponseSchema } from '@collectify/contracts';

describe('customer update routes', () => {
  let context: CustomerTestContext | undefined;
  let backend: CustomerTestContext['backend'] | undefined;

  const { signUpOwner, updateCustomer, insertCustomer } =
    createCustomerTestHelpers(() => context!);

  beforeAll(async () => {
    const database = createIntegrationDatabase();
    backend = await startIntegrationBackend();
    context = {
      database,
      backend,
      ownerAuth: createOwnerAuthClient(backend.baseUrl),
    };
  });

  beforeEach(async () => {
    await context!.database.reset();
  });

  afterAll(async () => {
    await backend?.app.close();
  });

  it('updates only the submitted customer fields', async () => {
    const owner = await signUpOwner('owner@example.com');
    const customerId = 'customer_partial_update';

    await insertCustomer({
      ownerProfileId: owner.ownerProfileId,
      id: customerId,
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: 'Main Street 42',
      createdAt: '2026-08-29 11:00:00',
    });

    const response = await updateCustomer(owner.cookieHeader, customerId, {
      name: 'Acme Wholesale',
    });

    expect(response.status).toBe(200);
    const updated = customerDetailsResponseSchema.parse(await response.json());
    expect(updated).toMatchObject({
      id: customerId,
      name: 'Acme Wholesale',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: 'Main Street 42',
    });
  });

  it('clears customer address when address is submitted blank', async () => {
    const owner = await signUpOwner('owner@example.com');
    const customerId = 'customer_clear_address';

    await insertCustomer({
      ownerProfileId: owner.ownerProfileId,
      id: customerId,
      name: 'Acme Market',
      code: 'ACME-001',
      phoneNumber: '+90 555 123 45 67',
      address: 'Main Street 42',
      createdAt: '2026-08-29 11:00:00',
    });

    const clearAddressResponse = await updateCustomer(
      owner.cookieHeader,
      customerId,
      {
        address: '   ',
      },
    );

    expect(clearAddressResponse.status).toBe(200);
    const clearedAddress = customerDetailsResponseSchema.parse(
      await clearAddressResponse.json(),
    );
    expect(clearedAddress).toMatchObject({
      id: customerId,
      address: null,
    });
  });

  it('rejects invalid customer update input with field errors', async () => {
    const owner = await signUpOwner('owner@example.com');

    const response = await updateCustomer(owner.cookieHeader, 'customer_123', {
      name: '   ',
      code: '',
      phoneNumber: '  ',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Check the highlighted fields.',
      fieldErrors: {
        name: ['Customer name is required.'],
        code: ['Customer code is required.'],
        phoneNumber: ['Phone number is required.'],
      },
    });
  });

  it("allows another owner's customer code on update but rejects a same-owner duplicate", async () => {
    const firstOwner = await signUpOwner('first-owner@example.com');
    const secondOwner = await signUpOwner('second-owner@example.com');

    await insertCustomer({
      ownerProfileId: secondOwner.ownerProfileId,
      id: 'customer_other_owner_acme',
      name: 'Other Acme',
      code: 'ACME',
      phoneNumber: '+90 555 111 11 11',
      createdAt: '2026-08-29 11:00:00',
    });
    await insertCustomer({
      ownerProfileId: firstOwner.ownerProfileId,
      id: 'customer_cross_owner_update',
      name: 'Harbor Supplies',
      code: 'HARBOR',
      phoneNumber: '+90 555 222 22 22',
      createdAt: '2026-08-29 12:00:00',
    });

    const crossOwnerResponse = await updateCustomer(
      firstOwner.cookieHeader,
      'customer_cross_owner_update',
      {
        code: 'ACME',
      },
    );

    expect(crossOwnerResponse.status).toBe(200);
    expect(
      customerDetailsResponseSchema.parse(await crossOwnerResponse.json()),
    ).toMatchObject({
      id: 'customer_cross_owner_update',
      code: 'ACME',
    });

    await insertCustomer({
      ownerProfileId: firstOwner.ownerProfileId,
      id: 'customer_same_owner_update',
      name: 'Dock Market',
      code: 'DOCK',
      phoneNumber: '+90 555 333 33 33',
      createdAt: '2026-08-29 13:00:00',
    });

    const duplicateResponse = await updateCustomer(
      firstOwner.cookieHeader,
      'customer_same_owner_update',
      {
        code: 'ACME',
      },
    );

    expect(duplicateResponse.status).toBe(409);
    await expect(duplicateResponse.json()).resolves.toEqual({
      code: 'CUSTOMER_CODE_ALREADY_EXISTS',
      message: 'A customer with this code already exists.',
      fieldErrors: {
        code: ['A customer with this code already exists.'],
      },
    });
  });
});
