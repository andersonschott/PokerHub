import React from 'react';

/* PokerHub — Card
   The felt surface, one step up the chip ramp with a hairline border. Optional
   accent tint + glow for featured/live content. Composes header/body freely. */

const CSS = `
.ph-card{
  background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);
  padding:var(--pad-card,16px);color:var(--card-foreground);position:relative;
}
.ph-card--pad-lg{padding:20px;}
.ph-card--pad-none{padding:0;}
.ph-card--interactive{cursor:pointer;transition:transform var(--dur-fast) var(--ease-out),border-color var(--dur-fast),box-shadow var(--dur-fast);}
.ph-card--interactive:hover{border-color:var(--felt-600);box-shadow:var(--shadow-md);}
.ph-card--interactive:active{transform:scale(.99);}
.ph-card--live{background:linear-gradient(150deg,color-mix(in oklab,var(--emerald-500) 12%,var(--card)),var(--card));border-color:color-mix(in oklab,var(--emerald-500) 30%,transparent);box-shadow:var(--glow-emerald);}
.ph-card--gold{background:linear-gradient(150deg,color-mix(in oklab,var(--gold-500) 12%,var(--card)),var(--card));border-color:color-mix(in oklab,var(--gold-500) 28%,transparent);}
.ph-card--flat{background:var(--secondary);}
.ph-card__head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}
.ph-card__title{font-family:var(--font-display);font-weight:700;font-size:17px;letter-spacing:-0.01em;color:var(--foreground);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ph-card__action{flex-shrink:0;display:flex;align-items:center;}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-card-css')) {
  const s = document.createElement('style');
  s.id = 'ph-card-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Card({ children, variant = 'default', pad = 'md', interactive = false, title, action, className = '', ...props }) {
  const cls = [
    'ph-card',
    variant !== 'default' ? `ph-card--${variant}` : '',
    pad === 'lg' ? 'ph-card--pad-lg' : pad === 'none' ? 'ph-card--pad-none' : '',
    interactive ? 'ph-card--interactive' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div className={cls} {...props}>
      {title || action ? (
        <div className="ph-card__head">
          {title ? <span className="ph-card__title">{title}</span> : <span style={{ flex: 1 }}></span>}
          {action ? <span className="ph-card__action">{action}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
