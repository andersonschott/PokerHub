import React from 'react';

/* PokerHub — StatusPill
   Live tournament status with a pulsing dot. AO VIVO (emerald), PAUSADO
   (amber), AGENDADO (neutral), FINALIZADO (gold). Unmistakable at a glance. */

const CSS = `
.ph-statuspill{
  display:inline-flex;align-items:center;gap:8px;
  font-family:var(--font-display);font-size:12px;font-weight:600;line-height:1;
  letter-spacing:0.06em;text-transform:uppercase;padding:7px 13px;
  border-radius:var(--radius-pill);border:1px solid transparent;white-space:nowrap;
}
.ph-statuspill .ph-dot{width:8px;height:8px;border-radius:50%;background:currentColor;flex-shrink:0;}
.ph-statuspill--live{background:color-mix(in oklab,var(--positive) 15%,var(--card));color:var(--positive);border-color:color-mix(in oklab,var(--positive) 30%,transparent);}
.ph-statuspill--live .ph-dot{animation:ph-pulse 1.4s var(--ease-out) infinite;}
.ph-statuspill--paused{background:color-mix(in oklab,var(--warning) 15%,var(--card));color:var(--warning);border-color:color-mix(in oklab,var(--warning) 30%,transparent);}
.ph-statuspill--scheduled{background:var(--secondary);color:var(--muted-foreground);border-color:var(--border);}
.ph-statuspill--finished{background:color-mix(in oklab,var(--gold-500) 15%,var(--card));color:var(--gold-400);border-color:color-mix(in oklab,var(--gold-500) 30%,transparent);}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-statuspill-css')) {
  const s = document.createElement('style');
  s.id = 'ph-statuspill-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const LABELS = { live: 'Ao vivo', paused: 'Pausado', scheduled: 'Agendado', finished: 'Finalizado' };

export function StatusPill({ status = 'live', label, dot = true, className = '', ...props }) {
  const cls = ['ph-statuspill', `ph-statuspill--${status}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...props}>
      {dot ? <span className="ph-dot"></span> : null}
      {label || LABELS[status]}
    </span>
  );
}
