import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type MoneyColor = 'auto' | 'none' | 'positive' | 'negative' | 'muted';

export interface MoneyValueProps extends HTMLAttributes<HTMLSpanElement> {
  value?: number;
  signed?: boolean;
  color?: MoneyColor;
  cents?: boolean;
  size?: string;
  dimCents?: boolean;
}

export function formatBRL(n: number, cents = false): string {
  const abs = Math.abs(n);
  return abs.toLocaleString('pt-BR', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

const toneClass: Record<string, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  muted: 'text-muted-foreground',
};

export const MoneyValue = forwardRef<HTMLSpanElement, MoneyValueProps>(
  (
    {
      className,
      value = 0,
      signed = false,
      color = 'auto',
      cents = true,
      size,
      dimCents = true,
      style,
      ...props
    },
    ref,
  ) => {
    const sign = value < 0 ? '−' : signed ? '+' : '';

    let tone = '';
    if (color === 'auto') {
      tone = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
    } else if (color !== 'none') {
      tone = color;
    }

    const formatted = formatBRL(value, cents);
    // pt-BR uses comma as decimal separator
    const commaIdx = formatted.lastIndexOf(',');
    const intPart = commaIdx >= 0 ? formatted.slice(0, commaIdx) : formatted;
    const centPart = commaIdx >= 0 ? formatted.slice(commaIdx + 1) : null;

    return (
      <span
        ref={ref}
        className={cn(
          'font-mono font-semibold tabular-nums tracking-[-0.01em] whitespace-nowrap text-foreground',
          tone ? toneClass[tone] : '',
          className,
        )}
        style={size ? { fontSize: size, ...style } : style}
        {...props}
      >
        {sign}R$&nbsp;{intPart}
        {cents && centPart != null ? (
          dimCents ? (
            <span className="opacity-60 text-[0.78em]">,{centPart}</span>
          ) : (
            `,${centPart}`
          )
        ) : null}
      </span>
    );
  },
);

MoneyValue.displayName = 'MoneyValue';
