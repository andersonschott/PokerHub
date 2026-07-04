import { forwardRef } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export const Label = forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground mb-[7px]',
      'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
      className,
    )}
    {...props}
  />
));

Label.displayName = LabelPrimitive.Root.displayName;
