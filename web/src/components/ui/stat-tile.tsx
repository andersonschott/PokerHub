import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statTileVariants = cva(
  [
    'flex flex-col gap-1',
    'bg-card border border-border rounded-[var(--radius-lg)]',
    'p-[14px] min-w-0',
  ],
  {
    variants: {
      tone: {
        default: '[&_.stat-value]:text-foreground',
        gold: '[&_.stat-value]:text-gold-400',
        emerald: '[&_.stat-value]:text-emerald-400',
        positive: '[&_.stat-value]:text-positive',
        negative: '[&_.stat-value]:text-negative',
      },
      center: {
        true: 'items-center text-center',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'default',
      center: false,
    },
  },
);

export interface StatTileProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statTileVariants> {
  value: ReactNode;
  label: string;
  icon?: LucideIcon;
  valueSize?: string;
}

export const StatTile = forwardRef<HTMLDivElement, StatTileProps>(
  ({ className, tone, center, value, label, icon: Icon, valueSize, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(statTileVariants({ tone, center }), className)} {...props}>
        {Icon ? (
          <span className="flex text-muted-foreground [&_svg]:w-4 [&_svg]:h-4">
            <Icon />
          </span>
        ) : null}
        <span
          className="stat-value font-mono font-bold leading-[1.05] tracking-[-0.02em] tabular-nums"
          style={{ fontSize: valueSize ?? 'var(--fs-stat, 30px)' }}
        >
          {value}
        </span>
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </div>
    );
  },
);

StatTile.displayName = 'StatTile';
