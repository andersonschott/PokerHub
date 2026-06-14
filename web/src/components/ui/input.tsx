import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  prefix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, mono, prefix, ...props }, ref) => {
    const inputCls = cn(
      'w-full h-[46px] px-[14px]',
      'rounded-[var(--radius-md)] border border-[var(--input)]',
      'bg-[color-mix(in_oklab,var(--card)_55%,transparent)]',
      'text-foreground font-sans text-[15px]',
      'outline-none appearance-none',
      'transition-[border-color,box-shadow] duration-[var(--dur-fast,120ms)]',
      'placeholder:text-[var(--ink-600)]',
      'focus:border-[var(--ring)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_20%,transparent)]',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'aria-invalid:border-destructive',
      mono ? 'font-mono tabular-nums' : '',
      prefix ? 'pl-[calc(14px+var(--prefix-w,0px))]' : '',
      className,
    );

    if (prefix) {
      return (
        <div className="relative">
          <span
            className="absolute left-[14px] top-1/2 -translate-y-1/2 font-mono text-[14px] text-muted-foreground pointer-events-none"
            aria-hidden
          >
            {prefix}
          </span>
          <input
            ref={ref}
            type={type}
            className={inputCls}
            style={{ paddingLeft: 14 + prefix.length * 9 + 8 }}
            {...props}
          />
        </div>
      );
    }

    return <input ref={ref} type={type} className={inputCls} {...props} />;
  },
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full py-3 px-[14px]',
          'rounded-[var(--radius-md)] border border-[var(--input)]',
          'bg-[color-mix(in_oklab,var(--card)_55%,transparent)]',
          'text-foreground font-sans text-[15px]',
          'outline-none appearance-none resize-none leading-[1.45]',
          'transition-[border-color,box-shadow] duration-[var(--dur-fast,120ms)]',
          'placeholder:text-[var(--ink-600)]',
          'focus:border-[var(--ring)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_20%,transparent)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'aria-invalid:border-destructive',
          className,
        )}
        rows={props.rows ?? 3}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
