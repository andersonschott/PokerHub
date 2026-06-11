/* PokerHub UI kit — Timer (mobile) */
function PHTimer({ go }) {
  const { Button, IconButton, StatusPill, StatTile, MoneyValue } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const t = D.tournament;
  const [paused, setPaused] = React.useState(false);
  const [level, setLevel] = React.useState(t.level);
  const elapsedPct = (1 - t.secondsRemaining / t.levelSeconds) * 100;

  return (
    <div style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      background: paused ? 'var(--tv-paused-bg)' : 'var(--tv-bg)',
      padding: '16px 16px 96px', transition: 'background var(--dur-slow)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="arrow-left" onClick={() => go('home')} style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
        <StatusPill status={paused ? 'paused' : 'live'} style={{ flexShrink: 0 }} />
      </div>

      {/* Level */}
      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: paused ? 'var(--warning)' : 'var(--emerald-400)' }}>
          {paused ? 'Pausado' : `Nível ${level}`}
        </div>
      </div>

      {/* Dominant countdown — ≥40% */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 300, position: 'relative' }}>
        <div aria-hidden style={{ position: 'absolute', fontSize: 'min(70cqi, 280px)', color: 'var(--suit-dark)', opacity: 0.03, fontFamily: 'serif', pointerEvents: 'none' }}>♠</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          fontSize: 'clamp(64px, 27cqi, 124px)', lineHeight: 0.92, letterSpacing: '-0.04em',
          whiteSpace: 'nowrap',
          color: 'var(--foreground)',
        }}>12:43</div>
        {/* Blinds */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'clamp(26px, 9.5cqi, 40px)', color: 'var(--gold-400)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{t.sb} / {t.bb}</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>ante {t.ante}</div>
        <div style={{ width: '78%', maxWidth: 320, marginTop: 16 }}>
          <div style={{ height: 8, borderRadius: 999, background: 'color-mix(in oklab, var(--foreground) 12%, transparent)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${elapsedPct}%`, borderRadius: 999, background: paused ? 'var(--warning)' : 'var(--emerald-500)' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>
            <span>próximo: {t.nextSb}/{t.nextBb}</span>
            <span>em 12:43</span>
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        <StatTile icon="users" value={`${t.remaining}/${t.players}`} label="Mesa" center />
        <StatTile icon="trophy" value={<MoneyValue value={t.prizePool} cents={false} color="none" size="15px" />} label="Pool" tone="emerald" center />
        <StatTile icon="repeat" value={t.rebuys} label="Rebuys" center />
        <StatTile icon="plus" value={t.addons} label="Add-on" center />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton icon="chevron-left" variant="solid" onClick={() => setLevel((l) => Math.max(1, l - 1))} />
        <Button variant={paused ? 'primary' : 'secondary'} icon={paused ? 'play' : 'pause'} block onClick={() => setPaused((p) => !p)}>
          {paused ? 'Retomar' : 'Pausar'}
        </Button>
        <IconButton icon="chevron-right" variant="solid" onClick={() => setLevel((l) => l + 1)} />
        <IconButton icon="tv" variant="solid" gold onClick={() => go('tv')} />
      </div>

      {/* Participantes — somente leitura (sem ações de organizador) */}
      <TimerPlayers />
    </div>
  );
}

/* Read-only participant list — mirrors the dashboard rows, no actions. */
function TimerPlayers() {
  const { Avatar, Card } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const DbCountT = window.PHDbCount;
  const inPlay = D.table.filter((p) => p.status === 'in');
  const out = D.table.filter((p) => p.status === 'out').sort((a, b) => a.place - b.place);
  const label = (txt) => (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', margin: '18px 0 8px' }}>{txt}</div>
  );
  return (
    <div>
      {label(`Na mesa · ${inPlay.length}`)}
      <Card pad="none">
        {inPlay.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderBottom: i < inPlay.length - 1 ? '1px solid var(--border)' : 0 }}>
            <Avatar name={p.name} size={34} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            <DbCountT kind="rebuy" n={p.rebuys || 0} />
            <DbCountT kind="addon" n={p.addons || 0} />
          </div>
        ))}
      </Card>
      {label(`Eliminados · ${out.length}`)}
      <Card pad="none">
        {out.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderBottom: i < out.length - 1 ? '1px solid var(--border)' : 0, opacity: 0.75 }}>
            <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11.5, color: 'var(--muted-foreground)', flexShrink: 0 }}>{p.place}º</span>
            <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13.5, color: 'var(--muted-foreground)' }}>{p.name}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* Aba Torneio sem torneio ao vivo — agenda + criar. */
function PHTorneioVazio({ go }) {
  const { Card, Button, Badge, SectionTitle } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em' }}>Torneio</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{D.league.name}</div>
      </div>
      <Card pad="lg">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '6px 4px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i data-lucide="timer-off" style={{ color: 'var(--muted-foreground)', width: 22, height: 22 }}></i>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5 }}>Nenhum torneio em andamento</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)', maxWidth: 250, lineHeight: 1.45 }}>Quando um torneio começar, o timer ao vivo aparece aqui.</div>
          <div style={{ height: 2 }}></div>
          <Button variant="primary" icon="plus" onClick={() => go('torneio-create')}>Criar torneio</Button>
        </div>
      </Card>
      <div style={{ height: 18 }}></div>
      <SectionTitle icon="calendar-clock">Próximos</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {D.upcoming.filter((u) => u.status !== 'live').map((u, i) => (
          <Card key={i} pad="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{u.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 2 }}>{u.when} · {u.confirmed} confirmados</div>
              </div>
              <Badge tone="neutral">R$ {u.buyIn}</Badge>
            </div>
          </Card>
        ))}
      </div>
      <div style={{ height: 18 }}></div>
      <window.PHHistoricoList go={go} limit={3} />
    </div>
  );
}

/* Router da aba Torneio: ao vivo → timer; sem torneio → agenda. */
function PHTimerTab({ go }) {
  return window.PH_DATA.league.live ? <PHTimer go={go} /> : <PHTorneioVazio go={go} />;
}

window.PHTimer = PHTimer;
window.PHTimerTab = PHTimerTab;
