import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { ownerSignInRequestSchema, type OwnerSignInRequest } from '@collectify/contracts';

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
          icon={<Mail aria-hidden="true" size={16} strokeWidth={2.2} />}
          label="Email address"
          name="email"
          placeholder="owner@example.com"
          type="email"
        />

        <FormInput
          autoComplete="current-password"
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
          placeholder="Your password"
          type={isPasswordVisible ? 'text' : 'password'}
        />

        <button
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[5px] border-0 bg-primary px-[18px] text-[0.84rem] font-extrabold text-primary-foreground transition duration-150 hover:-translate-y-px hover:brightness-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
          disabled={isSubmitting}
          type="submit"
        >
          <LogIn aria-hidden="true" size={16} strokeWidth={2.3} />
          {isSubmitting ? 'Signing in' : 'Enter workspace'}
        </button>
      </form>
    </FormProvider>
  );
}
