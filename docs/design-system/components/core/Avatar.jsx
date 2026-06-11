import React from 'react';

/* PokerHub — Avatar
   Player avatar: initials on a felt chip, optional podium ring (gold/silver/
   bronze) and a small corner badge (e.g. position or crown for organizer). */

const CSS = `
.ph-avatar{position:relative;display:inline-flex;flex-shrink:0;}
.ph-avatar__disc{
  width:var(--_s,44px);height:var(--_s,44px);border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-family:var(--font-display);font-weight:700;letter-spacing:-0.02em;
  color:var(--card-foreground);background:linear-gradient(155deg,var(--felt-700),var(--felt-850));
  font-size:calc(var(--_s,44px) * .38);overflow:hidden;
}
.ph-avatar__disc img{width:100%;height:100%;object-fit:cover;}
.ph-avatar--ring .ph-avatar__disc{box-shadow:0 0 0 2px var(--background),0 0 0 4px var(--_ring,var(--border));}
.ph-avatar__badge{
  position:absolute;right:-3px;bottom:-3px;min-width:18px;height:18px;padding:0 4px;
  border-radius:9px;background:var(--card);border:1px solid var(--border);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--foreground);
}
.ph-avatar__badge svg{width:11px;height:11px;}
.ph-avatar__badge--gold{background:var(--podium-gold);color:var(--primary-foreground);border-color:transparent;}
`;

if (typeof document !== 'undefined' && !document.getElementById('ph-avatar-css')) {
  const s = document.createElement('style');
  s.id = 'ph-avatar-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const RING = { gold: 'var(--podium-gold)', silver: 'var(--podium-silver)', bronze: 'var(--podium-bronze)' };

export function Avatar({ name = '', src, size = 44, podium, badge, badgeIcon, badgeGold = false, className = '', ...props }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (window.lucide && ref.current) window.lucide.createIcons({ nameAttr: 'data-lucide', root: ref.current });
  });
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const cls = ['ph-avatar', podium ? 'ph-avatar--ring' : '', className].filter(Boolean).join(' ');
  const style = { '--_s': `${size}px`, ...(podium ? { '--_ring': RING[podium] } : {}) };
  return (
    <span ref={ref} className={cls} style={style} {...props}>
      <span className="ph-avatar__disc">{src ? <img src={src} alt={name} /> : initials}</span>
      {badge != null || badgeIcon ? (
        <span className={`ph-avatar__badge${badgeGold ? ' ph-avatar__badge--gold' : ''}`}>
          {badgeIcon ? <i data-lucide={badgeIcon}></i> : badge}
        </span>
      ) : null}
    </span>
  );
}
