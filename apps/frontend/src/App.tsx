import { useQuery } from '@tanstack/react-query';

import { getBackendUrl, getSession } from './api';

function App() {
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: getSession,
  });

  if (sessionQuery.isPending) {
    return (
      <main className="app-shell">
        <section className="auth-panel" aria-labelledby="app-title">
          <div>
            <p className="eyebrow">Collectify</p>
            <h1 id="app-title">Checking session</h1>
            <p className="lede">Looking for an active owner session.</p>
          </div>
        </section>
      </main>
    );
  }

  if (sessionQuery.isError) {
    return (
      <main className="app-shell">
        <section className="auth-panel" aria-labelledby="app-title">
          <div>
            <p className="eyebrow">Collectify</p>
            <h1 id="app-title">Session unavailable</h1>
            <p className="lede">Unable to complete the owner session probe.</p>
          </div>

          <div className="auth-card" aria-live="polite">
            <div className="auth-card__header">
              <span className="status-dot is-error" />
              <span>Probe failed</span>
            </div>
            <p className="error-message">
              {sessionQuery.error instanceof Error
                ? sessionQuery.error.message
                : 'Unable to reach backend'}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const session = sessionQuery.data;

  if (session.authenticated) {
    return (
      <main className="app-shell">
        <section className="auth-panel" aria-labelledby="app-title">
          <div>
            <p className="eyebrow">Collectify</p>
            <h1 id="app-title">Owner session active</h1>
            <p className="lede">Protected Collectify workspace</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="auth-panel" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Collectify</p>
          <h1 id="app-title">Signed out</h1>
          <p className="lede">No owner session is active.</p>
        </div>

        <div className="auth-card" aria-live="polite">
          <div className="auth-card__header">
            <span className="status-dot is-ok" />
            <span>Session probe complete</span>
          </div>

          <dl>
            <div>
              <dt>Authenticated</dt>
              <dd>false</dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd>{getBackendUrl()}/session</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}

export default App;
