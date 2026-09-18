import { Search } from 'lucide-react';

export function SearchField({
  ariaLabel,
  className,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className={`relative block${className ? ` ${className}` : ''}`}>
      <span className="sr-only">{ariaLabel}</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        size={16}
        strokeWidth={2.4}
      />
      <input
        aria-label={ariaLabel}
        className="min-h-10 w-full rounded-[5px] border border-border bg-card px-9 text-[0.82rem] font-bold text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/25"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </label>
  );
}
