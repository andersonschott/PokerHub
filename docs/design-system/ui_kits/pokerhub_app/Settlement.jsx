/* PokerHub UI kit — Acerto de contas (settlement / PIX).
   Revisão de usabilidade mobile: copiar PIX vira alvo ≥44px com estado "Copiado"
   e ganha QR (copia e cola) em bottom-Sheet, espelhando o fluxo de pagamento BR. */
function PHSettlement({ go }) {
  const { Card, Button, IconButton, MoneyValue, Avatar, Badge, Sheet } = window.PokerHubDesignSystem_b95f9b;
  const PixQR = window.PHPixQR;
  const D = window.PH_DATA;
  const S = D.settlement;
  const [tab, setTab] = React.useState('pagar');
  const [debts, setDebts] = React.useState(S.debts);
  const [credits, setCredits] = React.useState(S.credits);
  const [copied, setCopied] = React.useState(null);
  const [qr, setQr] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const copy = (id) => { setCopied(id); setTimeout(() => setCopied(null), 1600); };
  const fire = (m) => { setToast(m); setTimeout(() => setToast(null), 2000); };
  const qrD = qr ? debts.find((d) => d.id === qr) : null;
  const markPaid = (d) => { setDebts((ds) => ds.map((x) => x.id === d.id ? { ...x, status: 'paid' } : x)); fire(`Marcado como pago para ${d.to} — aguardando confirmação`); };
  const confirmRecv = (c) => { setCredits((cs) => cs.map((x) => x.id === c.id ? { ...x, status: 'confirmed' } : x)); fire(`Recebimento de ${c.from} confirmado`); };

  const statusBadge = (s) => s === 'pending'
    ? <Badge tone="warning">Pendente</Badge>
    : s === 'paid'
      ? <Badge tone="neutral" icon="clock">Aguardando</Badge>
      : <Badge tone="positive" icon="check-check">Confirmado</Badge>;

  /* Tipo em texto discreto — chips deixavam o card carregado */
  const typeChip = (type) => (
    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{type === 'Lanches' ? 'Despesas · lanches' : type}</div>
  );

  const pagPendentes = D.pagamentos.transfers.filter((x) => x.status !== 'confirmed').length;

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconButton icon="arrow-left" onClick={() => go('home')} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Acerto de contas</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Todas as suas ligas</div>
        </div>
      </div>

      {/* Net balance */}
      <Card variant={S.netBalance >= 0 ? 'live' : 'default'} pad="lg">
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>Saldo líquido</div>
        <MoneyValue value={S.netBalance} signed size="40px" />
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4 }}>
          {S.netBalance >= 0 ? 'Você recebe mais do que paga no momento.' : 'Você deve mais do que recebe no momento.'}
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
          <Badge tone="warning">{pagPendentes} pendentes</Badge>
          <i data-lucide="chevron-right" style={{ color: 'var(--muted-foreground)' }}></i>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--secondary)', padding: 4, borderRadius: 'var(--radius-md)', margin: '16px 0 14px' }}>
        {[{ k: 'pagar', l: `A pagar · ${debts.filter((d) => d.status !== 'confirmed').length}` }, { k: 'receber', l: `A receber · ${credits.filter((c) => c.status !== 'confirmed').length}` }].map((x) => {
          const active = x.k === tab;
          return <button key={x.k} onClick={() => setTab(x.k)} style={{ flex: 1, height: 36, border: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, background: active ? 'var(--felt-700)' : 'transparent', color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{x.l}</button>;
        })}
      </div>

      {tab === 'pagar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {debts.map((d) => (
            <Card key={d.id} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar name={d.to} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{d.to}</div>
                  <div style={{ marginTop: 2 }}>{typeChip(d.type)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <MoneyValue value={-d.amount} size="18px" />
                  <div style={{ marginTop: 4 }}>{statusBadge(d.status)}</div>
                </div>
              </div>
              {/* PIX row — copiar (≥44px) + QR */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--secondary)', borderRadius: 'var(--radius-md)', padding: '8px 10px' }}>
                <i data-lucide="arrow-left-right" style={{ color: 'var(--gold-400)', width: 16, height: 16, flexShrink: 0 }}></i>
                <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.pix}</span>
                <button onClick={() => copy(d.id)} aria-label="Copiar chave PIX"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, padding: '0 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: copied === d.id ? 'var(--positive)' : 'var(--gold-400)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                  <i data-lucide={copied === d.id ? 'check' : 'copy'} style={{ width: 16, height: 16 }}></i>{copied === d.id ? 'Copiado' : 'Copiar'}
                </button>
                {d.type !== 'Caixinha' && (
                  <button onClick={() => setQr(d.id)} aria-label="Mostrar QR Code PIX"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--foreground)', flexShrink: 0 }}>
                    <i data-lucide="qr-code" style={{ width: 18, height: 18 }}></i>
                  </button>
                )}
              </div>
              {d.status === 'pending' && (
                <div style={{ marginTop: 10 }}>
                  <Button variant="primary" icon="check" block onClick={() => markPaid(d)}>Marcar como pago</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'receber' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {credits.map((c) => (
            <Card key={c.id} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={c.from} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{c.from}</div>
                  <div style={{ marginTop: 2 }}>{typeChip(c.type)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <MoneyValue value={c.amount} signed size="18px" />
                  <div style={{ marginTop: 4 }}>{statusBadge(c.status)}</div>
                </div>
              </div>
              {c.status !== 'confirmed' && (
                <div style={{ marginTop: 10 }}>
                  <Button variant="secondary" icon="check-check" block onClick={() => confirmRecv(c)}>Confirmar recebimento</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Sheet QR PIX */}
      {qrD && (
        <Sheet open onClose={() => setQr(null)} title={`PIX · ${qrD.to}`} subtitle="Escaneie ou copie para pagar">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <MoneyValue value={-qrD.amount} size="30px" />
            <PixQR />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'var(--secondary)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qrD.pix}</span>
            </div>
            <Button variant="primary" icon={copied === qrD.id ? 'check' : 'copy'} block onClick={() => copy(qrD.id)}>{copied === qrD.id ? 'Copiado!' : 'Copiar Pix copia e cola'}</Button>
          </div>
        </Sheet>
      )}

      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 84, zIndex: 70, background: 'var(--felt-700)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)' }}>
          <i data-lucide="check-circle" style={{ color: 'var(--positive)', width: 18, height: 18 }}></i>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

window.PHSettlement = PHSettlement;
