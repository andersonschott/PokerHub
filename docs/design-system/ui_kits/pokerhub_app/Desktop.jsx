/* PokerHub UI kit — Desktop app shell + dashboard views.
   Collapsible sidebar (DesktopParts) + main content. Reuses DS components. */

function DkStat({ icon, value, label, tone }) {
  const { StatTile } = window.PokerHubDesignSystem_b95f9b;
  return <StatTile icon={icon} value={value} label={label} tone={tone} />;
}

function DkSectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '0 0 12px' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{children}</span>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </div>
  );
}

/* ---- Live tournament hero (wide) -------------------------------------- */
function DkHero({ go, onTv }) {
  const { Card, Button, StatusPill, MoneyValue, ProgressBar } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA; const t = D.tournament;
  if (!D.league.live) {
    return (
      <Card pad="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '14px 6px' }}>
          <div style={{ width: 60, height: 60, flexShrink: 0, borderRadius: 16, background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}><window.DkIcon name="calendar-plus" size={28} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>Nenhum torneio em andamento</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted-foreground)', marginTop: 3 }}>Crie o próximo torneio a partir de um modelo e abra o check-in para a galera.</div>
          </div>
          <Button variant="primary" icon="plus" onClick={() => go('wizard')}>Criar torneio</Button>
        </div>
      </Card>
    );
  }
  return (
    <Card variant="live" pad="lg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{D.league.liveName || t.name}</span>
          <StatusPill status="live" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button variant="primary" icon="settings-2" onClick={() => go('torneio')}>Operar mesa</Button>
          <Button variant="secondary" icon="tv" onClick={onTv}>Assistir</Button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 24, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 72, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 0.95 }}>12:43</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>{t.levelLabel} · restante</div>
          <div style={{ marginTop: 12, maxWidth: 240 }}><ProgressBar value={Math.round((1 - t.secondsRemaining / t.levelSeconds) * 100)} tone="emerald" /></div>
        </div>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>Blinds atuais</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 34, fontWeight: 700, color: 'var(--gold-400)' }}>{t.sb}/{t.bb}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>ante {t.ante} · próx {t.nextSb}/{t.nextBb}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 20 }}>{t.remaining}/{t.players}</div><div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>jogadores na mesa</div></div>
          <div><MoneyValue value={t.prizePool} cents={false} color="none" size="20px" /><div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>prize pool</div></div>
        </div>
      </div>
    </Card>
  );
}

