import { useCustomerListQuery } from '@/entities/customer';

export function CustomerDirectoryQueryProbe() {
  const query = useCustomerListQuery({ page: 1 });

  return (
    <table>
      <tbody>
        {query.data?.items.map((customer) => (
          <tr key={customer.id}>
            <td>{customer.name}</td>
            <td aria-label={`${customer.name} remaining balances`}>
              {customer.financialSummary.balancesByCurrency.map(({ currency, remainingAmount }) => (
                <span key={currency}>
                  {currency} {remainingAmount}
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
