/* PokerHub UI kit — Organizer live dashboard + action sheet.
   Stack/fichas are NOT tracked by the product — rows surface what the
   organizer actually controls: rebuys, add-ons, eliminations (with undo).
   The table is React state, so actions really happen in the mock. */

/* Inline React-owned icons (rows mount/unmount between lists — see Ranking.jsx note). */
function DbIcon({ d, size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {d.map((p, i) => <path key={i} d={p}></path>)}
    </svg>
  );
}
const DB_REPEAT = ['m17 2 4 4-4 4', 'M3 11v-1a4 4 0 0 1 4-4h14', 'm7 22-4-4 4-4', 'M21 13v1a4 4 0 0 1-4 4H3'];
const DB_PLUS = ['M5 12h14', 'M12 5v14'];
const DB_MINUS = ['M5 12h14'];
const DB_UNDO = ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11'];

/* Rebuy / add-on counter — always visible, muted when zero. */
function DbCount({ kind, n }) {
  const on = n > 0;
  return (
    <span title={kind === 'rebuy' ? 'Rebuys' : 'Add-ons'} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px',
      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
      background: on ? 'var(--secondary)' : 'transparent',
      color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
      opacity: on ? 1 : 0.6, flexShrink: 0,
    }}>
      <DbIcon d={kind === 'rebuy' ? DB_REPEAT : DB_PLUS} size={12} />
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, lineHeight: 1 }}>{n}</span>
    </span>
  );
}

/* Stepper row for the action sheet — add AND undo rebuys/add-ons. */
function DbStepper({ icon, label, sub, value, onMinus, onPlus }) {
  const btn = (paths, onClick, disabled) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: 40, height: 40, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
      background: 'var(--secondary)', color: 'var(--foreground)', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      opacity: disabled ? 0.35 : 1, pointerEvents: disabled ? 'none' : 'auto', flexShrink: 0,
    }}><DbIcon d={paths} size={16} /></button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card)' }}>
      <DbIcon d={icon} size={16} color="var(--muted-foreground)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>{sub}</div>
      </div>
      {btn(DB_MINUS, onMinus, value <= 0)}
      <span style={{ width: 26, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17 }}>{value}</span>
      {btn(DB_PLUS, onPlus, false)}
    </div>
  );
}

