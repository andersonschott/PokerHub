import { type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  label: string;
  sub?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

/** Full-width switch row (≥44px touch target). Controlled component. */
export function Switch({ label, sub, checked = false, onChange, className, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'flex items-center gap-3 w-full min-h-[48px] py-[10px] px-0.5',
        'border-0 bg-transparent cursor-pointer text-left text-foreground',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-2',
        className,
      )}
      {...props}
    >
      <span className="flex-1 min-w-0">
        <span className="block font-sans font-medium text-[14.5px]">{label}</span>
        {sub ? (
          <span className="block text-[12px] text-muted-foreground mt-0.5">{sub}</span>
        ) : null}
      </span>
      {/* Track */}
      <span
        aria-hidden
        className={cn(
          'w-[42px] h-6 rounded-full p-0.5 shrink-0 box-border border border-border',
          'flex items-center transition-[background] duration-[var(--dur-fast,120ms)]',
          checked ? 'bg-primary justify-end' : 'bg-secondary justify-start',
        )}
      >
        {/* Thumb */}
        <span
          className={cn(
            'w-[18px] h-[18px] rounded-full',
            checked ? 'bg-primary-foreground' : 'bg-muted-foreground',
          )}
        />
      </span>
    </button>
  );
}
