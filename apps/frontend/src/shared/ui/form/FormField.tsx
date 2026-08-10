import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { isValidationErrorCode } from '@collectify/contracts';

import { getFieldErrorId } from './fieldIds';

export function FormField({
  children,
  error,
  htmlFor,
  icon,
  label,
}: {
  children: ReactNode;
  error?: string;
  htmlFor: string;
  icon?: ReactNode;
  label: string;
}) {
  const { t } = useTranslation();
  const errorId = getFieldErrorId(htmlFor);
  const displayedError =
    error && isValidationErrorCode(error)
      ? t(`validation.${error}`, { defaultValue: error })
      : error;
  const inputFrameClassName =
    'relative flex min-h-[42px] items-center rounded-[5px] border border-border bg-background transition-all focus-within:border-primary focus-within:bg-card focus-within:ring-[3px] focus-within:ring-primary/15';

  return (
    <div className="grid gap-[5px]">
      <label
        className="text-[0.73rem] font-bold leading-[1.3] text-card-foreground"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      <div className={inputFrameClassName}>
        {icon ? (
          <span className="pointer-events-none absolute left-3 inline-flex text-muted-foreground">
            {icon}
          </span>
        ) : null}
        {children}
      </div>
      {displayedError ? (
        <p
          className="m-0 text-[0.72rem] font-bold leading-[1.35] text-status-overdue-foreground"
          id={errorId}
          role="alert"
        >
          {displayedError}
        </p>
      ) : null}
    </div>
  );
}
