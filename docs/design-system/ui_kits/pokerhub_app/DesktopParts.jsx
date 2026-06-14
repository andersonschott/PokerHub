/* PokerHub UI kit — Desktop parts: collapsible Sidebar, Topbar, Standings table.
   Reuses design-system components; mirrors the mobile data + felt/gold language. */

/* React-owned inline icons (NEVER use lucide <i> + createIcons in a container
   that re-renders/reorders — it mutates the DOM and crashes reconciliation). */
const DK_ICONS = {
  'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'timer': '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'wallet': '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'chevrons-up-down': '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  'chevrons-left': '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>',
  'chevrons-right': '<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>',
  'calendar-plus': '<path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="19" x2="19" y1="16" y2="22"/><line x1="16" x2="22" y1="19" y2="19"/>',
  'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  'smartphone': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'check-check': '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
  'history': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  'piggy-bank': '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/>',
  'settings-2': '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
  'pause': '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  'skip-back': '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>',
  'skip-forward': '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
  'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'minus': '<path d="M5 12h14"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  'trash-2': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  'pencil': '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  'trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  'repeat': '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  'skull': '<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  'megaphone': '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  'key-round': '<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  'moon-star': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  'tv': '<rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>',
  'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  'undo-2': '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>',
  'calendar': '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  'bell-ring': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/>',
};
function DkIcon({ name, size = 20, style }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} dangerouslySetInnerHTML={{ __html: DK_ICONS[name] || '' }} />;
}

