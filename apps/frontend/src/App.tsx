import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AuthEntryPage } from './features/auth/AuthEntryPage';
import { useAppSessionState } from './features/auth/session/useAppSessionState';
import { useOwnerSignOut } from './features/auth/sign-out/useOwnerSignOut';
import {
  isSupportedLocale,
  type SupportedLocale,
} from './shared/localization';
import { ErrorStatePage } from './shared/ui/error/ErrorStatePage';
import { LoadingScreen } from './shared/ui/loading/LoadingScreen';

const localeNameTranslationKeys = {
  en: 'locale.english',
  tr: 'locale.turkish',
} satisfies Record<SupportedLocale, string>;

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
    const { session } = appSession;

    return (
      <OwnerWorkspacePreview
        defaultCurrency={session.ownerProfile.defaultCurrency}
        email={session.user.email}
        name={session.user.name}
        preferredLanguage={session.ownerProfile.preferredLanguage}
      />
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

function OwnerWorkspacePreview({
  defaultCurrency,
  email,
  name,
  preferredLanguage,
}: {
  defaultCurrency: string;
  email: string;
  name: string | null;
  preferredLanguage: string;
}) {
  const { t } = useTranslation();
  const { isSigningOut, signOut } = useOwnerSignOut();
  const preferredLanguageLabel = isSupportedLocale(preferredLanguage)
    ? t(localeNameTranslationKeys[preferredLanguage])
    : preferredLanguage;

  return (
    <main className="flex min-h-screen items-center bg-background p-7">
      <section
        className="mx-auto grid w-full max-w-[460px] gap-3.5 rounded-md border border-border bg-card p-7 shadow-[var(--shadow-sm)]"
        aria-labelledby="app-title"
      >
        <p className="m-0 text-[0.76rem] font-[850] tracking-normal text-primary">Collectify</p>
        <h1 className="m-0 text-[1.6rem] leading-[1.15] tracking-normal" id="app-title">
          {t('app.workspace.title')}
        </h1>
        <p className="m-0 text-muted-foreground">{t('app.workspace.subtitle')}</p>

        <dl className="mt-1 grid gap-3">
          {name ? (
            <div className="grid gap-[3px] border-t border-border pt-3">
              <dt className="text-[0.72rem] font-extrabold tracking-normal text-muted-foreground">
                {t('app.workspace.nameLabel')}
              </dt>
              <dd className="m-0 break-words">{name}</dd>
            </div>
          ) : null}
          <div className="grid gap-[3px] border-t border-border pt-3">
            <dt className="text-[0.72rem] font-extrabold tracking-normal text-muted-foreground">
              {t('app.workspace.emailLabel')}
            </dt>
            <dd className="m-0 break-words" dir="ltr">{email}</dd>
          </div>
          <div className="grid gap-[3px] border-t border-border pt-3">
            <dt className="text-[0.72rem] font-extrabold tracking-normal text-muted-foreground">
              {t('app.workspace.languageLabel')}
            </dt>
            <dd className="m-0 break-words">{preferredLanguageLabel}</dd>
          </div>
          <div className="grid gap-[3px] border-t border-border pt-3">
            <dt className="text-[0.72rem] font-extrabold tracking-normal text-muted-foreground">
              {t('app.workspace.currencyLabel')}
            </dt>
            <dd className="m-0 break-words">{defaultCurrency}</dd>
          </div>
        </dl>
        <button
          className="mt-1 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
          disabled={isSigningOut}
          onClick={signOut}
          type="button"
        >
          <LogOut aria-hidden="true" size={16} strokeWidth={2.5} />
          {isSigningOut
            ? t('app.workspace.signingOut')
            : t('app.workspace.signOut')}
        </button>
      </section>
    </main>
  );
}

export default App;
