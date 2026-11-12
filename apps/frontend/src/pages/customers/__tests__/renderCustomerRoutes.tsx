import { Route, Routes } from 'react-router';

import { renderWithAppProviders, RouterLocationProbe } from './render';
import { CustomersPage } from '../CustomersPage';

export function renderCustomerRoutes(initialEntries: string[] = ['/customers']) {
  return renderWithAppProviders(
    <>
      <Routes>
        <Route element={<CustomersPage />} path="/customers" />
        <Route
          element={<div data-testid="customer-details-route" />}
          path="/customers/:customerId"
        />
      </Routes>
      <RouterLocationProbe />
    </>,
    { initialEntries },
  );
}
