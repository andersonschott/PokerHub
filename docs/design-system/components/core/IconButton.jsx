import React from 'react';

/* PokerHub — IconButton
   Square, icon-only control (≥44px). For toolbar/header actions and table
   row controls. Lucide icon by name. */

const CSS = `
.ph-iconbtn{
  --_s:44px;
  display:inline-flex;align-items:center;justify-content:center;
  width:var(--_s);height:var(--_s);border-radius:var(--radius-md);
  border:1px solid transparent;cursor:pointer;background:transparent;color:var(--foreground);
  transition:transform var(--dur-fast) var(--ease-out),background var(--dur-fast),color var(--dur-fast),border-color var(--dur-fast);
}
.ph-iconbtn:active{transform:scale(.92);}
.ph-iconbtn:focus-visible{outline:2px solid var(--ring);outline-offset:2px;}
.ph-iconbtn[disabled]{opacity:.4;pointer-events:none;}
.ph-iconbtn svg{width:20px;height:20px;}
.ph-iconbtn--sm{--_s:36px;}.ph-iconbtn--sm svg{width:18px;height:18px;}
.ph-iconbtn--solid{background:var(--secondary);border-color:var(--border);}
.ph-iconbtn--solid:hover{background:var(--felt-700);}
.ph-iconbtn--ghost:hover{background:var(--secondary);}
.ph-iconbtn--gold{color:var(--gold-400);}
.ph-iconbtn--gold.ph-iconbtn--solid{background:color-mix(in oklab,var(--gold-500) 16%,var(--card));border-color:color-mix(in oklab,var(--gold-500) 30%,var(--border));}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-iconbutton-css')) {
  const s = document.createElement('style');
  s.id = 'ph-iconbutton-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function IconButton({ icon, variant = 'ghost', size = 'md', gold = false, className = '', ...props }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) window.lucide.createIcons({ nameAttr: 'data-lucide', root: ref.current });
  });
  const cls = [
    'ph-iconbtn',
    `ph-iconbtn--${variant}`,
    size === 'sm' ? 'ph-iconbtn--sm' : '',
    gold ? 'ph-iconbtn--gold' : '',
    className,
  ].filter(Boolean).join(' ');
  return <button ref={ref} className={cls} {...props}><i data-lucide={icon}></i></button>;
}