function PHDashboard({ go }) {
  const { Card, Button, IconButton, StatusPill, MoneyValue, Avatar, Badge, Sheet, StatTile } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const t = D.tournament;
  const [table, setTable] = React.useState(() => D.table.map((p) => ({ ...p })));
  const [sel, setSel] = React.useState(null);   // selected player for action sheet
  const [step, setStep] = React.useState('actions'); // 'actions' | 'eliminate'
  const [paused, setPaused] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const inPlay = table.filter((p) => p.status === 'in');
  const out = table.filter((p) => p.status === 'out').sort((a, b) => a.place - b.place);
  const totalRebuys = table.reduce((s, p) => s + (p.rebuys || 0), 0);

  const open = (p) => { setSel(p.id); setStep('actions'); };
  const close = () => setSel(null);
  const fire = (msg) => { close(); setToast(msg); setTimeout(() => setToast(null), 2200); };
  const patch = (id, fn) => setTable((tb) => tb.map((p) => (p.id === id ? fn(p) : p)));
  const selP = sel ? table.find((p) => p.id === sel) : null;

  const adjust = (id, key, delta) => patch(id, (x) => ({ ...x, [key]: Math.max(0, (x[key] || 0) + delta) }));
  const eliminate = (p, by) => {
    const place = inPlay.length; // 6 in play → eliminated finishes 6º
    patch(p.id, (x) => ({ ...x, status: 'out', place }));
    fire(`${p.name} eliminado por ${by.name} · ${place}º lugar`);
  };
  const undoOut = (p) => {
    patch(p.id, (x) => { const y = { ...x, status: 'in' }; delete y.place; return y; });
    setToast(`Eliminação de ${p.name} desfeita`); setTimeout(() => setToast(null), 2200);
  };

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <IconButton icon="arrow-left" onClick={() => go('home')} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
            <Badge tone="gold" icon="crown">Operando</Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Você controla a mesa e o nível</div>
        </div>
        <IconButton icon="settings-2" size="sm" variant="solid" title="Configurar torneio" onClick={() => go('torneio-edit')} style={{ flexShrink: 0 }} />
        <StatusPill status={paused ? 'paused' : 'live'} />
      </div>

      {/* Level control */}
      <Card variant="gold" pad="md">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>Nível {t.level} · {t.sb}/{t.bb}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', marginTop: 2 }}>12:43</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconButton icon="chevron-left" variant="solid" />
            <IconButton icon={paused ? 'play' : 'pause'} variant="solid" gold onClick={() => setPaused((p) => !p)} />
            <IconButton icon="chevron-right" variant="solid" />
          </div>
        </div>
      </Card>

      {/* Live stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '12px 0 16px' }}>
        <StatTile value={`${inPlay.length}/${t.players}`} label="Na mesa" center />
        <StatTile value={<MoneyValue value={t.prizePool} cents={false} color="none" />} label="Prize pool" tone="emerald" center />
        <StatTile value={totalRebuys} label="Rebuys" center />
      </div>

      {/* Players in play */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 8 }}>Na mesa · {inPlay.length}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {inPlay.map((p) => (
          <Card key={p.id} interactive pad="md" onClick={() => open(p)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={p.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>@{p.nick}</div>
              </div>
              <DbCount kind="rebuy" n={p.rebuys || 0} />
              <DbCount kind="addon" n={p.addons || 0} />
            </div>
          </Card>
        ))}
      </div>

      {/* Eliminated — with undo */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', margin: '18px 0 8px' }}>Eliminados · {out.length}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {out.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--muted-foreground)', flexShrink: 0 }}>{p.place}º</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            <button onClick={() => undoOut(p)} title="Desfazer eliminação"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, flexShrink: 0 }}>
              <DbIcon d={DB_UNDO} size={13} />Desfazer
            </button>
          </div>
        ))}
        {out.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', padding: '4px 2px' }}>Ninguém eliminado ainda.</div>
        ) : null}
      </div>

      {/* Encerrar → cálculo de prêmios e pagamentos */}
      <div style={{ marginTop: 22 }}>
        <Button variant="primary" icon="flag" block onClick={() => go('pagamentos')}>Encerrar torneio</Button>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center', marginTop: 8 }}>Calcula prêmios, caixinha e quem paga quem.</div>
      </div>

      {/* Action sheet — steppers add and undo rebuys/add-ons */}
      {selP && step === 'actions' && (
        <Sheet open onClose={close} leading={<Avatar name={selP.name} />} title={selP.name}
          subtitle={`${selP.rebuys || 0} ${(selP.rebuys || 0) === 1 ? 'rebuy' : 'rebuys'} · ${selP.addons || 0} ${(selP.addons || 0) === 1 ? 'add-on' : 'add-ons'}`}>
          <div style={{ display: 'grid', gap: 8 }}>
            <DbStepper icon={DB_REPEAT} label="Rebuys" sub={`R$ ${t.buyIn},00 cada · toque − para desfazer`} value={selP.rebuys || 0}
              onMinus={() => adjust(selP.id, 'rebuys', -1)} onPlus={() => adjust(selP.id, 'rebuys', +1)} />
            <DbStepper icon={DB_PLUS} label="Add-ons" sub={`R$ ${t.buyIn},00 cada · toque − para desfazer`} value={selP.addons || 0}
              onMinus={() => adjust(selP.id, 'addons', -1)} onPlus={() => adjust(selP.id, 'addons', +1)} />
            <Button variant="outline" icon="user-check" block onClick={() => fire(`${selP.name}: check-in confirmado`)}>Check-in</Button>
            <Button variant="destructive" icon="skull" block onClick={() => setStep('eliminate')}>Eliminar</Button>
          </div>
        </Sheet>
      )}

      {/* Eliminate — pick who eliminated */}
      {selP && step === 'eliminate' && (
        <Sheet open onClose={close} title={`Quem eliminou ${selP.name}?`} subtitle="Toque no responsável pela eliminação">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inPlay.filter((p) => p.id !== selP.id).map((p) => (
              <button key={p.id} onClick={() => eliminate(selP, p)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', textAlign: 'left' }}>
                <Avatar name={p.name} size={36} />
                <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--foreground)' }}>{p.name}</span>
                <DbIcon d={['m9 18 6-6-6-6']} size={16} color="var(--muted-foreground)" />
              </button>
            ))}
            <Button variant="ghost" block onClick={() => setStep('actions')}>Voltar</Button>
          </div>
        </Sheet>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 84, zIndex: 70, background: 'var(--felt-700)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)' }}>
          <DbIcon d={['M21.801 10A10 10 0 1 1 17 3.335', 'm9 11 3 3L22 4']} size={18} color="var(--positive)" />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

window.PHDashboard = PHDashboard;
window.PHDbIcon = DbIcon;
window.PHDbCount = DbCount;
