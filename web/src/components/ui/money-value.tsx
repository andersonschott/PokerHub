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

// cents={false} esconde os centavos de valores redondos — nunca arredonda
// centavos reais (R$ 4,50 não pode virar R$ 5).
export function hasCents(n: number): boolean {
  return Math.round(Math.abs(n) * 100) % 100 !== 0;
}

export function formatBRL(n: number, cents = false): string {
  const abs = Math.abs(n);
  const showCents = cents || hasCents(abs);
  return abs.toLocaleString('pt-BR', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
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

    const showCents = cents || hasCents(value);
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
        {showCents && centPart != null ? (
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
