import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function AuthShell({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle: string;
  title: string;
}) {
  const { t } = useTranslation();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-7 pb-8 pt-5.5 text-foreground before:absolute before:inset-x-0 before:top-0 before:h-0.5 max-[760px]:px-4.5 max-[760px]:pb-6.5 max-[760px]:pt-4.5">
      <section
        className="relative flex min-h-[calc(100vh-56px)] flex-col items-center justify-center pb-5.5 pt-9 max-[760px]:min-h-[calc(100vh-44px)] max-[760px]:pt-7"
        aria-labelledby="auth-title"
      >
        <header
          className="relative z-10 mb-4 flex w-full max-w-[560px] items-center gap-2 text-[0.86rem] font-extrabold leading-none text-primary"
          aria-label="Collectify"
        >
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-[3px] border-2 border-current text-xs"
            aria-hidden="true"
          >
            C
          </span>
          <span>Collectify</span>
        </header>

        <div className="relative z-10 grid w-full max-w-140 rounded-md border border-border bg-card px-8 pb-7 pt-7 shadow-[var(--shadow-sm)] max-[760px]:px-5.5 max-[760px]:pb-5.5 max-[760px]:pt-6">
          <div className="mb-5 grid gap-1.75">
            <h1
              className="m-0 text-[1.45rem] font-[850] leading-[1.12] tracking-normal text-foreground"
              id="auth-title"
            >
              {title}
            </h1>
            <p className="m-0 max-w-67.5 text-[0.82rem] leading-[1.42] text-muted-foreground">
              {subtitle}
            </p>
          </div>
          {children}
        </div>

        <p className="mt-4 text-center text-[0.69rem] font-semibold text-muted-foreground">
          {t('auth.shell.secureSession')}
        </p>
      </section>
    </main>
  );
}
