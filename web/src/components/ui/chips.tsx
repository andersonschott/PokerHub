import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ChipsProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label?: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  render?: (option: T) => string;
}

/** Segmented chip picker — select one from a fixed set of options. */
export function Chips<T>({ label, options, value, onChange, render, className, ...props }: ChipsProps<T>) {
  return (
    <div className={className} {...props}>
      {label ? (
        <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground mb-[7px]">
          {label}
        </label>
      ) : null}
      <div className="flex gap-1.5">
        {options.map((opt, idx) => {
          const active = opt === value;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                'flex-1 h-[38px] rounded-[var(--radius-sm)] cursor-pointer',
                'font-mono font-bold text-[13.5px]',
                'border transition-[background,border-color,color] duration-[var(--dur-fast,120ms)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-2',
                active
                  ? 'bg-[color-mix(in_oklab,var(--gold-500)_14%,var(--card))] border-[color-mix(in_oklab,var(--gold-500)_45%,var(--border))] text-gold-400'
                  : 'bg-transparent border-border text-muted-foreground hover:border-[var(--felt-600)]',
              )}
            >
              {render ? render(opt) : String(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
