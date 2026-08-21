import { useTranslation } from 'react-i18next';

import { AuthEntryPage } from './features/auth/AuthEntryPage';
import { useAppSessionState } from './features/auth/session/useAppSessionState';
import { OwnerWorkspaceSidebar } from './features/owner-workspace/OwnerWorkspaceSidebar';
import { ErrorStatePage } from './shared/ui/error/ErrorStatePage';
import { LoadingScreen } from './shared/ui/loading/LoadingScreen';

function App() {
  const { t } = useTranslation();
  const appSession = useAppSessionState();

  if (appSession.status === 'loading') {
    return <LoadingScreen ariaLabel={t('app.loading.ariaLabel')} />;
  }

  if (appSession.status === 'sessionUnavailable') {
    return (
      <ErrorStatePage
        actionLabel={t('app.error.retry')}
        detail={t('app.error.sessionUnavailable.detail')}
        isActionPending={appSession.isRetrying}
        onAction={appSession.retry}
        title={t('app.error.sessionUnavailable.title')}
      />
    );
  }

  if (appSession.status === 'ownerWorkspace') {
    return (
      <div className="flex min-h-screen bg-background">
        <OwnerWorkspaceSidebar session={appSession.session} />
        <main
          aria-label={t('app.workspace.navigation.panel')}
          className="min-h-screen flex-1 bg-background"
        />
      </div>
    );
  }

  if (appSession.status === 'ownerSetupIncomplete') {
    return (
      <OwnerSetupNoticePage
        detail={t('app.status.ownerSetupIncomplete.detail')}
        title={t('app.status.ownerSetupIncomplete.title')}
      />
    );
  }

  return <AuthEntryPage />;
}

function OwnerSetupNoticePage({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <main className="flex min-h-screen items-center bg-background p-7">
      <section
        className="mx-auto grid w-full max-w-[460px] gap-3.5 rounded-md border border-border bg-card p-7 shadow-[var(--shadow-sm)]"
        aria-labelledby="owner-setup-notice-title"
      >
        <p className="m-0 text-[0.76rem] font-[850] tracking-normal text-primary">Collectify</p>
        <h1 className="m-0 text-[1.6rem] leading-[1.15] tracking-normal" id="owner-setup-notice-title">
          {title}
        </h1>
        <p className="m-0 text-muted-foreground">{detail}</p>
        <span
          className="h-2.5 w-2.5 rounded-full bg-status-due-border"
          aria-hidden="true"
        />
      </section>
    </main>
  );
}

export default App;
