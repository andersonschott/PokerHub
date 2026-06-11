import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const iconButtonVariants = cva(
  [
    'inline-flex items-center justify-center',
    'rounded-[var(--radius-md)] border border-transparent cursor-pointer bg-transparent text-foreground',
    'transition-[transform,background,color,border-color] duration-[var(--dur-fast,120ms)] ease-out',
    'active:scale-[.92]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-2',
    'disabled:opacity-40 disabled:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        ghost: 'hover:bg-secondary',
        solid: 'bg-secondary border-border hover:bg-[var(--felt-700)]',
      },
      size: {
        md: 'size-11 [&_svg]:size-5',
        sm: 'size-9 [&_svg]:size-[18px]',
      },
      gold: {
        true: 'text-gold-400',
        false: '',
      },
    },
    compoundVariants: [
      {
        variant: 'solid',
        gold: true,
        className:
          'bg-[color-mix(in_oklab,var(--gold-500)_16%,var(--card))] border-[color-mix(in_oklab,var(--gold-500)_30%,var(--border))]',
      },
    ],
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
      gold: false,
    },
  },
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: LucideIcon;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, gold, icon: Icon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(iconButtonVariants({ variant, size, gold }), className)}
        {...props}
      >
        <Icon />
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
