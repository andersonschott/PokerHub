import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SectionTitleProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  action?: ReactNode;
}

export const SectionTitle = forwardRef<HTMLDivElement, SectionTitleProps>(
  ({ className, icon: Icon, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between gap-[10px] mb-[10px]', className)}
        {...props}
      >
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground inline-flex items-center gap-[6px] [&_svg]:w-[13px] [&_svg]:h-[13px]">
          {Icon ? <Icon /> : null}
          {children}
        </span>
        {action}
      </div>
    );
  },
);

SectionTitle.displayName = 'SectionTitle';
