import React from 'react';

/* PokerHub — Button
   shadcn-style button: gold primary for the single most important action,
   plus secondary / outline / ghost / destructive variants. Mono-friendly,
   ≥44px touch targets on `lg`. Optional Lucide icon by name. */

const CSS = `
.ph-btn{
  --_h:44px; --_px:16px; --_fs:15px;
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  height:var(--_h);padding:0 var(--_px);font-family:var(--font-display);
  font-size:var(--_fs);font-weight:600;letter-spacing:-0.01em;line-height:1;
  border-radius:var(--radius-md);border:1px solid transparent;cursor:pointer;
  white-space:nowrap;user-select:none;text-decoration:none;
  transition:transform var(--dur-fast) var(--ease-out),background var(--dur-fast),border-color var(--dur-fast),opacity var(--dur-fast);
}
.ph-btn:active{transform:scale(.97);}
.ph-btn:focus-visible{outline:2px solid var(--ring);outline-offset:2px;}
.ph-btn[disabled]{opacity:.45;pointer-events:none;}
.ph-btn svg{width:18px;height:18px;flex-shrink:0;}
.ph-btn--sm{--_h:36px;--_px:12px;--_fs:13px;border-radius:var(--radius-sm);}
.ph-btn--lg{--_h:52px;--_px:22px;--_fs:16px;}
.ph-btn--block{display:flex;width:100%;}
.ph-btn--primary{background:var(--primary);color:var(--primary-foreground);box-shadow:0 1px 0 oklch(1 0 0 / .08) inset;}
.ph-btn--primary:hover{background:var(--gold-600);}
.ph-btn--secondary{background:var(--secondary);color:var(--secondary-foreground);border-color:var(--border);}
.ph-btn--secondary:hover{background:var(--felt-700);}
.ph-btn--outline{background:transparent;color:var(--foreground);border-color:var(--border);}
.ph-btn--outline:hover{background:var(--secondary);}
.ph-btn--ghost{background:transparent;color:var(--muted-foreground);}
.ph-btn--ghost:hover{background:var(--secondary);color:var(--foreground);}
.ph-btn--destructive{background:var(--destructive);color:var(--destructive-foreground);}
.ph-btn--destructive:hover{filter:brightness(1.08);}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-button-css')) {
  const s = document.createElement('style');
  s.id = 'ph-button-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  iconRight,
  as = 'button',
  className = '',
  ...props
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) window.lucide.createIcons({ nameAttr: 'data-lucide', root: ref.current });
  });
  const Tag = as;
  const cls = [
    'ph-btn',
    `ph-btn--${variant}`,
    size !== 'md' ? `ph-btn--${size}` : '',
    block ? 'ph-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <Tag ref={ref} className={cls} {...props}>
      {icon ? <i data-lucide={icon}></i> : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <i data-lucide={iconRight}></i> : null}
    </Tag>
  );
}
