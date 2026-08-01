import { AuthEntryPage } from './features/auth/AuthEntryPage';
import { useSessionQuery } from './features/auth/session/sessionQueries';

const statusDotClassName = {
  error: 'bg-status-overdue-border',
  loading: 'bg-status-due-border',
  warning: 'bg-status-due-border',
};

function App() {
  const sessionQuery = useSessionQuery();

  if (sessionQuery.isPending) {
    return (
      <StatusPage
        detail="Looking for an active owner session."
        tone="loading"
        title="Checking session"
      />
    );
  }

  if (sessionQuery.isError) {
    return (
      <StatusPage
        detail={
          sessionQuery.error instanceof Error
            ? sessionQuery.error.message
            : 'Unable to reach backend.'
        }
        tone="error"
        title="Session unavailable"
      />
    );
  }

  const session = sessionQuery.data;

  if (session.authenticated && session.ownerProfile) {
    return (
      <OwnerWorkspacePreview
        defaultCurrency={session.ownerProfile.defaultCurrency}
        email={session.user.email}
        preferredLanguage={session.ownerProfile.preferredLanguage}
      />
    );
  }

  if (session.authenticated && !session.ownerProfile) {
    return (
      <StatusPage
        detail="Complete owner setup before entering the workspace."
        tone="warning"
        title="Owner setup incomplete"
      />
    );
  }

  return <AuthEntryPage />;
}

function StatusPage({
  detail,
  title,
  tone,
}: {
  detail: string;
  title: string;
  tone: 'error' | 'loading' | 'warning';
}) {
  return (
    <main className="flex min-h-screen items-center bg-background p-7">
      <section
        className="mx-auto grid w-full max-w-[460px] gap-3.5 rounded-md border border-border bg-card p-7 shadow-[var(--shadow-sm)]"
        aria-labelledby="app-title"
      >
        <p className="m-0 text-[0.76rem] font-[850] tracking-normal text-primary">Collectify</p>
        <h1 className="m-0 text-[1.6rem] leading-[1.15] tracking-normal" id="app-title">
          {title}
        </h1>
        <p className="m-0 text-muted-foreground">{detail}</p>
        <span
          className={`h-2.5 w-2.5 rounded-full ${statusDotClassName[tone]}`}
          aria-hidden="true"
        />
      </section>
    </main>
  );
}

function OwnerWorkspacePreview({
  defaultCurrency,
  email,
  preferredLanguage,
}: {
  defaultCurrency: string;
  email: string;
  preferredLanguage: string;
}) {
  return (
    <main className="flex min-h-screen items-center bg-background p-7">
      <section
        className="mx-auto grid w-full max-w-[460px] gap-3.5 rounded-md border border-border bg-card p-7 shadow-[var(--shadow-sm)]"
        aria-labelledby="app-title"
      >
        <p className="m-0 text-[0.76rem] font-[850] tracking-normal text-primary">Collectify</p>
        <h1 className="m-0 text-[1.6rem] leading-[1.15] tracking-normal" id="app-title">
          Owner session active
        </h1>
        <p className="m-0 text-muted-foreground">Protected Collectify workspace</p>

        <dl className="mt-1 grid gap-3">
          <div className="grid gap-[3px] border-t border-border pt-3">
            <dt className="text-[0.72rem] font-extrabold tracking-normal text-muted-foreground">
              Email
            </dt>
            <dd className="m-0 break-words">{email}</dd>
          </div>
          <div className="grid gap-[3px] border-t border-border pt-3">
            <dt className="text-[0.72rem] font-extrabold tracking-normal text-muted-foreground">
              Language
            </dt>
            <dd className="m-0 break-words">{preferredLanguage}</dd>
          </div>
          <div className="grid gap-[3px] border-t border-border pt-3">
            <dt className="text-[0.72rem] font-extrabold tracking-normal text-muted-foreground">
              Currency
            </dt>
            <dd className="m-0 break-words">{defaultCurrency}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

export default App;
