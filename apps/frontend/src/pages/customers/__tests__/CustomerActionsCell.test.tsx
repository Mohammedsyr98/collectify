import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithAppProviders, RouterLocationProbe } from './render';

import { CustomerActionsCell } from '../list/CustomerActionsCell';
import { customerDirectoryResources } from '../localization/resources';
import { resetCustomerDirectoryTestEnvironment } from './customerDirectoryTestData';

const customerMessages = customerDirectoryResources.en.common.customerDirectory;
const customerName = 'North Star Cafe';
const openActionsLabel = customerMessages.list.actions.openMenu.replace(
  '{{name}}',
  customerName,
);
const actionsMenuLabel = customerMessages.list.actions.menuLabel.replace(
  '{{name}}',
  customerName,
);

describe('CustomerActionsCell', () => {
  beforeEach(() => {
    resetCustomerDirectoryTestEnvironment();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens the actions menu and navigates to the customer details route', async () => {
    const user = userEvent.setup();
    renderWithAppProviders(
      <Routes>
        <Route
          element={
            <>
              <CustomerActionsCell
                customerId="customer_456"
                customerName="North Star Cafe"
                onEditCustomer={vi.fn()}
                onPrefetchEditCustomer={vi.fn()}
              />
              <RouterLocationProbe />
            </>
          }
          path="/customers"
        />
        <Route
          element={<RouterLocationProbe />}
          path="/customers/:customerId"
        />
      </Routes>,
      { initialEntries: ['/customers'] },
    );

    await user.click(
      screen.getByRole('button', {
        name: openActionsLabel,
      }),
    );

    const actionsMenu = await screen.findByRole('menu', {
      name: actionsMenuLabel,
    });
    await user.click(
      within(actionsMenu).getByRole('menuitem', {
        name: customerMessages.list.actions.openDetails,
      }),
    );

    expect(screen.getByTestId('router-location')).toHaveTextContent(
      '/customers/customer_456',
    );
  });

  it('offers an edit action for the selected customer', async () => {
    const user = userEvent.setup();
    const onEditCustomer = vi.fn();
    renderWithAppProviders(
      <Routes>
        <Route
          element={
            <CustomerActionsCell
              customerId="customer_456"
              customerName="North Star Cafe"
              onEditCustomer={onEditCustomer}
              onPrefetchEditCustomer={vi.fn()}
            />
          }
          path="/customers"
        />
      </Routes>,
      { initialEntries: ['/customers'] },
    );

    await user.click(
      screen.getByRole('button', {
        name: openActionsLabel,
      }),
    );

    const actionsMenu = await screen.findByRole('menu', {
      name: actionsMenuLabel,
    });
    await user.click(
      within(actionsMenu).getByRole('menuitem', {
        name: customerMessages.list.actions.edit,
      }),
    );

    expect(onEditCustomer).toHaveBeenCalledExactlyOnceWith(
      'customer_456',
      screen.getByRole('button', { name: openActionsLabel }),
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
