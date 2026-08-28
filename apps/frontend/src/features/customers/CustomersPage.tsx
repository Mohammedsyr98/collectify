import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CustomerCreateModal } from './CustomerCreateModal';
import { useCreateCustomerMutation } from './customerQueries';

export function CustomersPage() {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { createCustomer, isCreating } = useCreateCustomerMutation({
    onCreated: () => setIsCreateModalOpen(false),
  });

  return (
    <main
      aria-label={t('app.workspace.navigation.customers')}
      className="min-h-screen flex-1 bg-background p-6 text-foreground"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="m-0 text-[1.65rem] font-black leading-tight tracking-normal">
              {t('customers.page.title')}
            </h1>
            <p className="m-0 text-[0.86rem] text-muted-foreground">
              {t('customers.page.empty')}
            </p>
          </div>
          <button
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[5px] border-0 bg-primary px-4 text-[0.8rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={16} strokeWidth={2.6} />
            {t('customers.actions.create')}
          </button>
        </header>
      </div>

      {isCreateModalOpen ? (
        <CustomerCreateModal
          isSubmitting={isCreating}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={createCustomer}
        />
      ) : null}
    </main>
  );
}
