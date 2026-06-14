import React from 'react';

/* PokerHub — PodiumStat
   A podium place: medal-tinted tile with position, player and prize. Used in
   ranking podiums and the live timer's prize panel. */

const CSS = `
.ph-podium{
  display:flex;align-items:center;gap:12px;
  padding:12px 14px;border-radius:var(--radius-lg);
  background:var(--card);border:1px solid var(--border);
}
.ph-podium--1{background:linear-gradient(135deg,color-mix(in oklab,var(--podium-gold) 14%,var(--card)),var(--card));border-color:color-mix(in oklab,var(--podium-gold) 28%,transparent);}
.ph-podium--2{background:linear-gradient(135deg,color-mix(in oklab,var(--podium-silver) 12%,var(--card)),var(--card));border-color:color-mix(in oklab,var(--podium-silver) 22%,transparent);}
.ph-podium--3{background:linear-gradient(135deg,color-mix(in oklab,var(--podium-bronze) 12%,var(--card)),var(--card));border-color:color-mix(in oklab,var(--podium-bronze) 22%,transparent);}
.ph-podium__pos{
  width:34px;height:34px;flex-shrink:0;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--font-mono);font-weight:700;font-size:15px;
  background:var(--secondary);color:var(--foreground);
}
.ph-podium--1 .ph-podium__pos{background:var(--podium-gold);color:var(--primary-foreground);}
.ph-podium--2 .ph-podium__pos{background:var(--podium-silver);color:#1a1a1a;}
.ph-podium--3 .ph-podium__pos{background:var(--podium-bronze);color:#1a1a1a;}
.ph-podium__body{flex:1;min-width:0;}
.ph-podium__name{font-family:var(--font-display);font-weight:600;font-size:15px;color:var(--foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ph-podium__sub{font-size:12px;color:var(--muted-foreground);}
.ph-podium__prize{font-family:var(--font-mono);font-weight:700;font-size:15px;font-variant-numeric:tabular-nums;flex-shrink:0;}
.ph-podium--1 .ph-podium__prize{color:var(--gold-400);}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-podium-css')) {
  const s = document.createElement('style');
  s.id = 'ph-podium-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function PodiumStat({ position = 1, name, sub, prize, className = '', ...props }) {
  const cls = ['ph-podium', `ph-podium--${position}`, className].filter(Boolean).join(' ');
  return (
    <div className={cls} {...props}>
      <span className="ph-podium__pos">{position}</span>
      <span className="ph-podium__body">
        <span className="ph-podium__name">{name}</span>
        {sub ? <span className="ph-podium__sub">{sub}</span> : null}
      </span>
      {prize != null ? <span className="ph-podium__prize">{prize}</span> : null}
    </div>
  );
}
