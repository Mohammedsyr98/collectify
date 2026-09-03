import { Route, Routes } from 'react-router';

import { renderWithAppProviders } from '../../../shared/test/render';
import { CustomerDetailsPage } from '../CustomerDetailsPage';
import { CustomersPage } from '../CustomersPage';
import { RouterLocationProbe } from './RouterLocationProbe';

export function renderCustomerRoutes(initialEntries: string[] = ['/customers']) {
  return renderWithAppProviders(
    <>
      <Routes>
        <Route element={<CustomersPage />} path="/customers" />
        <Route element={<CustomerDetailsPage />} path="/customers/:customerId" />
      </Routes>
      <RouterLocationProbe />
    </>,
    { initialEntries },
  );
}
