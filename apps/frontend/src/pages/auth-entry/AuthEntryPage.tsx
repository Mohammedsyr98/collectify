import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  OwnerSignInForm,
  OwnerSignUpForm,
  useOwnerSignInSubmit,
  useOwnerSignUpSubmit,
} from '@/features/auth';
import { SegmentedControl } from '@/shared/ui/segmented-control';

import { AuthShell } from './ui/AuthShell';

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
      <div className="mb-4">
        <SegmentedControl
          ariaLabel={t('auth.entry.modeLabel')}
          onChange={setMode}
          options={[
            {
              label: t('auth.entry.createAccountTab'),
              value: 'sign-up',
            },
            {
              label: t('auth.entry.signInTab'),
              value: 'sign-in',
            },
          ]}
          value={mode}
        />
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