/* ---- Right rail: próximos + acerto ------------------------------------ */
function DkRightRail({ go }) {
  const { Card, Badge, MoneyValue, StatusPill } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA; const S = D.settlement;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <DkSectionTitle action={<button onClick={() => go('torneio')} style={{ border: 0, background: 'transparent', color: 'var(--gold-400)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap' }}>Ver tudo</button>}>Próximos torneios</DkSectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {D.upcoming.map((u, i) => (
            <Card key={i} interactive pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                    {u.status === 'live' && D.league.live ? <StatusPill status="live" dot /> : null}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{u.when} · {u.confirmed} confirmados</div>
                </div>
                <Badge tone="neutral">R$ {u.buyIn}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <DkSectionTitle action={<button onClick={() => go('debitos')} style={{ border: 0, background: 'transparent', color: 'var(--gold-400)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5 }}>Acertar</button>}>Acerto rápido</DkSectionTitle>
        <Card variant={S.netBalance >= 0 ? 'live' : 'default'} pad="md">
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>Saldo líquido</div>
          <MoneyValue value={S.netBalance} signed size="30px" />
          <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div><div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>A pagar</div><MoneyValue value={-S.debts.filter(d => d.status !== 'paid').reduce((a, d) => a + d.amount, 0)} size="14px" /></div>
            <div><div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>A receber</div><MoneyValue value={S.credits.reduce((a, c) => a + c.amount, 0)} signed size="14px" /></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---- Views ------------------------------------------------------------ */
function DkInicio({ go, onRow, onTv }) {
  const { Card } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA; const t = D.tournament;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <DkHero go={go} onTv={onTv} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <DkStat icon="users" value={`${t.remaining}/${t.players}`} label="Jogadores" />
        <DkStat icon="trophy" value={<window.PHMoney value={t.prizePool} />} label="Prize pool" tone="emerald" />
        <DkStat icon="repeat" value={t.rebuys} label="Rebuys" />
        <DkStat icon="trending-up" value={`${D.season.played}/${D.season.total}`} label="Temporada" tone="gold" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(248px, 1fr)', gap: 20, alignItems: 'start' }}>
        <Card pad="md">
          <DkSectionTitle action={<button onClick={() => go('ranking')} style={{ border: 0, background: 'transparent', color: 'var(--gold-400)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap' }}>Ranking completo</button>}>Classificação</DkSectionTitle>
          <window.DkStandings onRow={onRow} compact />
        </Card>
        <DkRightRail go={go} />
      </div>
    </div>
  );
}

function DkRanking({ onRow }) {
  const { Card, MoneyValue, Avatar } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const top = D.ranking.slice(0, 3);
  const order = [top[1], top[0], top[2]];
  const meta = { 1: { h: 96, t: 'var(--gold-500)', g: 'var(--glow-gold)' }, 2: { h: 76, t: 'oklch(0.78 0.02 250)', g: 'none' }, 3: { h: 64, t: 'oklch(0.62 0.08 60)', g: 'none' } };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card pad="lg">
        <DkSectionTitle>Pódio · {D.season.name}</DkSectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'end', gap: 16, maxWidth: 560, margin: '0 auto' }}>
          {order.map((p) => { const m = meta[p.position]; return (
            <div key={p.position} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Avatar name={p.name} size={p.position === 1 ? 56 : 46} podium={['gold', 'silver', 'bronze'][p.position - 1]} badge={String(p.position)} badgeGold={p.position === 1} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{p.name.split(' ')[0]}</div>
              <MoneyValue value={p.profit} signed size="13px" />
              <div style={{ width: '100%', height: m.h, borderRadius: '12px 12px 0 0', marginTop: 2, background: `linear-gradient(180deg, color-mix(in oklch, ${m.t} 26%, var(--card)), var(--card))`, border: '1px solid var(--border)', borderBottom: 0, boxShadow: m.g, display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: p.position === 1 ? 28 : 22, color: m.t }}>{p.position}º</span>
              </div>
            </div>
          ); })}
        </div>
      </Card>
      <Card pad="md">
        <DkSectionTitle>Classificação geral</DkSectionTitle>
        <window.DkStandings onRow={onRow} />
      </Card>
    </div>
  );
}

function DkDebitos() {
  const { Card, MoneyValue, Avatar, Badge, Button } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA; const S = D.settlement;
  const badge = (s) => s === 'pending' ? <Badge tone="warning">Pendente</Badge> : s === 'paid' ? <Badge tone="neutral" icon="clock">Aguardando</Badge> : <Badge tone="positive" icon="check-check">Confirmado</Badge>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
      <div>
        <DkSectionTitle>A pagar · {S.debts.length}</DkSectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {S.debts.map((d) => (
            <Card key={d.id} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={d.to} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5 }}>{d.to}</div><div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{d.pix}</div></div>
                <div style={{ textAlign: 'right' }}><MoneyValue value={-d.amount} size="16px" /><div style={{ marginTop: 4 }}>{badge(d.status)}</div></div>
                {d.status === 'pending' ? <Button variant="primary" icon="check" size="sm">Pago</Button> : null}
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <DkSectionTitle>A receber · {S.credits.length}</DkSectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {S.credits.map((c) => (
            <Card key={c.id} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={c.from} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5 }}>{c.from}</div><div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{c.type}</div></div>
                <div style={{ textAlign: 'right' }}><MoneyValue value={c.amount} signed size="16px" /><div style={{ marginTop: 4 }}>{badge(c.status)}</div></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function DkPlayers() {
  const { Card, Avatar, MoneyValue } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  return (
    <div>
      <DkSectionTitle>{D.league.members} jogadores · {D.league.name}</DkSectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {D.ranking.map((p) => (
          <Card key={p.nick} interactive pad="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={p.name} size={42} podium={p.position <= 3 ? ['gold', 'silver', 'bronze'][p.position - 1] : undefined} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5 }}>{p.name}</div><div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{p.wins} vitórias · {p.itm}% ITM</div></div>
              <MoneyValue value={p.profit} signed size="14px" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---- Switcher overlay + player modal ---------------------------------- */
function DkSwitcher({ onClose, onPick }) {
  const D = window.PH_DATA;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'oklch(0 0 0 / 0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: '76px 0 0 16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 300, background: 'var(--popover, var(--card))', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 8, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '8px 10px 6px', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>Trocar de liga</div>
        {D.leagues.map((lg) => {
          const active = lg.id === D.league.id; const suitRed = lg.suit === '♥' || lg.suit === '♦';
          return (
            <button key={lg.id} onClick={() => onPick(lg)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 'var(--radius-md)', border: 0, background: active ? 'var(--secondary)' : 'transparent', cursor: 'pointer', color: 'var(--foreground)', textAlign: 'left' }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--secondary)'; }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: suitRed ? 'var(--suit-red)' : 'var(--foreground)' }}>{lg.suit}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lg.name}</div><div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{lg.role === 'organizer' ? 'Organizo' : 'Participo'} · {lg.members} jog.</div></div>
              {lg.live ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--positive)', flexShrink: 0 }}></span> : null}
              {active ? <window.DkIcon name="check" size={16} style={{ color: 'var(--gold-400)' }} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DkPlayerModal({ player, onClose }) {
  const { MoneyValue, Avatar, ProgressBar, IconButton, StatTile } = window.PokerHubDesignSystem_b95f9b;
  const p = player; const roiPos = p.roi >= 0;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'oklch(0 0 0 / 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxHeight: '86vh', overflowY: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Avatar name={p.name} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>{p.name}</div><div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>@{p.nick} · {p.tournaments} torneios</div></div>
          <IconButton icon="x" onClick={onClose} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          <StatTile icon="trophy" value={p.wins} label="Vitórias" tone="gold" center />
          <StatTile icon="target" value={`${p.itm}%`} label="ITM" center />
          <StatTile icon="trending-up" value={<MoneyValue value={p.profit} signed cents={false} size="18px" />} label="Lucro" tone={p.profit >= 0 ? 'positive' : 'negative'} center />
        </div>
        <div style={{ padding: 14, borderRadius: 'var(--radius-md)', background: roiPos ? 'color-mix(in oklab,var(--gold-500) 10%,var(--card))' : 'var(--secondary)', border: '1px solid var(--border)', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>ROI</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 26, color: roiPos ? 'var(--positive)' : 'var(--negative)' }}>{roiPos ? '+' : ''}{p.roi.toFixed(1)}%</span>
          </div>
        </div>
        {[['Taxa de vitória', p.winRate, 'gold'], ['ITM', p.itm, 'emerald']].map(([l, v, t], i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{l}</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>{v}%</span></div>
            <ProgressBar value={v} tone={t} />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid var(--border)', marginTop: 14 }}>
          <div><div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Investido</div><MoneyValue value={p.buyIns} color="none" size="14px" /></div>
          <div><div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Prêmios</div><MoneyValue value={p.prizes} color="none" size="14px" /></div>
          <div><div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Melhor</div><MoneyValue value={p.best} signed size="14px" /></div>
          <div><div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Pior</div><MoneyValue value={p.worst} signed size="14px" /></div>
        </div>
      </div>
    </div>
  );
}

/* convenience money for StatTile values */
window.PHMoney = function ({ value }) { const { MoneyValue } = window.PokerHubDesignSystem_b95f9b; return <MoneyValue value={value} cents={false} color="none" />; };

const DK_TITLES = { inicio: 'Início', torneio: 'Torneio ativo', ranking: 'Ranking', debitos: 'Débitos', jogadores: 'Jogadores', perfil: 'Perfil', historico: 'Torneios realizados', caixinha: 'Caixinha da liga', admin: 'Administração da liga', wizard: 'Criar torneio', pagamentos: 'Pagamentos do torneio' };
/* Sidebar highlight for views that aren't nav destinations themselves. */
const DK_NAV_ALIAS = { wizard: 'torneio', pagamentos: 'debitos' };

function DesktopApp() {
  const D = window.PH_DATA;
  const [collapsed, setCollapsed] = React.useState(false);
  const [view, setView] = React.useState('inicio');
  const [switcher, setSwitcher] = React.useState(false);
  const [player, setPlayer] = React.useState(null);
  const [tv, setTv] = React.useState(false);
  const [, force] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const pick = (lg) => { D.league = { id: lg.id, name: lg.name, season: lg.season, members: lg.members, live: lg.live, liveName: lg.liveName, suit: lg.suit }; setSwitcher(false); force(); };

  const views = {
    inicio: <DkInicio go={setView} onRow={setPlayer} onTv={() => setTv(true)} />,
    torneio: <window.DkTorneio go={setView} onTv={() => setTv(true)} />,
    ranking: <DkRanking onRow={setPlayer} />,
    debitos: <DkDebitos />,
    jogadores: <DkPlayers />,
    perfil: <window.DkPerfil go={setView} />,
    historico: <window.DkHistorico go={setView} />,
    caixinha: <window.DkCaixinha />,
    admin: <window.DkAdmin go={setView} />,
    wizard: <window.DkWizard go={setView} />,
    pagamentos: <window.DkPagamentos go={setView} />,
  };

  return (
    <div className="dk-app">
      <window.DkSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} active={DK_NAV_ALIAS[view] || view} onNav={setView} activeLeague={D.league} onOpenSwitcher={() => setSwitcher(true)} />
      <main className="dk-main">
        <div className="dk-scroll">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em' }}>{DK_TITLES[view]}</div>
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{D.league.name} · {D.league.season} · {D.league.members} jogadores</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => { const t = (localStorage.getItem('ph-theme') || 'dark') === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('ph-theme', t); } catch (e) {} document.documentElement.setAttribute('data-theme', t); force(); }} title="Tema claro/escuro" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0 }}><window.DkIcon name={(localStorage.getItem('ph-theme') || 'dark') === 'dark' ? 'sun' : 'moon-star'} /></button>
              <a href="index.html" title="Versão mobile" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', textDecoration: 'none' }}><window.DkIcon name="smartphone" /></a>
              {(() => { const { Button } = window.PokerHubDesignSystem_b95f9b; return <Button variant="primary" icon="plus" onClick={() => setView('wizard')}>Criar torneio</Button>; })()}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', cursor: 'pointer' }}><window.DkIcon name="bell" /></div>
            </div>
          </div>
          {views[view]}
        </div>
      </main>
      {switcher ? <DkSwitcher onClose={() => setSwitcher(false)} onPick={pick} /> : null}
      {player ? <DkPlayerModal player={player} onClose={() => setPlayer(null)} /> : null}
      {tv ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <window.PHTimerTV onExit={() => setTv(false)} />
        </div>
      ) : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DesktopApp />);
