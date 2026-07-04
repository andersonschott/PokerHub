/* PokerHub UI kit — Desktop: Torneios realizados (lista + detalhe lado a lado). */

function DkHistorico({ go }) {
  const { Card, Button, MoneyValue, Avatar, StatTile, Badge } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const [sel, setSel] = React.useState(D.history[0].id);
  const h = D.history.find((x) => x.id === sel) || D.history[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(330px, 0.85fr)', gap: 20, alignItems: 'start' }}>
      {/* Lista */}
      <Card pad="md">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Data', 'Torneio', 'Jog.', 'Campeão', 'Prize pool'].map((c, i) => (
              <th key={c} style={{ textAlign: i >= 2 ? (i === 4 ? 'right' : 'center') : 'left', padding: '0 10px 10px', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{c}</th>
            ))}
          </tr></thead>
          <tbody>
            {D.history.map((x) => {
              const on = x.id === sel;
              return (
                <tr key={x.id} onClick={() => setSel(x.id)}
                  style={{ cursor: 'pointer', borderTop: '1px solid var(--border)', background: on ? 'color-mix(in oklab, var(--gold-500) 9%, transparent)' : 'transparent' }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = 'var(--secondary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = on ? 'color-mix(in oklab, var(--gold-500) 9%, transparent)' : 'transparent'; }}>
                  <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{x.date}</td>
                  <td style={{ padding: '12px 10px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{x.name}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{x.players}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <Avatar name={x.podium[0].name} size={22} podium="gold" />
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 600, whiteSpace: 'nowrap' }}>{x.podium[0].name.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}><MoneyValue value={x.prizePool} cents={false} color="none" size="13.5px" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Detalhe */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card pad="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 2 }}>{h.date} · buy-in R$ {h.buyIn}</div>
            </div>
            <Badge tone="neutral">Encerrado</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <StatTile icon="users" value={h.players} label="Jogadores" center />
            <StatTile icon="repeat" value={`${h.rebuys} · ${h.addons}`} valueSize="20px" label="Rebuys · Add-ons" center />
            <StatTile icon="trophy" value={<window.PHMoney value={h.prizePool} />} label="Prize pool" tone="emerald" center />
            <StatTile icon="piggy-bank" value={<window.PHMoney value={h.caixinha} />} label="Caixinha" tone="gold" center />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', margin: '4px 0 10px' }}>Pódio</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {h.podium.map((p) => (
              <div key={p.pos} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: p.pos === 1 ? 'color-mix(in oklab, var(--podium-gold) 12%, var(--card))' : 'var(--secondary)', border: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, width: 24, color: ['var(--podium-gold)', 'var(--podium-silver)', 'var(--podium-bronze)'][p.pos - 1] }}>{p.pos}º</span>
                <Avatar name={p.name} size={28} podium={['gold', 'silver', 'bronze'][p.pos - 1]} />
                <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                <MoneyValue value={p.prize} cents={false} signed size="14px" />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <Button variant="primary" icon="wallet" block onClick={() => go('pagamentos')}>Ver pagamentos</Button>
            <Button variant="secondary" icon="copy" block onClick={() => go('wizard')}>Duplicar</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { DkHistorico });
