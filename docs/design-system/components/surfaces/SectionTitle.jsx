import React from 'react';

/* PokerHub — SectionTitle
   Tiny uppercase label that separates groups on a screen, with optional
   trailing action (e.g. "Ver tudo"). */

const CSS = `
.ph-sectiontitle{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;}
.ph-sectiontitle__label{font-family:var(--font-display);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted-foreground);display:inline-flex;align-items:center;gap:6px;}
.ph-sectiontitle__label svg{width:13px;height:13px;}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-sectiontitle-css')) {
  const s = document.createElement('style');
  s.id = 'ph-sectiontitle-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function SectionTitle({ children, icon, action, className = '', ...props }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) window.lucide.createIcons({ nameAttr: 'data-lucide', root: ref.current });
  });
  const cls = ['ph-sectiontitle', className].filter(Boolean).join(' ');
  return (
    <div ref={ref} className={cls} {...props}>
      <span className="ph-sectiontitle__label">
        {icon ? <i data-lucide={icon}></i> : null}
        {children}
      </span>
      {action}
    </div>
  );
}
