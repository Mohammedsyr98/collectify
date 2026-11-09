import { Route, Routes } from 'react-router';

import type { Currency } from '@collectify/contracts';

import { CustomerDetailsPage } from '@/features/customers';

import { renderWithAppProviders, RouterLocationProbe } from '@/shared/test';
import { CustomersPage } from '../CustomersPage';

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
