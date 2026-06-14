import { forwardRef, type HTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center gap-[5px]',
    'font-sans text-[11px] font-semibold leading-none tracking-[0.02em]',
    'px-[9px] py-[5px] rounded-[var(--radius-sm)] border whitespace-nowrap',
    '[&_svg]:w-[13px] [&_svg]:h-[13px]',
  ],
  {
    variants: {
      tone: {
        neutral: 'bg-secondary text-muted-foreground border-border',
        gold: 'bg-[color-mix(in_oklab,var(--gold-500)_16%,var(--card))] text-gold-400 border-[color-mix(in_oklab,var(--gold-500)_28%,transparent)]',
        emerald:
          'bg-[color-mix(in_oklab,var(--emerald-500)_16%,var(--card))] text-emerald-400 border-[color-mix(in_oklab,var(--emerald-500)_28%,transparent)]',
        positive:
          'bg-[color-mix(in_oklab,var(--positive)_16%,var(--card))] text-positive border-[color-mix(in_oklab,var(--positive)_28%,transparent)]',
        negative:
          'bg-[color-mix(in_oklab,var(--negative)_16%,var(--card))] text-negative border-[color-mix(in_oklab,var(--negative)_28%,transparent)]',
        warning:
          'bg-[color-mix(in_oklab,var(--warning)_16%,var(--card))] text-warning border-[color-mix(in_oklab,var(--warning)_28%,transparent)]',
        solid: 'bg-primary text-primary-foreground border-transparent',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: LucideIcon;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, icon: Icon, children, ...props }, ref) => {
    return (
      <span ref={ref} className={cn(badgeVariants({ tone }), className)} {...props}>
        {Icon ? <Icon /> : null}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

export { badgeVariants };
