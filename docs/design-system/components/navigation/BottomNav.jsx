import React from 'react';

/* PokerHub — BottomNav
   The product's own fixed bottom navigation (NOT a shadcn tab bar). 4–5
   destinations, ≥44px targets, iOS safe-area aware, active item in gold with
   optional badge dot. Render once per screen; pass the active key. */

const CSS = `
.ph-bottomnav{
  position:absolute;left:0;right:0;bottom:0;z-index:50;
  display:flex;align-items:stretch;
  background:color-mix(in oklab,var(--felt-850) 92%,transparent);
  border-top:1px solid var(--border);
  padding:6px 6px calc(6px + var(--safe-bottom,0px));
  backdrop-filter:saturate(1.2) blur(8px);
}
.ph-bottomnav--fixed{position:fixed;}
.ph-bottomnav__item{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  min-height:52px;padding:6px 2px;border:0;background:transparent;cursor:pointer;
  color:var(--muted-foreground);border-radius:var(--radius-md);position:relative;
  transition:color var(--dur-fast),background var(--dur-fast);
  text-decoration:none;
}
.ph-bottomnav__item:active{background:var(--secondary);}
.ph-bottomnav__item svg{width:22px;height:22px;}
.ph-bottomnav__item span{font-family:var(--font-display);font-size:10.5px;font-weight:600;letter-spacing:0.01em;}
.ph-bottomnav__item.is-active{color:var(--gold-400);}
.ph-bottomnav__item.is-active svg{stroke:var(--gold-400);}
.ph-bottomnav__dot{position:absolute;top:6px;right:calc(50% - 16px);width:8px;height:8px;border-radius:50%;background:var(--negative);border:1.5px solid var(--felt-850);}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-bottomnav-css')) {
  const s = document.createElement('style');
  s.id = 'ph-bottomnav-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function BottomNav({ items = [], active, onSelect, fixed = false, className = '', ...props }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) window.lucide.createIcons({ nameAttr: 'data-lucide', root: ref.current });
  }, [items, active]);
  const cls = ['ph-bottomnav', fixed ? 'ph-bottomnav--fixed' : '', className].filter(Boolean).join(' ');
  return (
    <nav ref={ref} className={cls} {...props}>
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <button
            key={it.key}
            className={`ph-bottomnav__item${isActive ? ' is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelect && onSelect(it.key)}
          >
            {it.dot ? <span className="ph-bottomnav__dot"></span> : null}
            <i data-lucide={it.icon}></i>
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
