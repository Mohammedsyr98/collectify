import type { ReactNode } from 'react';

export type SegmentedControlOption<Value extends string = string> = {
  label: ReactNode;
  value: Value;
};

export function SegmentedControl<Value extends string>({
  ariaLabel,
  disabled = false,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: Value) => void;
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
}) {
  return (
    <div
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className="flex w-full rounded-[5px] border border-border bg-background p-1"
      role="group"
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            aria-pressed={isActive}
            className={segmentedButtonClassName(isActive, disabled)}
            disabled={disabled}
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

function segmentedButtonClassName(isActive: boolean, disabled: boolean) {
  return [
    'min-h-9 min-w-0 flex-1 rounded-[4px] border-0 px-3 text-center text-[0.78rem] font-extrabold transition',
    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    isActive
      ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
      : disabled
        ? 'bg-transparent text-muted-foreground'
        : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  ].join(' ');
}
