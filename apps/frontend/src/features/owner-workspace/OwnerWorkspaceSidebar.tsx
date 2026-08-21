import { CreditCard, LayoutDashboard, LogOut, ReceiptText, Settings, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { SessionResponse } from '@collectify/contracts';

import { useOwnerSignOut } from '../auth/sign-out/useOwnerSignOut';

type AuthenticatedSession = Extract<SessionResponse, { authenticated: true }>;

export type OwnerWorkspaceSession = AuthenticatedSession & {
  ownerProfile: NonNullable<AuthenticatedSession['ownerProfile']>;
};

export function OwnerWorkspaceSidebar({ session }: { session: OwnerWorkspaceSession }) {
  const { t } = useTranslation();
  const { isSigningOut, signOut } = useOwnerSignOut();

  const ownerDisplayName = session.user.name ?? session.user.email;
  const signOutLabel = isSigningOut ? t('app.workspace.signingOut') : t('app.workspace.signOut');
  const navigationItems = [
    {
      Icon: LayoutDashboard,
      isCurrent: true,
      label: t('app.workspace.navigation.panel'),
    },
    {
      Icon: Users,
      label: t('app.workspace.navigation.customers'),
    },
    {
      Icon: ReceiptText,
      label: t('app.workspace.navigation.debts'),
    },
    {
      Icon: CreditCard,
      label: t('app.workspace.navigation.payments'),
    },
    {
      Icon: Settings,
      label: t('app.workspace.navigation.settings'),
    },
  ];

  return (
    <aside
      aria-label={t('app.workspace.sidebarLabel')}
      className="flex w-57.5 shrink-0 flex-col border-e border-border bg-card px-3 py-3"
    >
      <p className="m-0 text-[0.76rem] font-[850] tracking-normal text-primary">Collectify</p>

      <nav className="mt-7 grid gap-1" aria-label={t('app.workspace.navigationLabel')}>
        {navigationItems.map(({ Icon, isCurrent = false, label }) => (
          <button
            aria-current={isCurrent ? 'page' : undefined}
            aria-disabled={isCurrent ? undefined : true}
            className={workspaceNavigationButtonClassName(isCurrent)}
            key={label}
            type="button"
          >
            <Icon aria-hidden="true" className="shrink-0" size={15} strokeWidth={2.4} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-[5px] border border-border bg-background p-2">
        <p className="m-0 text-[0.62rem] font-bold tracking-normal text-muted-foreground">
          {t('app.workspace.userLabel')}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-primary text-[0.68rem] font-black text-primary-foreground"
            aria-hidden="true"
          >
            {session.user.name?.charAt(0) ?? session.user.email.charAt(0)}
          </div>
          <p
            className="m-0 min-w-0 max-w-full flex-1 truncate text-[0.72rem] font-extrabold leading-tight"
            title={ownerDisplayName}
          >
            {ownerDisplayName}
          </p>
          <button
            aria-label={signOutLabel}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground transition duration-150 hover:bg-muted hover:text-foreground disabled:opacity-70"
            disabled={isSigningOut}
            onClick={signOut}
            type="button"
          >
            <LogOut aria-hidden="true" size={14} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function workspaceNavigationButtonClassName(isCurrent: boolean) {
  return [
    'inline-flex min-h-10 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-[5px] border-0 px-3 text-start text-[0.72rem] font-extrabold tracking-normal transition duration-150',
    isCurrent
      ? 'bg-primary text-primary-foreground'
      : 'bg-transparent text-muted-foreground',
  ].join(' ');
}
