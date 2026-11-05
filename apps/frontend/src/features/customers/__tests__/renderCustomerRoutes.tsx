import { Route, Routes } from 'react-router';

import type { Currency } from '@collectify/contracts';

import { renderWithAppProviders } from '../../../shared/test/render';
import { CustomerDetailsPage } from '../CustomerDetailsPage';
import { CustomersPage } from '../CustomersPage';
import { RouterLocationProbe } from './RouterLocationProbe';

export function renderCustomerRoutes(
  initialEntries: string[] = ['/customers'],
  { defaultCurrency = 'USD' }: { defaultCurrency?: Currency } = {},
) {
  return renderWithAppProviders(
    <>
      <Routes>
        <Route element={<CustomersPage />} path="/customers" />
        <Route
          element={<CustomerDetailsPage defaultCurrency={defaultCurrency} />}
          path="/customers/:customerId"
        />
      </Routes>
      <RouterLocationProbe />
    </>,
    { initialEntries },
  );
}
