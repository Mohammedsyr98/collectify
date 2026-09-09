import type { ReactNode } from 'react';

export type SegmentedControlOption<Value extends string = string> = {
  label: ReactNode;
  value: Value;
};

export function SegmentedControl<Value extends string>({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  onChange: (value: Value) => void;
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="flex w-full rounded-[5px] border border-border bg-background p-1"
      role="group"
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            aria-pressed={isActive}
            className={segmentedButtonClassName(isActive)}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function segmentedButtonClassName(isActive: boolean) {
  return [
    'min-h-9 min-w-0 flex-1 cursor-pointer rounded-[4px] border-0 px-3 text-center text-[0.78rem] font-extrabold transition',
    isActive
      ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
      : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  ].join(' ');
}
