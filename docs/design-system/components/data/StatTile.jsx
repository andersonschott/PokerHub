import React from 'react';

/* PokerHub — StatTile
   A compact metric tile: big mono value + small uppercase label, optional
   Lucide icon and tone. Used in stat grids (jogadores, prize pool, rebuys). */

const CSS = `
.ph-stattile{
  display:flex;flex-direction:column;gap:4px;
  background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);
  padding:14px;min-width:0;
}
.ph-stattile--center{align-items:center;text-align:center;}
.ph-stattile__icon{display:flex;color:var(--muted-foreground);}
.ph-stattile__icon svg{width:16px;height:16px;}
.ph-stattile__value{font-family:var(--font-mono);font-weight:700;font-size:var(--fs-stat,30px);line-height:1.05;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:var(--foreground);}
.ph-stattile--gold .ph-stattile__value{color:var(--gold-400);}
.ph-stattile--emerald .ph-stattile__value{color:var(--emerald-400);}
.ph-stattile--positive .ph-stattile__value{color:var(--positive);}
.ph-stattile--negative .ph-stattile__value{color:var(--negative);}
.ph-stattile__label{font-family:var(--font-display);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted-foreground);}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-stattile-css')) {
  const s = document.createElement('style');
  s.id = 'ph-stattile-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function StatTile({ value, label, icon, tone = 'default', center = false, valueSize, className = '', ...props }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) window.lucide.createIcons({ nameAttr: 'data-lucide', root: ref.current });
  });
  const cls = ['ph-stattile', tone !== 'default' ? `ph-stattile--${tone}` : '', center ? 'ph-stattile--center' : '', className].filter(Boolean).join(' ');
  return (
    <div ref={ref} className={cls} {...props}>
      {icon ? <span className="ph-stattile__icon"><i data-lucide={icon}></i></span> : null}
      <span className="ph-stattile__value" style={valueSize ? { fontSize: valueSize } : undefined}>{value}</span>
      <span className="ph-stattile__label">{label}</span>
    </div>
  );
}
