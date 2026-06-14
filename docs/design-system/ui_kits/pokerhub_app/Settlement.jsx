/* PokerHub UI kit — Acerto de contas (settlement / PIX) */
function PHSettlement({ go }) {
  const { Card, Button, IconButton, MoneyValue, Avatar, Badge } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const S = D.settlement;
  const [tab, setTab] = React.useState('pagar');
  const [copied, setCopied] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const copy = (pix) => { setCopied(pix); setTimeout(() => setCopied(null), 1600); };
  const fire = (m) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const statusBadge = (s) => s === 'pending'
    ? <Badge tone="warning">Pendente</Badge>
    : s === 'paid'
      ? <Badge tone="neutral" icon="clock">Aguardando</Badge>
      : <Badge tone="positive" icon="check-check">Confirmado</Badge>;

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconButton icon="arrow-left" onClick={() => go('home')} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Acerto de contas</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{D.tournament.name} · encerrado</div>
        </div>
      </div>

      {/* Net balance */}
      <Card variant={S.netBalance >= 0 ? 'live' : 'default'} pad="lg">
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>Saldo líquido</div>
        <MoneyValue value={S.netBalance} signed size="40px" />
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4 }}>
          {S.netBalance >= 0 ? 'Você recebe mais do que paga nesta noite.' : 'Você deve mais do que recebe.'}
        </div>
      </Card>

      {/* Pagamentos do torneio encerrado */}
      <Card interactive pad="md" style={{ marginTop: 10 }} onClick={() => go('pagamentos')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <i data-lucide="receipt" style={{ width: 18, height: 18, color: 'var(--gold-400)', flexShrink: 0 }}></i>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5 }}>Pagamentos do torneio</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>Saldo por jogador · quem paga quem · caixinha</div>
          </div>
          <Badge tone="warning">7 pendentes</Badge>
          <i data-lucide="chevron-right" style={{ color: 'var(--muted-foreground)' }}></i>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--secondary)', padding: 4, borderRadius: 'var(--radius-md)', margin: '16px 0 14px' }}>
        {[{ k: 'pagar', l: `A pagar · ${S.debts.length}` }, { k: 'receber', l: `A receber · ${S.credits.length}` }].map((x) => {
          const active = x.k === tab;
          return <button key={x.k} onClick={() => setTab(x.k)} style={{ flex: 1, height: 36, border: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, background: active ? 'var(--felt-700)' : 'transparent', color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{x.l}</button>;
        })}
      </div>

      {tab === 'pagar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {S.debts.map((d) => (
            <Card key={d.id} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar name={d.to} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{d.to}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{d.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <MoneyValue value={-d.amount} size="18px" />
                  <div style={{ marginTop: 4 }}>{statusBadge(d.status)}</div>
                </div>
              </div>
              {/* PIX row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--secondary)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                <i data-lucide="arrow-left-right" style={{ color: 'var(--gold-400)', width: 16, height: 16 }}></i>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.pix}</span>
                <button onClick={() => copy(d.pix)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', cursor: 'pointer', color: copied === d.pix ? 'var(--positive)' : 'var(--gold-400)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                  <i data-lucide={copied === d.pix ? 'check' : 'copy'} style={{ width: 15, height: 15 }}></i>{copied === d.pix ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              {d.status === 'pending' && (
                <div style={{ marginTop: 10 }}>
                  <Button variant="primary" icon="check" block onClick={() => fire(`Marcado como pago para ${d.to}`)}>Marcar como pago</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'receber' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {S.credits.map((c) => (
            <Card key={c.id} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={c.from} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{c.from}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{c.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <MoneyValue value={c.amount} signed size="18px" />
                  <div style={{ marginTop: 4 }}>{statusBadge(c.status)}</div>
                </div>
              </div>
              {c.status !== 'confirmed' && (
                <div style={{ marginTop: 10 }}>
                  <Button variant="secondary" icon="check-check" block onClick={() => fire(`Recebimento de ${c.from} confirmado`)}>Confirmar recebimento</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 84, zIndex: 70, background: 'var(--felt-700)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)' }}>
          <i data-lucide="check-circle" style={{ color: 'var(--positive)' }}></i>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

window.PHSettlement = PHSettlement;
