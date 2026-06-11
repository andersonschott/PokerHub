import React from 'react';

/* PokerHub — Sheet (bottom-sheet)
   The product's primary modal surface. Slides up from the bottom with a grab
   handle; holds confirmations and the organizer's table actions (check-in,
   rebuy, eliminar). Use this — never a tiny center dialog — on mobile. */

const CSS = `
.ph-sheet-backdrop{
  position:absolute;inset:0;z-index:60;background:oklch(0 0 0 / .55);
  display:flex;align-items:flex-end;justify-content:center;
  animation:ph-fade-in var(--dur-base) var(--ease-out);
}
.ph-sheet-backdrop--fixed{position:fixed;}
.ph-sheet{
  width:100%;max-width:520px;background:var(--felt-800);
  border-top-left-radius:var(--radius-xl);border-top-right-radius:var(--radius-xl);
  border:1px solid var(--border);border-bottom:0;
  box-shadow:var(--shadow-sheet);
  padding:8px 18px calc(20px + var(--safe-bottom,0px));
  animation:ph-sheet-up var(--dur-slow) var(--ease-out);
  max-height:88%;overflow-y:auto;
}
.ph-sheet__handle{width:40px;height:4px;border-radius:999px;background:var(--felt-600);margin:6px auto 14px;}
.ph-sheet__head{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
.ph-sheet__title{font-family:var(--font-display);font-weight:700;font-size:19px;letter-spacing:-0.01em;color:var(--foreground);flex:1;}
.ph-sheet__sub{font-size:13px;color:var(--muted-foreground);margin-top:2px;}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-sheet-css')) {
  const s = document.createElement('style');
  s.id = 'ph-sheet-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Sheet({ open = true, onClose, title, subtitle, leading, children, fixed = false, className = '', ...props }) {
  if (!open) return null;
  const onBackdrop = (e) => { if (e.target === e.currentTarget && onClose) onClose(); };
  return (
    <div className={`ph-sheet-backdrop${fixed ? ' ph-sheet-backdrop--fixed' : ''}`} onClick={onBackdrop}>
      <div className={['ph-sheet', className].filter(Boolean).join(' ')} role="dialog" aria-modal="true" {...props}>
        <div className="ph-sheet__handle"></div>
        {(title || leading) ? (
          <div className="ph-sheet__head">
            {leading}
            <div style={{ flex: 1, minWidth: 0 }}>
              {title ? <div className="ph-sheet__title">{title}</div> : null}
              {subtitle ? <div className="ph-sheet__sub">{subtitle}</div> : null}
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
