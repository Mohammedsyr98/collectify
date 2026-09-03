import '@testing-library/jest-dom/vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderWithAppProviders } from '../../../shared/test/render';
import { CustomerActionsCell } from '../list/CustomerActionsCell';
import { resetCustomerTestEnvironment } from './customerTestData';
import { RouterLocationProbe } from './RouterLocationProbe';

describe('CustomerActionsCell', () => {
  beforeEach(() => {
    resetCustomerTestEnvironment();
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
        name: 'Open actions for North Star Cafe',
      }),
    );

    const actionsMenu = await screen.findByRole('menu', {
      name: 'Actions for North Star Cafe',
    });
    await user.click(
      within(actionsMenu).getByRole('menuitem', { name: 'Open details' }),
    );

    expect(screen.getByTestId('router-location')).toHaveTextContent(
      '/customers/customer_456',
    );
  });
});
