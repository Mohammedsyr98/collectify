import { ArrowUpRight, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { AnchoredMenu } from '../../../shared/ui/anchored-menu/AnchoredMenu';

type CustomerActionsCellProps = {
  customerId: string;
  customerName: string;
  onEditCustomer: (
    customerId: string,
    returnFocusTarget: HTMLButtonElement | null,
  ) => void;
  onPrefetchEditCustomer: (customerId: string) => void;
};

export function CustomerActionsCell({
  customerId,
  customerName,
  onEditCustomer,
  onPrefetchEditCustomer,
}: CustomerActionsCellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <AnchoredMenu
      items={[
        {
          icon: <Pencil aria-hidden="true" size={15} strokeWidth={2.5} />,
          id: 'edit-customer',
          label: t('customers.list.actions.edit'),
          onSelect: (trigger) => onEditCustomer(customerId, trigger),
        },
        {
          icon: <ArrowUpRight aria-hidden="true" size={15} strokeWidth={2.5} />,
          id: 'open-details',
          label: t('customers.list.actions.openDetails'),
          onSelect: () => void navigate(`/customers/${customerId}`),
        },
      ]}
      menuLabel={t('customers.list.actions.menuLabel', {
        name: customerName,
      })}
      onOpen={() => onPrefetchEditCustomer(customerId)}
      triggerLabel={t('customers.list.actions.openMenu', {
        name: customerName,
      })}
    />
  );
}