function DkSidebar({ collapsed, onToggle, active, onNav, activeLeague, onOpenSwitcher }) {
  /* Active state via class (not inline style mutation) — repaints reliably. */
  React.useEffect(() => {
    if (document.getElementById('dk-nav-css')) return;
    const s = document.createElement('style');
    s.id = 'dk-nav-css';
    s.textContent = `
      .dk-nav-btn{position:relative;display:flex;align-items:center;gap:12px;border-radius:var(--radius-md);border:0;cursor:pointer;background:transparent;color:var(--muted-foreground);transition:background var(--dur-fast),color var(--dur-fast);}
      .dk-nav-btn--on{background:color-mix(in oklab,var(--gold-500) 14%,transparent);color:var(--gold-400);}
    `;
    document.head.appendChild(s);
  }, []);
  const NAV = [
    { key: 'inicio',  label: 'Início',        icon: 'home' },
    { key: 'torneio', label: 'Torneio ativo', icon: 'timer', dot: activeLeague.live },
    { key: 'ranking', label: 'Ranking',       icon: 'trending-up' },
    { key: 'debitos', label: 'Débitos',       icon: 'wallet' },
    { key: 'historico', label: 'Realizados',  icon: 'history' },
  ];
  const NAV_LIGA = [
    { key: 'jogadores', label: 'Jogadores',     icon: 'users' },
    { key: 'caixinha',  label: 'Caixinha',      icon: 'piggy-bank' },
    { key: 'admin',     label: 'Administração', icon: 'settings-2' },
  ];
  const w = collapsed ? 76 : 248;
  const suitRed = activeLeague.suit === '♥' || activeLeague.suit === '♦';
  return (
    <aside style={{ width: w, flexShrink: 0, height: '100vh', display: 'flex', flexDirection: 'column', gap: 6,
      padding: collapsed ? '20px 12px' : '20px 16px', background: 'color-mix(in oklab, var(--felt-850) 80%, transparent)',
      borderRight: '1px solid var(--border)', transition: 'width var(--dur-base) var(--ease-out)' }}>
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 16px', minHeight: 40 }}>
        <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: 'linear-gradient(160deg,var(--gold-400),var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-foreground)', fontSize: 18 }}>♠</div>
        {!collapsed ? <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>PokerHub</span> : null}
      </div>

      {/* League switcher */}
      <button onClick={onOpenSwitcher} title="Trocar de liga" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '8px' : '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--foreground)', marginBottom: 8, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: suitRed ? 'var(--suit-red)' : 'var(--foreground)' }}>{activeLeague.suit}</div>
        {!collapsed ? (
          <React.Fragment>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeLeague.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>{activeLeague.season}</div>
            </div>
            <DkIcon name="chevrons-up-down" size={15} style={{ color: 'var(--muted-foreground)' }} />
          </React.Fragment>
        ) : null}
      </button>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.concat([{ section: 'Liga' }], NAV_LIGA).map((it) => {
          if (it.section) {
            return collapsed
              ? <div key="sec" style={{ height: 1, background: 'var(--border)', margin: '10px 8px' }}></div>
              : <div key="sec" style={{ padding: '14px 12px 5px', fontFamily: 'var(--font-display)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>{it.section}</div>;
          }
          const on = it.key === active;
          return (
            <button key={it.key} onClick={() => onNav(it.key)} title={it.label}
              className={'dk-nav-btn' + (on ? ' dk-nav-btn--on' : '')}
              style={{ padding: collapsed ? '11px' : '10px 12px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <span style={{ position: 'relative', display: 'flex' }}>
                <DkIcon name={it.icon} size={20} />
                {it.dot ? <span style={{ position: 'absolute', top: -2, right: -3, width: 7, height: 7, borderRadius: '50%', background: 'var(--positive)', border: '1.5px solid var(--felt-850)' }}></span> : null}
              </span>
              {!collapsed ? <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>{it.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }}></div>

      {/* Collapse toggle */}
      <button onClick={onToggle} title={collapsed ? 'Expandir' : 'Recolher'}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '11px' : '10px 12px', borderRadius: 'var(--radius-md)', border: 0, cursor: 'pointer', background: 'transparent', color: 'var(--muted-foreground)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <DkIcon name={collapsed ? 'chevrons-right' : 'chevrons-left'} size={20} />
        {!collapsed ? <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>Recolher</span> : null}
      </button>

      {/* User */}
      <button onClick={() => onNav('perfil')} title="Perfil" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '6px' : '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--foreground)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        {(() => { const { Avatar } = window.PokerHubDesignSystem_b95f9b; return <Avatar name="Você Org" size={collapsed ? 30 : 32} badgeIcon="crown" badgeGold />; })()}
        {!collapsed ? <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>Você</div><div style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>Organizador</div></div> : null}
      </button>
    </aside>
  );
}

/* Generic centered modal — the desktop equivalent of the mobile bottom-sheet. */
function DkModal({ title, sub, width = 480, onClose, children, footer }) {
  const { IconButton } = window.PokerHubDesignSystem_b95f9b;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'oklch(0 0 0 / 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width, maxWidth: '94vw', maxHeight: '86vh', overflowY: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>{title}</div>
            {sub ? <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 2 }}>{sub}</div> : null}
          </div>
          <IconButton icon="x" onClick={onClose} />
        </div>
        {children}
        {footer ? <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>{footer}</div> : null}
      </div>
    </div>
  );
}

/* Standings table — desktop ranking. `compact` drops the per-place + torneios
   columns so it fits the narrower dashboard column without overflowing. */
function DkStandings({ onRow, compact }) {
  const { MoneyValue, Avatar } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const head = (txt, align = 'left', w) => <th style={{ textAlign: align, padding: '0 12px 10px', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)', width: w, whiteSpace: 'nowrap' }}>{txt}</th>;
  const cell = (v, extra = {}) => <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13.5, ...extra }}>{v}</td>;
  const pc = (n) => n <= 3 ? ['var(--podium-gold)', 'var(--podium-silver)', 'var(--podium-bronze)'][n - 1] : 'var(--muted-foreground)';
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: compact ? 0 : 540 }}>
        <thead><tr>
          {head('#', 'center', 36)}{head('Jogador')}
          {!compact ? <React.Fragment>{head('Torn.', 'center')}{head('1º', 'center')}{head('2º', 'center')}{head('3º', 'center')}{head('ITM', 'center')}</React.Fragment> : null}
          {head('ROI', 'center')}{head('Lucro', 'right')}
        </tr></thead>
        <tbody>
          {D.ranking.map((p) => (
            <tr key={p.nick} onClick={() => onRow(p)} style={{ cursor: 'pointer', borderTop: '1px solid var(--border)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--secondary)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <td style={{ textAlign: 'center', padding: '12px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: pc(p.position) }}>{p.position}</td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={p.name} size={compact ? 28 : 32} podium={p.position <= 3 ? ['gold', 'silver', 'bronze'][p.position - 1] : undefined} />
                  <div style={{ minWidth: 0 }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>@{p.nick}</div></div>
                </div>
              </td>
              {!compact ? <React.Fragment>
                {cell(p.tournaments, { color: 'var(--muted-foreground)' })}
                {cell(p.wins, { fontWeight: 700 })}
                {cell(p.second)}
                {cell(p.third)}
                {cell(`${p.itm}%`)}
              </React.Fragment> : null}
              {cell(`${p.roi >= 0 ? '+' : ''}${p.roi.toFixed(0)}%`, { fontWeight: 700, color: p.roi >= 0 ? 'var(--positive)' : 'var(--negative)' })}
              <td style={{ textAlign: 'right', padding: '10px 12px', whiteSpace: 'nowrap' }}><MoneyValue value={p.profit} signed size="14px" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { DkSidebar, DkStandings, DkIcon, DkModal });
