import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, Eye, EyeOff, Globe2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { ownerSignUpRequestSchema, type OwnerSignUpRequest } from '@collectify/contracts';

import { FormInput } from '../../../shared/ui/form/FormInput';
import { FormSelect } from '../../../shared/ui/form/FormSelect';

const defaultValues: OwnerSignUpRequest = {
  name: '',
  email: '',
  password: '',
  preferredLanguage: 'en',
  defaultCurrency: 'USD',
};

export function OwnerSignUpForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (request: OwnerSignUpRequest) => Promise<void> | void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm<OwnerSignUpRequest>({
    defaultValues,
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
          label="Name"
          name="name"
          placeholder="Ada Lovelace"
          type="text"
        />

        <FormInput
          autoComplete="email"
          icon={<Mail aria-hidden="true" size={16} strokeWidth={2.2} />}
          label="Email address"
          name="email"
          placeholder="owner@example.com"
          type="email"
        />

        <FormInput
          autoComplete="new-password"
          endAdornment={
            <button
              aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              className="absolute right-[5px] inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setIsPasswordVisible((current) => !current)}
              title={isPasswordVisible ? 'Hide password' : 'Show password'}
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
          label="Password"
          name="password"
          placeholder="At least 8 characters"
          type={isPasswordVisible ? 'text' : 'password'}
        />

        <div className="grid grid-cols-2 gap-3 max-[430px]:grid-cols-1">
          <FormSelect
            icon={<Globe2 aria-hidden="true" size={16} strokeWidth={2.2} />}
            label="Interface language"
            name="preferredLanguage"
            options={[
              { label: 'English', value: 'en' },
              { label: 'Turkish', value: 'tr' },
            ]}
          />

          <FormSelect
            icon={<Banknote aria-hidden="true" size={16} strokeWidth={2.2} />}
            label="Default currency"
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
          {isSubmitting ? 'Creating account' : 'Create account'}
        </button>
      </form>
    </FormProvider>
  );
}
