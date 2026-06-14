import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusPillVariants = cva(
  [
    'inline-flex items-center gap-2',
    'font-sans text-[12px] font-semibold leading-none tracking-[0.06em] uppercase',
    'px-[13px] py-[7px] rounded-full border whitespace-nowrap',
  ],
  {
    variants: {
      status: {
        live: 'bg-[color-mix(in_oklab,var(--positive)_15%,var(--card))] text-positive border-[color-mix(in_oklab,var(--positive)_30%,transparent)]',
        paused:
          'bg-[color-mix(in_oklab,var(--warning)_15%,var(--card))] text-warning border-[color-mix(in_oklab,var(--warning)_30%,transparent)]',
        scheduled: 'bg-secondary text-muted-foreground border-border',
        finished:
          'bg-[color-mix(in_oklab,var(--gold-500)_15%,var(--card))] text-gold-400 border-[color-mix(in_oklab,var(--gold-500)_30%,transparent)]',
      },
    },
    defaultVariants: {
      status: 'live',
    },
  },
);

const LABELS: Record<string, string> = {
  live: 'Ao vivo',
  paused: 'Pausado',
  scheduled: 'Agendado',
  finished: 'Finalizado',
};

export interface StatusPillProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  dot?: boolean;
  label?: string;
}

export const StatusPill = forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, status = 'live', dot = true, label, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(statusPillVariants({ status }), className)} {...props}>
        {dot ? (
          <span
            className={cn(
              'size-2 rounded-full bg-current shrink-0',
              status === 'live' ? 'animate-ph-pulse' : '',
            )}
          />
        ) : null}
        {label ?? LABELS[status ?? 'live']}
      </span>
    );
  },
);

StatusPill.displayName = 'StatusPill';
