/* PokerHub UI kit — Caixinha (jackpot da liga): saldo acumulado,
   entradas (% do prize pool por torneio) e saídas (torneio especial /
   gastos da liga), com registro de gasto pelo organizador. */

function PHCaixinha({ go }) {
  const { Card, Button, IconButton, MoneyValue, Badge, Sheet, StatTile } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const C = D.caixinha;
  const FH = window.PHFormHeader;
  const PHInputC = window.PHInput;
  const PHChipsC = window.PHChips;

  const [tab, setTab] = React.useState('entradas');
  const [usages, setUsages] = React.useState(() => C.usages.map((u) => ({ ...u })));
  const [sheet, setSheet] = React.useState(null); // 'expense' | 'tournament'
  const [desc, setDesc] = React.useState('');
  const [val, setVal] = React.useState('');
  const [toast, setToast] = React.useState(null);

  const entriesTotal = C.entries.reduce((s, e) => s + e.amount, 0);
  const usagesTotal = usages.reduce((s, u) => s + u.amount, 0);
  const balance = entriesTotal - usagesTotal;

  const openSheet = (kind) => { setSheet(kind); setDesc(''); setVal(''); };
  const fire = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const submit = () => {
    const amount = parseInt(val, 10) || 0;
    if (!amount || !desc.trim()) return;
    setUsages((u) => [...u, { id: 'u' + Date.now(), desc: desc.trim(), date: '11/06', amount, type: sheet, balanceAfter: balance - amount }]);
    setSheet(null);
    fire(`${sheet === 'expense' ? 'Gasto registrado' : 'Uso em torneio registrado'}: R$ ${amount},00`);
  };

  const typeBadge = (type) => type === 'tournament'
    ? <Badge tone="gold">Torneio especial</Badge>
    : <Badge tone="neutral">Gasto da liga</Badge>;

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      <FH title="Caixinha" sub={D.league.name} onBack={() => go('perfil')} />

      {/* Saldo hero */}
      <Card variant="gold" pad="lg">
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>Saldo acumulado</div>
        <MoneyValue value={balance} cents={false} color="none" size="40px" />
        <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 4 }}>
          Acumula <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-400)' }}>{C.percent}%</span> de cada prize pool
        </div>
      </Card>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '12px 0 16px' }}>
        <StatTile value={<MoneyValue value={entriesTotal} signed cents={false} size="16px" />} label="Entradas" center />
        <StatTile value={<MoneyValue value={-usagesTotal} cents={false} size="16px" />} label="Saídas" center />
        <StatTile value={C.entries.length} label="Torneios" center />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--secondary)', padding: 4, borderRadius: 'var(--radius-md)', marginBottom: 14 }}>
        {[{ k: 'entradas', l: `Entradas · ${C.entries.length}` }, { k: 'saidas', l: `Saídas · ${usages.length}` }].map((x) => {
          const active = x.k === tab;
          return <button key={x.k} onClick={() => setTab(x.k)} style={{ flex: 1, height: 36, border: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, background: active ? 'var(--felt-700)' : 'transparent', color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{x.l}</button>;
        })}
      </div>

      {tab === 'entradas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {C.entries.map((e, i) => (
            <Card key={i} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.tournament}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{e.date} · pool R$ {e.prizePool.toLocaleString('pt-BR')} · {e.pct}%</div>
                </div>
                <MoneyValue value={e.amount} signed cents={false} size="15px" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'saidas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {usages.map((u) => (
            <Card key={u.id} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.desc}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{u.date} · saldo após R$ {u.balanceAfter.toLocaleString('pt-BR')}</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                  <MoneyValue value={-u.amount} cents={false} size="15px" />
                  {typeBadge(u.type)}
                </div>
              </div>
            </Card>
          ))}
          {usages.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', padding: '4px 2px' }}>Nenhuma saída ainda — quando a caixinha for usada, aparece aqui.</div>
          ) : null}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Button variant="primary" icon="shopping-cart" block onClick={() => openSheet('expense')}>Registrar gasto</Button>
            <Button variant="secondary" icon="trophy" block onClick={() => openSheet('tournament')}>Usar em torneio</Button>
          </div>
        </div>
      )}

      {/* Como funciona */}
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, marginTop: 16, padding: '0 2px' }}>
        A caixinha guarda {C.percent}% de cada prize pool. O organizador usa para torneios especiais ou despesas da liga — baralhos, fichas, lanches.
      </div>

      {/* Registrar gasto / uso em torneio */}
      {sheet && (
        <Sheet open onClose={() => setSheet(null)}
          title={sheet === 'expense' ? 'Registrar gasto da liga' : 'Usar em torneio especial'}
          subtitle={`Saldo disponível: R$ ${balance.toLocaleString('pt-BR')},00`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PHInputC label="Descrição" placeholder={sheet === 'expense' ? 'Ex.: Baralhos novos' : 'Ex.: Torneio de Natal'} value={desc} onChange={(e) => setDesc(e.target.value)} />
            <PHInputC label="Valor" mono prefix="R$" inputMode="numeric" placeholder="0" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} />
            <Button variant="primary" icon="check" block disabled={!desc.trim() || !val || (parseInt(val, 10) || 0) > balance} onClick={submit}>Confirmar</Button>
          </div>
        </Sheet>
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

window.PHCaixinha = PHCaixinha;
