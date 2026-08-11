import type { ReactNode } from 'react';

import { getFieldErrorId } from './fieldIds';

export type FormErrorFormatter = (error: string) => string;

export function FormField({
  children,
  error,
  formatError,
  htmlFor,
  icon,
  label,
}: {
  children: ReactNode;
  error?: string;
  formatError?: FormErrorFormatter;
  htmlFor: string;
  icon?: ReactNode;
  label: string;
}) {
  const errorId = getFieldErrorId(htmlFor);
  const displayedError = error ? (formatError?.(error) ?? error) : undefined;
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
