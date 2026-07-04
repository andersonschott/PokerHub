import React from 'react';

/* PokerHub — Badge
   Small status/category label. Tonal fills derived from semantic colors.
   Use for tournament status, payment status, type chips (Poker/Caixinha). */

const CSS = `
.ph-badge{
  display:inline-flex;align-items:center;gap:5px;
  font-family:var(--font-display);font-size:11px;font-weight:600;line-height:1;
  letter-spacing:0.02em;padding:5px 9px;border-radius:var(--radius-sm);
  border:1px solid transparent;white-space:nowrap;
}
.ph-badge svg{width:13px;height:13px;}
.ph-badge--neutral{background:var(--secondary);color:var(--muted-foreground);border-color:var(--border);}
.ph-badge--gold{background:color-mix(in oklab,var(--gold-500) 16%,var(--card));color:var(--gold-400);border-color:color-mix(in oklab,var(--gold-500) 28%,transparent);}
.ph-badge--emerald{background:color-mix(in oklab,var(--emerald-500) 16%,var(--card));color:var(--emerald-400);border-color:color-mix(in oklab,var(--emerald-500) 28%,transparent);}
.ph-badge--positive{background:color-mix(in oklab,var(--positive) 16%,var(--card));color:var(--positive);border-color:color-mix(in oklab,var(--positive) 28%,transparent);}
.ph-badge--negative{background:color-mix(in oklab,var(--negative) 16%,var(--card));color:var(--negative);border-color:color-mix(in oklab,var(--negative) 28%,transparent);}
.ph-badge--warning{background:color-mix(in oklab,var(--warning) 16%,var(--card));color:var(--warning);border-color:color-mix(in oklab,var(--warning) 28%,transparent);}
.ph-badge--solid{background:var(--primary);color:var(--primary-foreground);border-color:transparent;}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-badge-css')) {
  const s = document.createElement('style');
  s.id = 'ph-badge-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Badge({ children, tone = 'neutral', icon, className = '', ...props }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) window.lucide.createIcons({ nameAttr: 'data-lucide', root: ref.current });
  });
  const cls = ['ph-badge', `ph-badge--${tone}`, className].filter(Boolean).join(' ');
  return (
    <span ref={ref} className={cls} {...props}>
      {icon ? <i data-lucide={icon}></i> : null}
      {children}
    </span>
  );
}
