import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthShell } from './components/AuthShell';
import { OwnerSignInForm } from './sign-in/OwnerSignInForm';
import { useOwnerSignInSubmit } from './sign-in/useOwnerSignInSubmit';
import { OwnerSignUpForm } from './sign-up/OwnerSignUpForm';
import { useOwnerSignUpSubmit } from './sign-up/useOwnerSignUpSubmit';

type AuthMode = 'sign-in' | 'sign-up';

export function AuthEntryPage() {
  const [mode, setMode] = useState<AuthMode>('sign-up');
  const { t } = useTranslation();
  const signIn = useOwnerSignInSubmit();
  const signUp = useOwnerSignUpSubmit();
  const isSignIn = mode === 'sign-in';

  return (
    <AuthShell
      title={isSignIn ? t('auth.entry.signIn.title') : t('auth.entry.signUp.title')}
      subtitle={
        isSignIn
          ? t('auth.entry.signIn.subtitle')
          : t('auth.entry.signUp.subtitle')
      }
    >
      <div className="mb-4 grid grid-cols-2 rounded-[5px] border border-border bg-background p-1">
        <button
          aria-label={t('auth.entry.showCreateAccountForm')}
          aria-pressed={!isSignIn}
          className={authModeButtonClassName(!isSignIn)}
          onClick={() => setMode('sign-up')}
          type="button"
        >
          {t('auth.entry.createAccountTab')}
        </button>
        <button
          aria-pressed={isSignIn}
          className={authModeButtonClassName(isSignIn)}
          onClick={() => setMode('sign-in')}
          type="button"
        >
          {t('auth.entry.signInTab')}
        </button>
      </div>

      {isSignIn ? (
        <OwnerSignInForm
          isSubmitting={signIn.isSubmitting}
          onSubmit={signIn.submit}
        />
      ) : (
        <OwnerSignUpForm
          isSubmitting={signUp.isSubmitting}
          onSubmit={signUp.submit}
        />
      )}
    </AuthShell>
  );
}

function authModeButtonClassName(isActive: boolean) {
  return [
    'min-h-9 cursor-pointer rounded-[4px] border-0 px-3 text-[0.78rem] font-extrabold transition',
    isActive
      ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
      : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  ].join(' ');
}
