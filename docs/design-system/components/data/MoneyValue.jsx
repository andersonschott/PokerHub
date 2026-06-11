import React from 'react';

/* PokerHub — MoneyValue
   The canonical way to render BRL. Mono, tabular, signed and colored by
   convention (green positive / red negative). Never render money any other way. */

const CSS = `
.ph-money-v{font-family:var(--font-mono);font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-0.01em;color:var(--foreground);white-space:nowrap;}
.ph-money-v--positive{color:var(--money-positive);}
.ph-money-v--negative{color:var(--money-negative);}
.ph-money-v--muted{color:var(--muted-foreground);}
.ph-money-v__cents{opacity:.6;font-size:.78em;}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-moneyvalue-css')) {
  const s = document.createElement('style');
  s.id = 'ph-moneyvalue-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function formatBRL(n, cents) {
  const abs = Math.abs(n);
  return abs.toLocaleString('pt-BR', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

export function MoneyValue({
  value = 0,
  signed = false,
  color = 'auto',
  cents = true,
  size,
  dimCents = true,
  className = '',
  ...props
}) {
  const sign = value < 0 ? '−' : signed ? '+' : '';
  let tone = '';
  if (color === 'auto') tone = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  else if (color !== 'none') tone = color;
  const formatted = formatBRL(value, cents);
  const [intPart, centPart] = formatted.split(',');
  const cls = ['ph-money-v', tone ? `ph-money-v--${tone}` : '', className].filter(Boolean).join(' ');
  const style = size ? { fontSize: size } : undefined;
  return (
    <span className={cls} style={style} {...props}>
      {sign}R$&nbsp;{intPart}
      {cents && centPart ? (
        dimCents ? <span className="ph-money-v__cents">,{centPart}</span> : `,${centPart}`
      ) : null}
    </span>
  );
}
