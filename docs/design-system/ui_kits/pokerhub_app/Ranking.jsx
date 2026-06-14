/* PokerHub UI kit — Ranking (season standings) + PlayerStats detail.
   Mobile-first: big podium, one-hand scannable standings, money always in context. */

/* ---- small helpers ---------------------------------------------------- */
/* React-owned inline icons. The standings list reorders on sort, so it must
   NOT contain lucide <i> nodes (createIcons() swaps them to <svg> outside
   React's knowledge, which breaks insertBefore during reconciliation). */
function ChevronRight({ size = 18, color = 'var(--muted-foreground)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  );
}
function ChevronDown({ size = 15, color = 'var(--muted-foreground)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  );
}

function RkSort({ value, onChange }) {
  const opts = [{ k: 'profit', l: 'Lucro' }, { k: 'roi', l: 'ROI' }, { k: 'itm', l: 'ITM' }];
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--secondary)', padding: 4, borderRadius: 'var(--radius-md)' }}>
      {opts.map((o) => {
        const active = o.k === value;
        return (
          <button key={o.k} onClick={() => onChange(o.k)}
            style={{ flex: 1, height: 34, border: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
              background: active ? 'var(--felt-700)' : 'transparent',
              color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none' }}>{o.l}</button>
        );
      })}
    </div>
  );
}

/* The 3-column raised podium — the hero of the ranking screen. */
function PodiumHero({ top, onPick }) {
  const { Avatar, MoneyValue } = window.PokerHubDesignSystem_b95f9b;
  // visual order: 2nd, 1st, 3rd
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const meta = {
    1: { h: 132, ring: 'gold',   tint: 'var(--gold-500)',   glow: 'var(--glow-gold)' },
    2: { h: 108, ring: 'silver', tint: 'oklch(0.78 0.02 250)', glow: 'none' },
    3: { h: 92,  ring: 'bronze', tint: 'oklch(0.62 0.08 60)',  glow: 'none' },
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'end', gap: 8 }}>
      {order.map((p) => {
        const m = meta[p.position];
        return (
          <button key={p.position} onClick={() => onPick(p)} className="ph-fade-in"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}>
            <Avatar name={p.name} podium={m.ring} badge={String(p.position)} badgeGold={p.position === 1} size={p.position === 1 ? 60 : 48} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: p.position === 1 ? 14 : 13, textAlign: 'center', lineHeight: 1.1 }}>{p.name.split(' ')[0]}</div>
            <MoneyValue value={p.profit} signed size={p.position === 1 ? '14px' : '12px'} />
            <div style={{
              width: '100%', height: m.h, borderRadius: '12px 12px 0 0', marginTop: 2,
              background: `linear-gradient(180deg, color-mix(in oklab, ${m.tint} 22%, var(--card)) 0%, var(--card) 100%)`,
              border: '1px solid var(--border)', borderBottom: 0,
              boxShadow: m.glow !== 'none' ? m.glow : 'none',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: p.position === 1 ? 34 : 26, color: m.tint, lineHeight: 1 }}>{p.position}º</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---- PlayerStats detail (full sub-screen) ----------------------------- */
function PHPlayerStats({ player, rank, onBack }) {
  const { Card, IconButton, Avatar, Badge, MoneyValue, ProgressBar, StatTile } = window.PokerHubDesignSystem_b95f9b;
  const p = player;
  const roiPos = p.roi >= 0;
  const roiMsg = p.roi >= 100 ? 'Muito acima da média.' : p.roi >= 50 ? 'Acima da média.' : p.roi >= 0 ? 'No positivo — continue assim.' : p.roi >= -25 ? 'No vermelho, mas recuperável.' : 'Momento difícil. Paciência!';
  const maxProfit = Math.max(...p.recent.map((r) => Math.abs(r.profit)), 1);

  const posChip = (pos) => {
    const c = pos === 1 ? 'var(--podium-gold)' : pos === 2 ? 'var(--podium-silver)' : pos === 3 ? 'var(--podium-bronze)' : 'var(--muted-foreground)';
    return <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: c }}>{pos}º</span>;
  };

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <IconButton icon="arrow-left" onClick={onBack} />
        <Avatar name={p.name} podium={rank <= 3 ? ['gold', 'silver', 'bronze'][rank - 1] : undefined} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>{p.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>@{p.nick} · {p.tournaments} torneios</div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--gold-400)' }}>#{rank}</div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>Ranking</div>
        </div>
      </div>

      {/* Hero stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <StatTile icon="target" value={p.tournaments} label="Torneios" center />
        <StatTile icon="trophy" value={p.wins} label="Vitórias" tone="gold" center />
        <StatTile icon="trending-up" value={<MoneyValue value={p.profit} signed cents={false} size="20px" />} label="Lucro" tone={p.profit >= 0 ? 'positive' : 'negative'} center />
      </div>

      {/* Pódios + ROI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <Card pad="md">
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: 10 }}>Pódios</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[['var(--podium-gold)', p.wins], ['var(--podium-silver)', p.second], ['var(--podium-bronze)', p.third]].map(([c, n], i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: c, margin: '0 auto 6px' }}></div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22 }}>{n}</div>
                <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{['1º', '2º', '3º'][i]}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card variant={roiPos ? 'gold' : 'default'} pad="md">
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>ROI</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', color: roiPos ? 'var(--positive)' : 'var(--negative)', marginTop: 2 }}>
            {roiPos ? '+' : ''}{p.roi.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 4, lineHeight: 1.35 }}>{roiMsg}</div>
        </Card>
      </div>

      {/* Performance */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', margin: '18px 0 8px' }}>Performance</div>
      <Card pad="md">
        {[['Taxa de vitória', p.winRate, 'gold'], ['ITM · in the money', p.itm, 'emerald'], ['Posição média', null, null]].map(([label, val, tone], i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: i < 2 ? 14 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{val != null ? `${val}%` : `${p.avgPos.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}º`}</span>
            </div>
            {val != null ? <ProgressBar value={val} tone={tone} /> : null}
          </div>
        ))}
      </Card>

      {/* Financeiro */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', margin: '18px 0 8px' }}>Financeiro</div>
      <Card pad="none">
        {[['Total investido', <MoneyValue value={p.buyIns} color="none" size="14px" />],
          ['Total em prêmios', <MoneyValue value={p.prizes} color="none" size="14px" />],
          ['Lucro / prejuízo', <MoneyValue value={p.profit} signed size="14px" />],
          ['Melhor resultado', <MoneyValue value={p.best} signed size="14px" />],
          ['Pior resultado', <MoneyValue value={p.worst} signed size="14px" />]].map(([label, node], i, a) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0 }}>
            <span style={{ fontSize: 13.5, color: 'var(--muted-foreground)' }}>{label}</span>
            {node}
          </div>
        ))}
      </Card>

      {/* Histórico */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', margin: '18px 0 8px' }}>Últimos torneios</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {p.recent.map((r, i) => (
          <Card key={i} pad="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {posChip(r.pos)}
                <span style={{ fontSize: 9, color: 'var(--muted-foreground)', marginTop: 1 }}>/{r.total}</span>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{r.date} · invest {r.invest > 0 ? `R$ ${r.invest}` : '—'}</div>
              </div>
              <MoneyValue value={r.profit} signed size="15px" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---- Ranking list (the destination) ----------------------------------- */
function PHRanking({ go }) {
  const { Card, Avatar, MoneyValue, Badge, Sheet } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const [sort, setSort] = React.useState('profit');
  const [sel, setSel] = React.useState(null);
  const [season, setSeason] = React.useState(D.seasons[0]);
  const [seasonSheet, setSeasonSheet] = React.useState(false);
  const isGeral = season === 'Geral (acumulado)';
  const data = isGeral ? D.rankingGeral : D.ranking;

  if (sel) {
    const rank = data.findIndex((x) => x.nick === sel.nick) + 1;
    return <PHPlayerStats player={sel} rank={rank} onBack={() => setSel(null)} />;
  }

  // Em "Geral", completa com histórico/extremos do dataset da temporada (mesmo elenco).
  const pick = (p) => {
    if (!isGeral) return setSel(p);
    const base = D.ranking.find((x) => x.nick === p.nick) || {};
    setSel({ ...base, ...p });
  };

  const sorted = [...data].sort((a, b) => sort === 'profit' ? b.profit - a.profit : sort === 'roi' ? b.roi - a.roi : b.itm - a.itm);
  const top = data.slice(0, 3);
  const S = D.season;
  const seasonPct = Math.round((S.played / S.total) * 100);
  const metric = (p) => sort === 'profit' ? <MoneyValue value={p.profit} signed size="15px" />
    : <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: sort === 'roi' ? (p.roi >= 0 ? 'var(--positive)' : 'var(--negative)') : 'var(--foreground)' }}>{sort === 'roi' ? `${p.roi >= 0 ? '+' : ''}${p.roi.toFixed(0)}%` : `${p.itm}%`}</span>;

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em' }}>Ranking</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{D.league.name}</div>
        </div>
        <button onClick={() => setSeasonSheet(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--foreground)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {isGeral ? 'Geral' : season}<ChevronDown />
        </button>
      </div>

      {/* Season progress — ou resumo do acumulado */}
      {isGeral ? (
      <Card pad="md" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>Todas as temporadas</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>3 <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: 'var(--muted-foreground)' }}>temporadas ·</span> 43 <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: 'var(--muted-foreground)' }}>torneios</span></span>
        </div>
      </Card>
      ) : (
      <Card pad="md" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{S.range}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>{S.played}<span style={{ color: 'var(--muted-foreground)' }}>/{S.total}</span> <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, color: 'var(--muted-foreground)' }}>torneios</span></span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--secondary)', overflow: 'hidden' }}>
          <div style={{ width: `${seasonPct}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--gold-600), var(--gold-400))' }}></div>
        </div>
      </Card>
      )}

      {/* Podium hero */}
      <PodiumHero top={top} onPick={pick} />

      {/* Sort */}
      <div style={{ margin: '18px 0 12px' }}>
        <RkSort value={sort} onChange={setSort} />
      </div>

      {/* Standings list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((p) => {
          const rank = data.findIndex((x) => x.nick === p.nick) + 1;
          return (
            <Card key={p.nick} interactive pad="md" onClick={() => pick(p)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 28, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: rank <= 3 ? ['var(--podium-gold)', 'var(--podium-silver)', 'var(--podium-bronze)'][rank - 1] : 'var(--muted-foreground)', flexShrink: 0 }}>{rank}</span>
                <Avatar name={p.name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.tournaments} torneios{p.part ? ` (${p.part}%)` : ''} · {p.wins}×1º · {p.itm}% ITM</div>
                </div>
                {metric(p)}
                <ChevronRight />
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>
        Toque em um jogador para ver as estatísticas completas
      </div>

      {/* Seletor de temporada */}
      {seasonSheet && (
        <Sheet open onClose={() => setSeasonSheet(false)} title="Ranking" subtitle="Escolha a temporada ou o acumulado geral">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {D.seasons.map((s) => {
              const active = s === season;
              return (
                <button key={s} onClick={() => { setSeason(s); setSeasonSheet(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                    border: `1px solid ${active ? 'color-mix(in oklab, var(--gold-500) 45%, var(--border))' : 'var(--border)'}`,
                    background: active ? 'color-mix(in oklab, var(--gold-500) 12%, var(--card))' : 'var(--card)' }}>
                  <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: active ? 'var(--gold-400)' : 'var(--foreground)' }}>{s}</span>
                  {s === D.seasons[0] && s !== 'Geral (acumulado)' ? <Badge tone="neutral">atual</Badge> : null}
                  {active ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg> : null}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </div>
  );
}

window.PHRanking = PHRanking;
