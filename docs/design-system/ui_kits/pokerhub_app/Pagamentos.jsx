/* PokerHub UI kit — Pagamentos do torneio (pós-encerramento).
   Espelha Pagamento/TournamentPayments.razor: saldo por jogador
   (investimento · prêmio · saldo), contribuição da caixinha, prize pool,
   e a lista de transferências com PAGO → CONFIRMAR.

   Revisão de usabilidade mobile (cálculo & débitos):
   · Copiar PIX vira alvo ≥44px com estado "Copiado".
   · QR PIX (copia e cola) em bottom-Sheet — espelha o padrão de pagamento BR.
   · Confirmar em lote agora existe no MOBILE (barra fixa "Confirmar pendentes").
   · Dinheiro sempre em MoneyValue com centavos nos valores transferidos. */

/* QR placeholder (protótipo) — comunica o padrão sem fingir integridade do BR Code.
   Na implementação real, o conteúdo é o "Pix copia e cola" (payload EMV com CRC16). */
function PixQR({ size = 168 }) {
  const cell = size / 25;
  const finder = (x, y) => ([
    <rect key={`${x}-${y}-o`} x={x * cell} y={y * cell} width={cell * 7} height={cell * 7} rx={cell} fill="none" stroke="var(--foreground)" strokeWidth={cell} />,
    <rect key={`${x}-${y}-i`} x={(x + 2) * cell} y={(y + 2) * cell} width={cell * 3} height={cell * 3} rx={cell * 0.6} fill="var(--foreground)" />,
  ]);
  // Módulos pseudo-aleatórios derivados de índice (apenas estética de QR).
  const mods = [];
  for (let r = 0; r < 25; r++) for (let c = 0; c < 25; c++) {
    const corner = (r < 8 && c < 8) || (r < 8 && c > 16) || (r > 16 && c < 8);
    if (corner) continue;
    if (((r * 7 + c * 13 + r * c) % 5) < 2) mods.push(<rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="var(--foreground)" />);
  }
  return (
    <div style={{ width: size, height: size, padding: 12, borderRadius: 'var(--radius-md)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size - 24} height={size - 24} viewBox={`0 0 ${size} ${size}`} style={{ color: '#0a0a0a' }}>
        <g style={{ '--foreground': '#0a0a0a' }}>
          {mods}
          {finder(0, 0)}
          {finder(18, 0)}
          {finder(0, 18)}
        </g>
      </svg>
    </div>
  );
}

function PHPagamentos({ go }) {
  const { Card, Button, IconButton, MoneyValue, Avatar, Badge, ProgressBar, Sheet } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const P = D.pagamentos;
  const FH = window.PHFormHeader;

  const [tab, setTab] = React.useState('saldo');
  const [transfers, setTransfers] = React.useState(() => P.transfers.map((x) => ({ ...x })));
  const [copied, setCopied] = React.useState(null);
  const [qr, setQr] = React.useState(null);   // transfer cujo QR está aberto
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const fire = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const setStatus = (id, status, msg) => { setTransfers((ts) => ts.map((x) => (x.id === id ? { ...x, status } : x))); fire(msg); };
  const copy = (id, pix) => { setCopied(id); fire('Chave PIX copiada'); setTimeout(() => setCopied(null), 1600); };

  const pendingTransfers = transfers.filter((x) => x.status !== 'confirmed');
  const pending = transfers.filter((x) => x.status === 'pending').length;
  const confirmed = transfers.filter((x) => x.status === 'confirmed').length;
  const totalReceber = transfers.reduce((s, x) => s + x.amount, 0);
  const pct = Math.round((confirmed / transfers.length) * 100);

  // Composição do total em aberto — sempre visível, para explicar o valor calculado.
  const totalByType = (type) => transfers.reduce((s, x) => s + (x.parts || []).filter((p) => p.type === type).reduce((a, b) => a + b.amount, 0), 0);
  const totPoker = totalByType('Poker');
  const totDespesas = totalByType('Despesas');
  const totCaixinha = totalByType('Caixinha');

  const confirmAll = () => {
    const n = pendingTransfers.length;
    setTransfers((ts) => ts.map((x) => (x.status !== 'confirmed' ? { ...x, status: 'confirmed' } : x)));
    fire(`${n} pagamento${n === 1 ? '' : 's'} confirmado${n === 1 ? '' : 's'}`);
  };

  const saldoOf = (p) => p.prize - p.inv;
  const sorted = [...P.saldo].sort((a, b) => saldoOf(b) - saldoOf(a));
  const qrT = qr ? transfers.find((x) => x.id === qr) : null;

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
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>Total a transferir</div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{pct}% concluído</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>♠ poker {totPoker} · despesas {totDespesas} · caixinha {totCaixinha}</span>
          </div>
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
          {/* O saldo é só poker — e é só ele que vale para o ranking. */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '2px 4px' }}>
            <i data-lucide="info" style={{ width: 14, height: 14, color: 'var(--muted-foreground)', flexShrink: 0, marginTop: 1 }}></i>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.45 }}>Saldo = prêmio − investimento (só o poker). É esse valor que conta para o ranking. Despesas e caixinha entram apenas nos pagamentos.</span>
          </div>
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
          {/* Despesas da noite — por último: o jogo, a caixinha e então os extras */}
          {P.despesas && P.despesas.length > 0 && (
            <Card pad="none">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                <i data-lucide="utensils" style={{ width: 15, height: 15, color: 'var(--muted-foreground)', flexShrink: 0 }}></i>
                <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>Despesas rateadas</span>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>fora do ranking</span>
              </div>
              {P.despesas.map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{e.desc}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>pagou {e.paidBy} · R$ {e.each} × {e.splitCount} ({e.among})</div>
                  </div>
                  <MoneyValue value={e.total} cents={false} color="none" size="14.5px" />
                </div>
              ))}
            </Card>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button variant="secondary" icon="refresh-ccw" block onClick={() => fire('Pagamentos recalculados')}>Recalcular</Button>
            <Button variant="primary" icon="megaphone" block onClick={() => fire(`Lembrete enviado para ${pending} pendentes`)}>Cobrar todos</Button>
          </div>
        </div>
      )}

      {/* Lista de pagamentos */}
      {tab === 'pagamentos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* O que compõe cada valor — resposta à dúvida mais reportada */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '2px 4px' }}>
            <i data-lucide="info" style={{ width: 14, height: 14, color: 'var(--muted-foreground)', flexShrink: 0, marginTop: 1 }}></i>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.45 }}>Cada transferência soma o acerto do poker com as despesas rateadas da noite. Despesas e caixinha não contam para o ranking.</span>
          </div>
          {/* Barra de confirmar em lote (mobile) — antes só existia no desktop */}
          {pendingTransfers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'color-mix(in oklab, var(--emerald-500) 10%, var(--card))', border: '1px solid color-mix(in oklab, var(--emerald-500) 28%, transparent)' }}>
              <i data-lucide="list-checks" style={{ width: 18, height: 18, color: 'var(--emerald-400)', flexShrink: 0 }}></i>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--foreground)' }}>{pendingTransfers.length} pagamento{pendingTransfers.length === 1 ? '' : 's'} em aberto</span>
              <Button variant="primary" size="sm" icon="check-check" onClick={confirmAll}>Confirmar todos</Button>
            </div>
          )}

          {transfers.map((x) => {
            const isCaixinha = x.type === 'Caixinha';
            return (
              <Card key={x.id} pad="md">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{x.from}</span>
                  <i data-lucide="arrow-right" style={{ width: 14, height: 14, color: 'var(--muted-foreground)', flexShrink: 0 }}></i>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{x.to}</span>
                  <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{isCaixinha ? <Badge tone="gold">Caixinha</Badge> : statusBadge(x.status)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <MoneyValue value={x.amount} color="none" size="20px" />
                  {/* Composição em texto discreto — só quando o valor soma mais de um tipo */}
                  {x.parts && x.parts.length > 1 ? (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                      {x.parts.map((p) => `${p.type === 'Poker' ? '♠ poker' : p.type === 'Caixinha' ? 'caixinha' : 'despesas'} ${p.amount}`).join(' + ')}
                    </span>
                  ) : x.type === 'Despesas' ? (
                    <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>despesas · {(x.parts && x.parts[0] && x.parts[0].desc) || 'rateio'}</span>
                  ) : null}
                </div>

                {/* PIX: alvos ≥44px — copiar + QR (antes era um texto minúsculo) */}
                {!isCaixinha && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--secondary)', borderRadius: 'var(--radius-md)', padding: '8px 10px', marginTop: 10 }}>
                    <i data-lucide="arrow-left-right" style={{ color: 'var(--gold-400)', width: 16, height: 16, flexShrink: 0 }}></i>
                    <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.pix}</span>
                    <button onClick={() => copy(x.id, x.pix)} aria-label="Copiar chave PIX"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, padding: '0 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: copied === x.id ? 'var(--positive)' : 'var(--gold-400)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                      <i data-lucide={copied === x.id ? 'check' : 'copy'} style={{ width: 16, height: 16 }}></i>{copied === x.id ? 'Copiado' : 'Copiar'}
                    </button>
                    <button onClick={() => setQr(x.id)} aria-label="Mostrar QR Code PIX"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--foreground)', flexShrink: 0 }}>
                      <i data-lucide="qr-code" style={{ width: 18, height: 18 }}></i>
                    </button>
                  </div>
                )}

                {x.status !== 'confirmed' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {x.status === 'pending' && (
                      <Button variant="secondary" size="sm" block onClick={() => setStatus(x.id, 'paid', `${x.from} marcou como pago`)}>Pago</Button>
                    )}
                    <Button variant="primary" size="sm" block onClick={() => setStatus(x.id, 'confirmed', `Recebimento de ${x.from} confirmado`)}>Confirmar</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Sheet QR PIX */}
      {qrT && (
        <Sheet open onClose={() => setQr(null)} title={`PIX · ${qrT.to}`} subtitle={`Escaneie ou copie · ${qrT.from} → ${qrT.to}`}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <MoneyValue value={qrT.amount} color="none" size="30px" />
            <PixQR />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'var(--secondary)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qrT.pix}</span>
            </div>
            <Button variant="primary" icon={copied === qrT.id ? 'check' : 'copy'} block onClick={() => copy(qrT.id, qrT.pix)}>{copied === qrT.id ? 'Copiado!' : 'Copiar Pix copia e cola'}</Button>
          </div>
        </Sheet>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 84, zIndex: 70, background: 'var(--felt-700)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)' }}>
          <i data-lucide="check-circle" style={{ color: 'var(--positive)', width: 18, height: 18 }}></i>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

window.PHPagamentos = PHPagamentos;
window.PHPixQR = PixQR;
