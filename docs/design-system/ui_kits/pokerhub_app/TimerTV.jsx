/* PokerHub UI kit — Timer TV mode (fullscreen, legible at 3m) */
function PHTimerTV({ onExit }) {
  const { IconButton, StatusPill, MoneyValue } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const t = D.tournament;
  const [paused] = React.useState(false);
  // Mobile-first: on narrow screens the side panels collapse — fullscreen = the timer itself.
  const [compact, setCompact] = React.useState(() => window.matchMedia('(max-width: 900px)').matches);
  React.useEffect(() => {
    const m = window.matchMedia('(max-width: 900px)');
    const f = (e) => setCompact(e.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);

  const Panel = ({ children, title }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--muted-foreground)', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: paused ? 'var(--tv-paused-bg)' : 'var(--tv-bg)',
      display: 'grid',
      gridTemplateColumns: compact ? '1fr' : '1fr 1.6fr 1fr',
      gridTemplateRows: compact ? 'auto 1fr auto' : 'auto 1fr',
      gap: compact ? 20 : 40, padding: compact ? '20px 20px calc(20px + var(--safe-bottom, 0px))' : '36px 48px',
      color: 'var(--foreground)', overflow: 'hidden',
    }}>
      {/* Header full width */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: compact ? 14 : 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 16, minWidth: 0 }}>
          <div style={{ width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(160deg,var(--gold-400),var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-foreground)', fontSize: compact ? 19 : 24 }}>♠</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: compact ? 19 : 30, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 20, flexShrink: 0 }}>
          <StatusPill status={paused ? 'paused' : 'live'} />
          <IconButton icon="minimize-2" variant="solid" onClick={onExit} />
        </div>
      </div>

      {/* Left — prizes */}
      {!compact && (
      <Panel title="Premiação">
        <div style={{ background: 'linear-gradient(150deg,color-mix(in oklab,var(--emerald-500) 12%,transparent),transparent)', border: '1px solid color-mix(in oklab,var(--emerald-500) 28%,transparent)', borderRadius: 20, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Prize pool</div>
          <MoneyValue value={t.prizePool} cents={false} color="none" size="46px" />
        </div>
        {D.prizes.map((p) => {
          const ring = ['var(--podium-gold)', 'var(--podium-silver)', 'var(--podium-bronze)'][p.position - 1];
          return (
            <div key={p.position} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: ring, color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 20 }}>{p.position}º</span>
              <div style={{ flex: 1 }}>
                <MoneyValue value={p.amount} cents={false} color="none" size="26px" />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--muted-foreground)' }}>{p.pct}%</span>
            </div>
          );
        })}
      </Panel>
      )}

      {/* Center — timer */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative', minWidth: 0, containerType: 'inline-size' }}>
        <div aria-hidden style={{ position: 'absolute', fontSize: 'min(110cqi, 520px)', color: 'var(--suit-dark)', opacity: 0.025, fontFamily: 'serif', pointerEvents: 'none' }}>♠</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(18px, 5cqi, 28px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--emerald-400)' }}>Nível {t.level}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(72px, 33cqi, 240px)', whiteSpace: 'nowrap', lineHeight: 0.9, letterSpacing: '-0.04em' }}>12:43</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'clamp(32px, 14cqi, 96px)', whiteSpace: 'nowrap', color: 'var(--gold-400)', letterSpacing: '-0.02em', marginTop: 8 }}>{t.sb} / {t.bb}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(15px, 3.6cqi, 26px)', whiteSpace: 'nowrap', color: 'var(--muted-foreground)' }}>ante {t.ante} · próximo {t.nextSb}/{t.nextBb}</div>
      </div>

      {/* Right — players + stats */}
      {!compact && (
      <Panel title="Mesa">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { v: `${t.remaining}/${t.players}`, l: 'Jogadores' },
            { v: t.rebuys, l: 'Rebuys' },
            { v: t.addons, l: 'Add-ons' },
            { v: `R$ ${t.buyIn}`, l: 'Buy-in' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 38, letterSpacing: '-0.02em' }}>{s.v}</div>
              <div style={{ fontSize: 14, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, flex: 1 }}>
          <div style={{ fontSize: 14, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Eliminações</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {D.table.filter((p) => p.status === 'out').sort((a, b) => a.place - b.place).map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--muted-foreground)', width: 34 }}>{p.place}º</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19 }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      )}

      {/* Compact (phone) — essentials under the timer instead of side panels */}
      {compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, paddingBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
          <span>{t.remaining}/{t.players} na mesa</span>
          <span style={{ color: 'var(--emerald-400)' }}>R$ {t.prizePool.toLocaleString('pt-BR')} pool</span>
        </div>
      )}
    </div>
  );
}

window.PHTimerTV = PHTimerTV;
