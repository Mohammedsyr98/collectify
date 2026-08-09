import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, Eye, EyeOff, Globe2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ownerSignUpRequestSchema, type OwnerSignUpRequest } from '@collectify/contracts';

import {
  isSupportedLocale,
  supportedLocales,
  type SupportedLocale,
  useLocalization,
} from '../../../shared/localization';
import { FormInput } from '../../../shared/ui/form/FormInput';
import { FormSelect } from '../../../shared/ui/form/FormSelect';

const localeNameTranslationKeys = {
  en: 'locale.english',
  tr: 'locale.turkish',
} satisfies Record<SupportedLocale, string>;

function createDefaultValues(preferredLanguage: SupportedLocale): OwnerSignUpRequest {
  return {
    name: '',
    email: '',
    password: '',
    preferredLanguage,
    defaultCurrency: 'USD',
  };
}

export function OwnerSignUpForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (request: OwnerSignUpRequest) => Promise<void> | void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { t } = useTranslation();
  const { locale, setLocale } = useLocalization();
  const form = useForm<OwnerSignUpRequest>({
    defaultValues: createDefaultValues(locale),
    resolver: zodResolver(ownerSignUpRequestSchema),
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
          autoComplete="name"
          icon={<UserRound aria-hidden="true" size={16} strokeWidth={2.2} />}
          label={t('auth.signUp.nameLabel')}
          name="name"
          placeholder={t('auth.signUp.namePlaceholder')}
          type="text"
        />

        <FormInput
          autoComplete="email"
          icon={<Mail aria-hidden="true" size={16} strokeWidth={2.2} />}
          label={t('auth.signUp.emailLabel')}
          name="email"
          placeholder={t('auth.signUp.emailPlaceholder')}
          type="email"
        />

        <FormInput
          autoComplete="new-password"
          endAdornment={
            <button
              aria-label={
                isPasswordVisible
                  ? t('auth.togglePassword.hide')
                  : t('auth.togglePassword.show')
              }
              className="absolute right-[5px] inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
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
          label={t('auth.signUp.passwordLabel')}
          name="password"
          placeholder={t('auth.signUp.passwordPlaceholder')}
          type={isPasswordVisible ? 'text' : 'password'}
        />

        <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
          <FormSelect
            icon={<Globe2 aria-hidden="true" size={16} strokeWidth={2.2} />}
            label={t('auth.signUp.languageLabel')}
            name="preferredLanguage"
            onChange={(event) => {
              if (isSupportedLocale(event.currentTarget.value)) {
                setLocale(event.currentTarget.value);
              }
            }}
            options={supportedLocales.map((supportedLocale) => ({
              label: t(localeNameTranslationKeys[supportedLocale]),
              value: supportedLocale,
            }))}
          />

          <FormSelect
            icon={<Banknote aria-hidden="true" size={16} strokeWidth={2.2} />}
            label={t('auth.signUp.currencyLabel')}
            name="defaultCurrency"
            options={[
              { label: 'USD', value: 'USD' },
              { label: 'TRY', value: 'TRY' },
              { label: 'EUR', value: 'EUR' },
            ]}
          />
        </div>

        <button
          className="min-h-11 w-full cursor-pointer rounded-[5px] border-0 bg-primary px-[18px] text-[0.84rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
        </button>
      </form>
    </FormProvider>
  );
}
