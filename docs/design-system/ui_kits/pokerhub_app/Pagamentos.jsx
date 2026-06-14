/* PokerHub UI kit — Pagamentos do torneio (pós-encerramento).
   Espelha Pagamento/TournamentPayments.razor: saldo por jogador
   (investimento · prêmio · saldo), contribuição da caixinha, prize pool,
   e a lista de transferências com PAGO → CONFIRMAR. */

function PHPagamentos({ go }) {
  const { Card, Button, IconButton, MoneyValue, Avatar, Badge, ProgressBar } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const P = D.pagamentos;
  const FH = window.PHFormHeader;

  const [tab, setTab] = React.useState('saldo');
  const [transfers, setTransfers] = React.useState(() => P.transfers.map((x) => ({ ...x })));
  const [copied, setCopied] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const fire = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const setStatus = (id, status, msg) => { setTransfers((ts) => ts.map((x) => (x.id === id ? { ...x, status } : x))); fire(msg); };
  const copy = (pix) => { setCopied(pix); setTimeout(() => setCopied(null), 1600); };

  const pending = transfers.filter((x) => x.status === 'pending').length;
  const confirmed = transfers.filter((x) => x.status === 'confirmed').length;
  const totalReceber = transfers.reduce((s, x) => s + x.amount, 0);
  const pct = Math.round((confirmed / transfers.length) * 100);

  const saldoOf = (p) => p.prize - p.inv;
  const sorted = [...P.saldo].sort((a, b) => saldoOf(b) - saldoOf(a));

  const statusBadge = (s) => s === 'pending'
    ? <Badge tone="warning">Pendente</Badge>
    : s === 'paid'
      ? <Badge tone="neutral" icon="clock">Aguardando</Badge>
      : <Badge tone="positive" icon="check-check">Confirmado</Badge>;

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      <FH title="Pagamentos" sub={`${P.tournament} · encerrado`} onBack={() => go('settlement')} />

      {/* Resumo */}
      <Card variant="live" pad="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>A receber</div>
            <MoneyValue value={totalReceber} cents={false} size="26px" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 20, color: pending ? 'var(--warning)' : 'var(--positive)' }}>{pending}</div>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>Pendentes</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 20, color: 'var(--positive)' }}>{confirmed}</div>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>Confirmados</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar value={pct} tone="emerald" />
          <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{pct}% concluído</div>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--secondary)', padding: 4, borderRadius: 'var(--radius-md)', margin: '14px 0' }}>
        {[{ k: 'saldo', l: 'Saldo do torneio' }, { k: 'pagamentos', l: `Pagamentos · ${pending}` }].map((x) => {
          const active = x.k === tab;
          return <button key={x.k} onClick={() => setTab(x.k)} style={{ flex: 1, height: 36, border: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, background: active ? 'var(--felt-700)' : 'transparent', color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{x.l}</button>;
        })}
      </div>

      {/* Saldo do torneio */}
      {tab === 'saldo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Card pad="none">
            {sorted.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 0 }}>
                <Avatar name={p.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>inv R$ {p.inv} · prêmio R$ {p.prize}</div>
                </div>
                <MoneyValue value={saldoOf(p)} signed cents={false} size="15px" />
              </div>
            ))}
          </Card>
          <Card pad="md" style={{ background: 'color-mix(in oklab, var(--gold-500) 7%, var(--card))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i data-lucide="piggy-bank" style={{ width: 16, height: 16, color: 'var(--gold-400)', flexShrink: 0 }}></i>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>Contribuição para a caixinha</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14.5, color: 'var(--gold-400)' }}>R$ {P.caixinha}</span>
            </div>
          </Card>
          <Card pad="md">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>Total prize pool</span>
              <MoneyValue value={P.prizePool} cents={false} color="none" size="15px" />
            </div>
          </Card>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button variant="secondary" icon="refresh-ccw" block onClick={() => fire('Pagamentos recalculados')}>Recalcular</Button>
            <Button variant="primary" icon="megaphone" block onClick={() => fire(`Lembrete enviado para ${pending} pendentes`)}>Cobrar todos</Button>
          </div>
        </div>
      )}

      {/* Lista de pagamentos */}
      {tab === 'pagamentos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {transfers.map((x) => (
            <Card key={x.id} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{x.from}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{x.to}</span>
                <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{x.type === 'Caixinha' ? <Badge tone="gold">Caixinha</Badge> : <Badge tone="neutral">{x.type}</Badge>}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MoneyValue value={x.amount} cents={false} color="none" size="18px" />
                {x.type !== 'Caixinha' ? (
                  <button onClick={() => copy(x.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', cursor: 'pointer', color: copied === x.id ? 'var(--positive)' : 'var(--gold-400)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                    {copied === x.id ? 'Copiado' : 'PIX'}
                  </button>
                ) : null}
                <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{statusBadge(x.status)}</span>
              </div>
              {x.status !== 'confirmed' ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {x.status === 'pending' ? (
                    <Button variant="secondary" size="sm" block onClick={() => setStatus(x.id, 'paid', `${x.from} marcou como pago`)}>Pago</Button>
                  ) : null}
                  <Button variant="primary" size="sm" block onClick={() => setStatus(x.id, 'confirmed', `Recebimento de ${x.from} confirmado`)}>Confirmar</Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 84, zIndex: 70, background: 'var(--felt-700)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--positive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"></path><path d="m9 11 3 3L22 4"></path></svg>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

window.PHPagamentos = PHPagamentos;
