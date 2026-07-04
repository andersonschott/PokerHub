import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-sans font-semibold leading-none tracking-[-0.01em] whitespace-nowrap',
    'rounded-[var(--radius-md)] border border-transparent cursor-pointer',
    'select-none no-underline',
    'transition-[transform,background,border-color,opacity] duration-[var(--dur-fast,120ms)] ease-out',
    'active:scale-[.97]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-2',
    'disabled:opacity-45 disabled:pointer-events-none',
    '[&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary text-primary-foreground',
          'shadow-[inset_0_1px_0_oklch(1_0_0_/_0.08)]',
          'hover:bg-gold-600',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground border-border',
          'hover:bg-[var(--felt-700)]',
        ],
        outline: [
          'bg-transparent text-foreground border-border',
          'hover:bg-secondary',
        ],
        ghost: [
          'bg-transparent text-muted-foreground',
          'hover:bg-secondary hover:text-foreground',
        ],
        destructive: [
          'bg-destructive text-destructive-foreground',
          'hover:brightness-110',
        ],
      },
      size: {
        sm: 'h-9 px-3 text-[13px] rounded-[var(--radius-sm)]',
        md: 'h-11 px-4 text-[15px]',
        lg: 'h-[52px] px-[22px] text-[16px]',
      },
      block: {
        true: 'flex w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      block: false,
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, icon: Icon, iconRight: IconRight, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      >
        {Icon ? <Icon /> : null}
        {children ? <span>{children}</span> : null}
        {IconRight ? <IconRight /> : null}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { buttonVariants };
