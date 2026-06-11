import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const progressVariants = cva(
  'w-full rounded-full bg-secondary overflow-hidden',
  {
    variants: {
      tone: {
        gold: '[&_.fill]:bg-primary',
        emerald: '[&_.fill]:bg-[var(--emerald-500)]',
        positive: '[&_.fill]:bg-positive',
        warning: '[&_.fill]:bg-warning',
      },
      size: {
        md: 'h-2',
        lg: 'h-3',
      },
    },
    defaultVariants: {
      tone: 'gold',
      size: 'md',
    },
  },
);

export interface ProgressBarProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value?: number;
  max?: number;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, tone, size, value = 0, max = 100, ...props }, ref) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
        className={cn(progressVariants({ tone, size }), className)}
        {...props}
      >
        <div
          className="fill h-full rounded-full transition-[width] duration-[var(--dur-slow,320ms)] ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  },
);

ProgressBar.displayName = 'ProgressBar';
