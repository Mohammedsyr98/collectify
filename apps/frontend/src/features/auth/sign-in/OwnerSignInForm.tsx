import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ownerSignInRequestSchema, type OwnerSignInRequest } from '@collectify/contracts';

import { useAuthValidationErrorFormatter } from '../localization/useAuthValidationErrorFormatter';
import { FormInput } from '../../../shared/ui/form/FormInput';

const defaultValues: OwnerSignInRequest = {
  email: '',
  password: '',
};

export function OwnerSignInForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (request: OwnerSignInRequest) => Promise<void> | void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { t } = useTranslation();
  const formatValidationError = useAuthValidationErrorFormatter();
  const form = useForm<OwnerSignInRequest>({
    defaultValues,
    resolver: zodResolver(ownerSignInRequestSchema),
  });
  const { handleSubmit } = form;

  return (
    <FormProvider {...form}>
      <form
        className="grid gap-[13px]"
        noValidate
        onSubmit={handleSubmit((request) => onSubmit(request))}
      >
        <FormInput
          autoComplete="email"
          formatError={formatValidationError}
          icon={<Mail aria-hidden="true" size={16} strokeWidth={2.2} />}
          label={t('auth.signIn.emailLabel')}
          name="email"
          placeholder={t('auth.signIn.emailPlaceholder')}
          type="email"
        />

        <FormInput
          autoComplete="current-password"
          formatError={formatValidationError}
          endAdornment={
            <button
              aria-label={
                isPasswordVisible
                  ? t('auth.togglePassword.hide')
                  : t('auth.togglePassword.show')
              }
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setIsPasswordVisible((current) => !current)}
              title={
                isPasswordVisible
                  ? t('auth.togglePassword.hide')
                  : t('auth.togglePassword.show')
              }
              type="button"
            >
              {isPasswordVisible ? (
                <EyeOff aria-hidden="true" size={16} strokeWidth={2.2} />
              ) : (
                <Eye aria-hidden="true" size={16} strokeWidth={2.2} />
              )}
            </button>
          }
          icon={<LockKeyhole aria-hidden="true" size={16} strokeWidth={2.2} />}
          label={t('auth.signIn.passwordLabel')}
          name="password"
          placeholder={t('auth.signIn.passwordPlaceholder')}
          type={isPasswordVisible ? 'text' : 'password'}
        />

        <button
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[5px] border-0 bg-primary px-[18px] text-[0.84rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
          disabled={isSubmitting}
          type="submit"
        >
          <LogIn aria-hidden="true" size={16} strokeWidth={2.3} />
          {isSubmitting ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
        </button>
      </form>
    </FormProvider>
  );
}
