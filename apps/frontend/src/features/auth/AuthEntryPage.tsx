import { useState } from 'react';

import { AuthShell } from './components/AuthShell';
import { OwnerSignInForm } from './sign-in/OwnerSignInForm';
import { useOwnerSignInSubmit } from './sign-in/useOwnerSignInSubmit';
import { OwnerSignUpForm } from './sign-up/OwnerSignUpForm';
import { useOwnerSignUpSubmit } from './sign-up/useOwnerSignUpSubmit';

type AuthMode = 'sign-in' | 'sign-up';

export function AuthEntryPage() {
  const [mode, setMode] = useState<AuthMode>('sign-up');
  const signIn = useOwnerSignInSubmit();
  const signUp = useOwnerSignUpSubmit();
  const isSignIn = mode === 'sign-in';

  return (
    <AuthShell
      title={isSignIn ? 'Sign in' : 'Create account'}
      subtitle={
        isSignIn
          ? 'Use your owner credentials to enter Collectify.'
          : 'Set up the owner profile for your Collectify workspace.'
      }
    >
      <div className="mb-4 grid grid-cols-2 rounded-[5px] border border-border bg-background p-1">
        <button
          aria-label="Show create account form"
          aria-pressed={!isSignIn}
          className={authModeButtonClassName(!isSignIn)}
          onClick={() => setMode('sign-up')}
          type="button"
        >
          Create account
        </button>
        <button
          aria-pressed={isSignIn}
          className={authModeButtonClassName(isSignIn)}
          onClick={() => setMode('sign-in')}
          type="button"
        >
          Sign in
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
