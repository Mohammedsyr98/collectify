import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import type {
  Currency,
  OwnerLanguage,
  OwnerSignUpFieldErrors,
  OwnerSignUpRequest,
} from '@collectify/contracts';

import { ApiError, getSession, signUpOwner } from './api';

const defaultSignUpForm: OwnerSignUpRequest = {
  name: '',
  email: '',
  password: '',
  preferredLanguage: 'en',
  defaultCurrency: 'USD',
};

function App() {
  const queryClient = useQueryClient();
  const [signUpForm, setSignUpForm] =
    useState<OwnerSignUpRequest>(defaultSignUpForm);
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: getSession,
  });
  const signUpMutation = useMutation({
    mutationFn: signUpOwner,
    onSuccess: (session) => {
      queryClient.setQueryData(['session'], session);
    },
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

  if (session.authenticated && session.ownerProfile) {
    return (
      <main className="app-shell">
        <section className="auth-panel" aria-labelledby="app-title">
          <div>
            <p className="eyebrow">Collectify</p>
            <h1 id="app-title">Owner session active</h1>
            <p className="lede">Protected Collectify workspace</p>
          </div>

          <div className="auth-card">
            <div className="auth-card__header">
              <span className="status-dot is-ok" />
              <span>Owner context</span>
            </div>

            <dl>
              <div>
                <dt>Email</dt>
                <dd>{session.user.email}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{session.ownerProfile.preferredLanguage}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{session.ownerProfile.defaultCurrency}</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>
    );
  }

  if (session.authenticated && !session.ownerProfile) {
    return (
      <main className="app-shell">
        <section className="auth-panel" aria-labelledby="app-title">
          <div>
            <p className="eyebrow">Collectify</p>
            <h1 id="app-title">Owner setup incomplete</h1>
            <p className="lede">Complete owner setup before entering the workspace.</p>
          </div>
        </section>
      </main>
    );
  }

  const apiError =
    signUpMutation.error instanceof ApiError ? signUpMutation.error : null;
  const fieldErrors = apiError?.fieldErrors;
  const signUpErrorMessage = signUpMutation.error
    ? apiError?.message ?? 'Unable to create owner account. Try again.'
    : null;

  function updateForm<Key extends keyof OwnerSignUpRequest>(
    key: Key,
    value: OwnerSignUpRequest[Key],
  ) {
    setSignUpForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function getFieldError(field: keyof OwnerSignUpFieldErrors): string | null {
    return fieldErrors?.[field]?.[0] ?? null;
  }

  function submitSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signUpMutation.mutate(signUpForm);
  }

  return (
    <main className="app-shell">
      <section className="auth-panel" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Collectify</p>
          <h1 id="app-title">Create owner account</h1>
          <p className="lede">Set up the first workspace owner profile.</p>
        </div>

        <form className="auth-card auth-form" onSubmit={submitSignUp}>
          <div className="auth-card__header">
            <span className="status-dot is-ok" />
            <span>Owner sign-up</span>
          </div>

          {signUpErrorMessage ? (
            <p
              aria-label="Owner sign-up error"
              className="error-message"
              role="alert"
            >
              {signUpErrorMessage}
            </p>
          ) : null}

          <label className="field">
            <span>Name</span>
            <input
              autoComplete="name"
              aria-describedby={
                getFieldError('name') ? 'owner-sign-up-name-error' : undefined
              }
              name="name"
              onChange={(event) => updateForm('name', event.target.value)}
              required
              type="text"
              value={signUpForm.name}
            />
            <FieldError id="owner-sign-up-name-error" message={getFieldError('name')} />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              aria-describedby={
                getFieldError('email') ? 'owner-sign-up-email-error' : undefined
              }
              name="email"
              onChange={(event) => updateForm('email', event.target.value)}
              required
              type="email"
              value={signUpForm.email}
            />
            <FieldError
              id="owner-sign-up-email-error"
              message={getFieldError('email')}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="new-password"
              aria-describedby={
                getFieldError('password')
                  ? 'owner-sign-up-password-error'
                  : undefined
              }
              minLength={8}
              name="password"
              onChange={(event) => updateForm('password', event.target.value)}
              required
              type="password"
              value={signUpForm.password}
            />
            <FieldError
              id="owner-sign-up-password-error"
              message={getFieldError('password')}
            />
          </label>

          <label className="field">
            <span>Interface language</span>
            <select
              aria-describedby={
                getFieldError('preferredLanguage')
                  ? 'owner-sign-up-language-error'
                  : undefined
              }
              name="preferredLanguage"
              onChange={(event) =>
                updateForm('preferredLanguage', event.target.value as OwnerLanguage)
              }
              value={signUpForm.preferredLanguage}
            >
              <option value="en">English</option>
              <option value="tr">Turkish</option>
            </select>
            <FieldError
              id="owner-sign-up-language-error"
              message={getFieldError('preferredLanguage')}
            />
          </label>

          <label className="field">
            <span>Default currency</span>
            <select
              aria-describedby={
                getFieldError('defaultCurrency')
                  ? 'owner-sign-up-currency-error'
                  : undefined
              }
              name="defaultCurrency"
              onChange={(event) =>
                updateForm('defaultCurrency', event.target.value as Currency)
              }
              value={signUpForm.defaultCurrency}
            >
              <option value="USD">USD</option>
              <option value="TRY">TRY</option>
              <option value="EUR">EUR</option>
            </select>
            <FieldError
              id="owner-sign-up-currency-error"
              message={getFieldError('defaultCurrency')}
            />
          </label>

          <button disabled={signUpMutation.isPending} type="submit">
            {signUpMutation.isPending ? 'Creating account' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}

function FieldError({
  id,
  message,
}: {
  id: string;
  message: string | null;
}) {
  if (!message) {
    return null;
  }

  return (
    <span className="field-error" id={id}>
      {message}
    </span>
  );
}

export default App;
