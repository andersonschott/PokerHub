/* PokerHub UI kit — Torneios realizados: lista reutilizável (Home e aba
   Torneio) + tela de detalhe do torneio encerrado (pódio, números,
   caixinha, pagamentos, duplicar). */

/* Seção "Realizados" — limit opcional + "ver todos" implícito pelo scroll. */
function PHHistoricoList({ go, limit }) {
  const { Card, SectionTitle, MoneyValue } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const items = limit ? D.history.slice(0, limit) : D.history;
  const open = (h) => { D._selectedHistory = h; go('torneio-detalhe'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionTitle icon="history">Realizados</SectionTitle>
      {items.map((h) => (
        <Card key={h.id} interactive pad="md" onClick={() => open(h)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{h.date}</span> · {h.players} jogadores · <span style={{ color: 'var(--podium-gold)' }}>♠ {h.podium[0].name}</span>
              </div>
            </div>
            <MoneyValue value={h.prizePool} cents={false} color="none" size="14px" />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6"></path></svg>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* Detalhe do torneio encerrado. */
function PHTorneioDetalhe({ go }) {
  const { Card, Button, IconButton, MoneyValue, StatTile, PodiumStat, Badge, SectionTitle } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const h = D._selectedHistory || D.history[0];
  const FH = window.PHFormHeader;
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <IconButton icon="arrow-left" onClick={() => go('home')} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}><span style={{ fontFamily: 'var(--font-mono)' }}>{h.date}</span> · buy-in R$ {h.buyIn}</div>
        </div>
        <Badge tone="neutral" icon="flag">Encerrado</Badge>
      </div>

      {/* Números */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatTile value={<MoneyValue value={h.prizePool} cents={false} color="none" size="15px" />} label="Prize pool" tone="emerald" center />
        <StatTile value={h.players} label="Jogadores" center />
        <StatTile value={h.rebuys} label="Rebuys" center />
      </div>

      {/* Pódio */}
      <SectionTitle icon="trophy">Pódio</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0 16px' }}>
        {h.podium.map((p) => (
          <PodiumStat key={p.pos} position={p.pos} name={p.name} sub={p.pos === 1 ? 'Campeão da noite' : p.pos === 2 ? 'Vice' : '3º lugar'} prize={<MoneyValue value={p.prize} cents={false} signed size="15px" />} />
        ))}
      </div>

      {/* Caixinha */}
      <Card pad="md" style={{ background: 'color-mix(in oklab, var(--gold-500) 7%, var(--card))', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i data-lucide="piggy-bank" style={{ width: 16, height: 16, color: 'var(--gold-400)', flexShrink: 0 }}></i>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>Contribuição para a caixinha</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14.5, color: 'var(--gold-400)', whiteSpace: 'nowrap' }}>R$ {h.caixinha.toLocaleString('pt-BR')}</span>
        </div>
      </Card>

      {/* Ações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button variant="secondary" icon="receipt" block onClick={() => go('pagamentos')}>Ver pagamentos</Button>
        <Button variant="outline" icon="copy" block onClick={() => go('torneio-create')}>Duplicar torneio</Button>
      </div>
    </div>
  );
}

window.PHHistoricoList = PHHistoricoList;
window.PHTorneioDetalhe = PHTorneioDetalhe;
