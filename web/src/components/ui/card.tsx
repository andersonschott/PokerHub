import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'bg-card border border-border rounded-[var(--radius-lg)] text-card-foreground relative',
  {
    variants: {
      variant: {
        default: '',
        live: [
          'bg-[linear-gradient(150deg,color-mix(in_oklab,var(--emerald-500)_12%,var(--card)),var(--card))]',
          'border-[color-mix(in_oklab,var(--emerald-500)_30%,transparent)]',
          'shadow-glow-emerald',
        ],
        gold: [
          'bg-[linear-gradient(150deg,color-mix(in_oklab,var(--gold-500)_12%,var(--card)),var(--card))]',
          'border-[color-mix(in_oklab,var(--gold-500)_28%,transparent)]',
        ],
        flat: 'bg-secondary',
      },
      pad: {
        md: 'p-4',
        lg: 'p-5',
        none: 'p-0',
      },
      interactive: {
        true: [
          'cursor-pointer',
          'transition-[transform,border-color,box-shadow] duration-[var(--dur-fast,120ms)] ease-out',
          'hover:border-[var(--felt-600)] hover:shadow-md',
          'active:scale-[.99]',
        ],
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      pad: 'md',
      interactive: false,
    },
  },
);

export interface CardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof cardVariants> {
  title?: ReactNode;
  action?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, pad, interactive, title, action, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(cardVariants({ variant, pad, interactive }), className)} {...props}>
        {title != null || action != null ? (
          <div className="flex items-center justify-between gap-3 mb-3">
            {title != null ? (
              <span className="font-sans font-bold text-[17px] tracking-[-0.01em] text-foreground flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                {title}
              </span>
            ) : (
              <span className="flex-1" />
            )}
            {action != null ? (
              <span className="shrink-0 flex items-center">{action}</span>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
