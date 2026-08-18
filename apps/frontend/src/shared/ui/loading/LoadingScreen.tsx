export function LoadingScreen({ ariaLabel }: { ariaLabel: string }) {
  return (
    <main
      aria-label={ariaLabel}
      className="grid min-h-screen place-items-center bg-background px-7 text-foreground"
      role="status"
    >
      <div
        className="grid justify-items-center gap-4"
        aria-hidden="true"
      >
        <div className="collectify-loading-mark grid h-12 w-12 place-items-center rounded-[6px] border border-primary/25 bg-card text-[1.05rem] font-[850] text-primary shadow-[var(--shadow-sm)]">
          C
        </div>
        <div className="h-1.5 w-36 overflow-hidden rounded-full bg-muted">
          <div className="collectify-loading-bar h-full w-14 rounded-full bg-primary" />
        </div>
      </div>
    </main>
  );
}
