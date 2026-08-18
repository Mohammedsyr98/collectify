import { RefreshCw } from 'lucide-react';

export function ErrorStatePage({
  actionLabel,
  detail,
  isActionPending = false,
  onAction,
  title,
}: {
  actionLabel: string;
  detail: string;
  isActionPending?: boolean;
  onAction: () => void;
  title: string;
}) {
  return (
    <main className="flex min-h-screen items-center bg-background p-7 text-foreground">
      <section
        aria-labelledby="error-state-title"
        className="mx-auto grid w-full max-w-[460px] gap-3.5 rounded-md border border-border bg-card p-7 shadow-[var(--shadow-sm)]"
      >
        <p className="m-0 text-[0.76rem] font-[850] tracking-normal text-primary">
          Collectify
        </p>
        <h1
          className="m-0 text-[1.6rem] leading-[1.15] tracking-normal"
          id="error-state-title"
        >
          {title}
        </h1>
        <p className="m-0 text-muted-foreground">{detail}</p>
        <button
          aria-busy={isActionPending}
          className="mt-1 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[5px] border border-border bg-background px-[18px] text-[0.84rem] font-extrabold text-foreground transition duration-150 hover:bg-muted disabled:cursor-wait disabled:opacity-70"
          disabled={isActionPending}
          onClick={onAction}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={isActionPending ? 'animate-spin' : undefined}
            size={16}
            strokeWidth={2.5}
          />
          {actionLabel}
        </button>
      </section>
    </main>
  );
}
