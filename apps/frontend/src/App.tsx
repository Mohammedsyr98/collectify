import { useCallback, useEffect, useState } from 'react';

import type { HealthResponse } from '@collectify/contracts';

import { getBackendUrl, getHealth } from './api';

function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getHealth();
      setHealth(result);
    } catch (caughtError) {
      setHealth(null);
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to reach backend');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const statusText = error
    ? 'Backend unavailable'
    : health
      ? 'Backend connected'
      : 'Checking backend';

  return (
    <main className="app-shell">
      <section className="status-panel" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Collectify</p>
          <h1 id="app-title">Frontend</h1>
          <p className="lede">
            React is running, and this screen checks the NestJS backend health endpoint.
          </p>
        </div>

        <div className="health-card" aria-live="polite">
          <div className="health-card__header">
            <span
              className={`status-dot ${error ? 'is-error' : health ? 'is-ok' : 'is-loading'}`}
            />
            <span>{statusText}</span>
          </div>

          <dl>
            <div>
              <dt>Service</dt>
              <dd>{health?.service ?? 'backend'}</dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd>{getBackendUrl()}/health</dd>
            </div>
            <div>
              <dt>Uptime</dt>
              <dd>
                {health
                  ? formatUptime(health.uptimeSeconds)
                  : isLoading
                    ? 'Checking'
                    : 'Unavailable'}
              </dd>
            </div>
          </dl>

          {error ? <p className="error-message">{error}</p> : null}

          <button type="button" onClick={loadHealth} disabled={isLoading}>
            {isLoading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
