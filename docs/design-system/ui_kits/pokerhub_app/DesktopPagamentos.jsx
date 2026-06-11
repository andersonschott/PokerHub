/* PokerHub UI kit — Desktop: Pagamentos do torneio (saldo + transferências PIX).
   Espelha TournamentPayments.razor: resumo, saldo por jogador e a lista
   "quem paga quem" com máquina de estados pendente → pago → confirmado. */

function DkPagamentos({ go }) {
  const { Card, Button, MoneyValue, Avatar, Badge, ProgressBar, StatTile } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA; const P = D.pagamentos;
  const [transfers, setTransfers] = React.useState(() => P.transfers.map((t) => ({ ...t })));
  const [copied, setCopied] = React.useState(null);

  const advance = (id) => setTransfers((ts) => ts.map((t) => (t.id === id ? { ...t, status: t.status === 'pending' ? 'paid' : 'confirmed' } : t)));
  const reset = () => setTransfers(P.transfers.map((t) => ({ ...t })));
  const copyPix = (t) => { try { navigator.clipboard.writeText(t.pix); } catch (e) {} setCopied(t.id); setTimeout(() => setCopied((c) => (c === t.id ? null : c)), 1600); };

  const confirmed = transfers.filter((t) => t.status === 'confirmed').length;
  const paid = transfers.filter((t) => t.status === 'paid').length;
  const pending = transfers.length - confirmed - paid;
  const pct = Math.round((confirmed / transfers.length) * 100);
  const badge = (s) => s === 'pending' ? <Badge tone="warning">Pendente</Badge> : s === 'paid' ? <Badge tone="neutral" icon="clock">Aguardando</Badge> : <Badge tone="positive" icon="check-check">Confirmado</Badge>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, alignItems: 'stretch' }}>
        <Card pad="md">
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>{P.tournament} · progresso do acerto</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0 10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 28 }}>{pct}%</span>
            <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{confirmed}/{transfers.length} confirmadas</span>
          </div>
          <ProgressBar value={pct} tone="emerald" />
        </Card>
        <StatTile icon="clock" value={pending} label="Pendentes" tone={pending ? 'gold' : undefined} center />
        <StatTile icon="check" value={paid} label="Aguardando" center />
        <StatTile icon="check-check" value={confirmed} label="Confirmadas" tone="emerald" center />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.8fr) minmax(0, 1.2fr)', gap: 20, alignItems: 'start' }}>
        {/* Saldo do torneio */}
        <Card pad="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>Saldo do torneio</span>
            <Badge tone="gold" icon="piggy-bank">Caixinha R$ {P.caixinha}</Badge>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Jogador', 'Inv.', 'Prêmio', 'Saldo'].map((c, i) => (
                <th key={c} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '0 8px 8px', fontFamily: 'var(--font-display)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>{c}</th>
              ))}
            </tr></thead>
            <tbody>
              {P.saldo.map((s) => {
                const net = s.prize - s.inv;
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 8px 8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={s.name} size={26} />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{s.name.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--muted-foreground)' }}>{s.inv}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{s.prize}</td>
                    <td style={{ padding: '8px 0 8px 8px', textAlign: 'right' }}><MoneyValue value={net} signed cents={false} size="13px" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>Prize pool</span>
            <MoneyValue value={P.prizePool} cents={false} color="gold" size="14px" />
          </div>
        </Card>

        {/* Transferências */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>Quem paga quem · {transfers.length}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" icon="rotate-ccw" size="sm" onClick={reset}>Recalcular</Button>
              <Button variant="secondary" icon="megaphone" size="sm">Cobrar todos</Button>
            </div>
          </div>
          {transfers.map((t) => (
            <Card key={t.id} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={t.from} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    <span>{t.from.split(' ')[0]}</span>
                    <window.DkIcon name="chevron-right" size={14} style={{ color: 'var(--muted-foreground)' }} />
                    <span style={{ color: t.type === 'Caixinha' ? 'var(--gold-400)' : 'var(--foreground)' }}>{t.to}</span>
                  </div>
                  <button onClick={() => copyPix(t)} title="Copiar chave PIX"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 3, padding: 0, border: 0, background: 'transparent', cursor: 'pointer', color: copied === t.id ? 'var(--positive)' : 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                    <window.DkIcon name={copied === t.id ? 'check' : 'copy'} size={12} />
                    {copied === t.id ? 'Chave copiada!' : t.pix}
                  </button>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                  <MoneyValue value={t.amount} cents={false} color="none" size="16px" />
                  {badge(t.status)}
                </div>
                {t.status !== 'confirmed' ? (
                  <Button variant={t.status === 'pending' ? 'primary' : 'secondary'} size="sm" icon={t.status === 'pending' ? 'check' : 'check-check'} onClick={() => advance(t.id)}>
                    {t.status === 'pending' ? 'Pago' : 'Confirmar'}
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DkPagamentos });
