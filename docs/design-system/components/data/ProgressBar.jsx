import React from 'react';

/* PokerHub — ProgressBar
   Thin rounded track for level progress, ITM rate, blind-level elapsed.
   Gold by default; tone-able. */

const CSS = `
.ph-progress{width:100%;height:8px;border-radius:999px;background:var(--secondary);overflow:hidden;}
.ph-progress--lg{height:12px;}
.ph-progress__fill{height:100%;border-radius:999px;background:var(--primary);transition:width var(--dur-slow) var(--ease-out);}
.ph-progress--emerald .ph-progress__fill{background:var(--emerald-500);}
.ph-progress--positive .ph-progress__fill{background:var(--positive);}
.ph-progress--warning .ph-progress__fill{background:var(--warning);}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-progress-css')) {
  const s = document.createElement('style');
  s.id = 'ph-progress-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function ProgressBar({ value = 0, max = 100, tone = 'gold', size = 'md', className = '', ...props }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const cls = ['ph-progress', tone !== 'gold' ? `ph-progress--${tone}` : '', size === 'lg' ? 'ph-progress--lg' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="progressbar" aria-valuenow={value} aria-valuemax={max} {...props}>
      <div className="ph-progress__fill" style={{ width: `${pct}%` }}></div>
    </div>
  );
}
