import { renderWithAppProviders, RouterLocationProbe } from '@/shared/test';
import type { Currency } from '@collectify/contracts';
import { Route, Routes } from 'react-router';

import { CustomerDetailsPage } from '../CustomerDetailsPage';
import { CustomerDirectoryQueryProbe } from './CustomerDirectoryQueryProbe';

export function renderCustomerRoutes(
  initialEntries: string[] = ['/customers'],
  { defaultCurrency = 'USD' }: { defaultCurrency?: Currency } = {},
) {
  return renderWithAppProviders(
    <>
      <Routes>
        <Route
          element={
            <div data-testid="customers-directory-route">
              <CustomerDirectoryQueryProbe />
            </div>
          }
          path="/customers"
        />
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
