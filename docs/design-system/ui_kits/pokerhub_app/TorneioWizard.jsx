/* PokerHub UI kit — Criar/Configurar Torneio: wizard em 5 passos,
   espelhando Torneio/Create.razor: Informações · Valores · Blinds ·
   Premiação · Confirmação. Inclui "copiar configurações" de um torneio
   anterior e templates de estrutura de blinds. */

/* Gera a estrutura de níveis a partir do template. */
function phGenBlinds(durationMin, breakEvery) {
  const sbs = [25, 50, 75, 100, 150, 200, 300, 400, 500, 600, 800, 1000];
  const rows = [];
  let level = 1;
  sbs.forEach((sb, i) => {
    rows.push({ level: level++, sb, bb: sb * 2, ante: i >= 3 ? Math.round(sb / 4 / 25) * 25 : 0, min: durationMin, type: 'jogo' });
    if (breakEvery && (i + 1) % breakEvery === 0 && i < sbs.length - 1) {
      rows.push({ level: level++, min: 10, type: 'intervalo' });
    }
  });
  return rows;
}

const PH_BLIND_TEMPLATES = {
  turbo:   { label: 'Turbo',      min: 10, breakEvery: 5 },
  regular: { label: 'Regular',    min: 15, breakEvery: 4 },
  deep:    { label: 'Deep stack', min: 20, breakEvery: 4 },
};

/* Linha de nível na lista de blinds. */
function PhBlindRow({ r, last }) {
  const isBreak = r.type === 'intervalo';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: last ? 0 : '1px solid var(--border)', background: isBreak ? 'color-mix(in oklab, var(--warning) 7%, transparent)' : 'transparent' }}>
      <span style={{ width: 26, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, color: 'var(--muted-foreground)', flexShrink: 0 }}>{r.level}</span>
      {isBreak ? (
        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intervalo</span>
      ) : (
        <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>{r.sb}/{r.bb}<span style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--muted-foreground)' }}>{r.ante ? ` · ante ${r.ante}` : ''}</span></span>
      )}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted-foreground)', flexShrink: 0, whiteSpace: 'nowrap' }}>{r.min} min</span>
    </div>
  );
}

/* Stepper numérico compacto (− valor +). */
function PhNumStep({ label, value, onChange, min = 1, max = 99, suffix }) {
  const btn = (d, dis) => (
    <button type="button" onClick={() => onChange(Math.min(max, Math.max(min, value + d)))} disabled={dis}
      style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--secondary)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 17, lineHeight: 1, opacity: dis ? 0.35 : 1, flexShrink: 0 }}>{d > 0 ? '+' : '−'}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--muted-foreground)' }}>{label}</span>
      {btn(-1, value <= min)}
      <span style={{ minWidth: 52, textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>{value}{suffix || ''}</span>
      {btn(+1, value >= max)}
    </div>
  );
}

function PHTorneioWizard({ go, edit }) {
  const { Button, Card, Badge } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const t = D.tournament;
  const PHInputW = window.PHInput;
  const PHSwitchW = window.PHSwitch;
  const FH = window.PHFormHeader;

  const STEPS = ['Informações', 'Valores', 'Blinds', 'Premiação', 'Confirmação'];
  const [step, setStep] = React.useState(0);
  const [copied, setCopied] = React.useState(null);

  // 1 · Informações
  const [name, setName] = React.useState(edit ? t.name : '');
  const [local, setLocal] = React.useState('');
  // 2 · Valores
  const [buyIn, setBuyIn] = React.useState(String(t.buyIn));
  const [stack, setStack] = React.useState('10000');
  const [rebuy, setRebuy] = React.useState(true);
  const [rebuyVal, setRebuyVal] = React.useState(String(t.buyIn));
  const [rebuyStack, setRebuyStack] = React.useState('10000');
  const [rebuyLvl, setRebuyLvl] = React.useState(4);
  const [addon, setAddon] = React.useState(true);
  const [addonVal, setAddonVal] = React.useState(String(t.buyIn));
  const [addonStack, setAddonStack] = React.useState('10000');
  const [lateCheckin, setLateCheckin] = React.useState(false);
  const [lateLvl, setLateLvl] = React.useState(2);
  // 3 · Blinds
  const [template, setTemplate] = React.useState('regular');
  const [customMin, setCustomMin] = React.useState(15);
  const [customBreak, setCustomBreak] = React.useState(4);
  // 4 · Premiação
  const [usePrizeTable, setUsePrizeTable] = React.useState(true);
  const [prizeMode, setPrizeMode] = React.useState('pct'); // 'pct' | 'fixo'
  const [positions, setPositions] = React.useState([50, 30, 20]);

  const blindCfg = template === 'custom'
    ? { label: 'Personalizado', min: customMin, breakEvery: customBreak }
    : PH_BLIND_TEMPLATES[template];
  const blinds = phGenBlinds(blindCfg.min, blindCfg.breakEvery);
  const prizeTotal = positions.reduce((s, p) => s + (p || 0), 0);
  const prizeOk = usePrizeTable || prizeMode === 'fixo' || prizeTotal === 100;

  const copyFrom = (pt) => {
    setName(edit ? name : pt.name);
    setBuyIn(String(pt.buyIn)); setStack(String(pt.stack));
    setRebuy(pt.rebuy); setRebuyVal(String(pt.rebuyVal || pt.buyIn)); setRebuyLvl(pt.rebuyLvl || 4);
    setAddon(pt.addon); setAddonVal(String(pt.addonVal || pt.buyIn));
    setTemplate(pt.blinds); setUsePrizeTable(false); setPositions([...pt.prize]);
    setCopied(pt.id);
  };

  const back = () => go(edit ? 'dashboard' : 'home');
  const canNext = step !== 0 || !!name.trim();
  const next = () => (step < 4 ? setStep(step + 1) : back());

  const num = (setter) => (e) => setter(e.target.value.replace(/\D/g, ''));
  const segBtn = (active, label, onClick, key) => (
    <button key={key || label} type="button" onClick={onClick}
      style={{ flex: 1, height: 36, border: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, background: active ? 'var(--felt-700)' : 'transparent', color: active ? 'var(--foreground)' : 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{label}</button>
  );

  const sumRow = (label, value, i, arr) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '11px 14px', borderBottom: i < arr - 1 ? '1px solid var(--border)' : 0 }}>
      <span style={{ fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13.5, textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      <FH title={edit ? 'Configurar torneio' : 'Criar torneio'} sub={`${step + 1}/5 · ${STEPS[step]}`} onBack={back} />

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => i < step && setStep(i)} title={s} style={{ flex: 1, height: 4, borderRadius: 999, border: 0, padding: 0, cursor: i < step ? 'pointer' : 'default', backgroundColor: i <= step ? 'var(--gold-500)' : 'var(--felt-700)' }}></button>
        ))}
      </div>

      {/* 1 · Informações */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!edit && (
            <Card pad="md">
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: 8 }}>Copiar configurações de</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {D.pastTournaments.map((pt) => {
                  const active = copied === pt.id;
                  return (
                    <button key={pt.id} type="button" onClick={() => copyFrom(pt)}
                      style={{ padding: '8px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap',
                        border: `1px solid ${active ? 'color-mix(in oklab, var(--gold-500) 45%, var(--border))' : 'var(--border)'}`,
                        background: active ? 'color-mix(in oklab, var(--gold-500) 14%, var(--card))' : 'transparent',
                        color: active ? 'var(--gold-400)' : 'var(--muted-foreground)' }}>{pt.name}</button>
                  );
                })}
              </div>
              {copied ? <div style={{ fontSize: 12, color: 'var(--positive)', marginTop: 8 }}>Buy-in, stacks, blinds e premiação copiados — revise os passos.</div> : null}
            </Card>
          )}
          <PHInputW label="Nome do torneio" placeholder="Ex.: Torneio da Sexta" value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PHInputW label="Data" type="date" defaultValue="2026-06-12" />
            <PHInputW label="Horário" type="time" defaultValue="20:00" />
          </div>
          <PHInputW label="Local (opcional)" placeholder="Casa do Caio" value={local} onChange={(e) => setLocal(e.target.value)} />
        </div>
      )}

      {/* 2 · Valores */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <PHInputW label="Buy-in" mono prefix="R$" inputMode="numeric" value={buyIn} onChange={num(setBuyIn)} />
            <PHInputW label="Stack inicial" mono inputMode="numeric" value={stack} onChange={num(setStack)} />
          </div>
          <Card pad="md">
            <PHSwitchW label="Permitir rebuy" sub="Recompra após perder as fichas" checked={rebuy} onChange={setRebuy} />
            {rebuy ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <PHInputW label="Valor do rebuy" mono prefix="R$" inputMode="numeric" value={rebuyVal} onChange={num(setRebuyVal)} />
                  <PHInputW label="Stack do rebuy" mono inputMode="numeric" value={rebuyStack} onChange={num(setRebuyStack)} />
                </div>
                <PhNumStep label="Permitido até o nível" value={rebuyLvl} onChange={setRebuyLvl} min={1} max={12} />
              </div>
            ) : null}
          </Card>
          <Card pad="md">
            <PHSwitchW label="Permitir add-on" sub="Compra extra única no fim do período de rebuy" checked={addon} onChange={setAddon} />
            {addon ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 6 }}>
                <PHInputW label="Valor do add-on" mono prefix="R$" inputMode="numeric" value={addonVal} onChange={num(setAddonVal)} />
                <PHInputW label="Stack do add-on" mono inputMode="numeric" value={addonStack} onChange={num(setAddonStack)} />
              </div>
            ) : null}
          </Card>
          <Card pad="md">
            <PHSwitchW label="Check-in tardio" sub="Permitir entrada após o início do torneio" checked={lateCheckin} onChange={setLateCheckin} />
            {lateCheckin ? (
              <div style={{ paddingTop: 6 }}>
                <PhNumStep label="Check-in até o nível" value={lateLvl} onChange={setLateLvl} min={1} max={8} />
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {/* 3 · Blinds */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Escolha um template ou configure manualmente.</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--secondary)', padding: 4, borderRadius: 'var(--radius-md)' }}>
            {segBtn(template === 'turbo', 'Turbo 10’', () => setTemplate('turbo'))}
            {segBtn(template === 'regular', 'Regular 15’', () => setTemplate('regular'))}
            {segBtn(template === 'deep', 'Deep 20’', () => setTemplate('deep'))}
            {segBtn(template === 'custom', 'Custom', () => setTemplate('custom'))}
          </div>
          {template === 'custom' ? (
            <Card pad="md">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <PhNumStep label="Duração de cada nível" value={customMin} onChange={setCustomMin} min={5} max={45} suffix=" min" />
                <PhNumStep label="Intervalo a cada" value={customBreak} onChange={setCustomBreak} min={2} max={8} suffix=" níveis" />
              </div>
            </Card>
          ) : null}
          <Card pad="none">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 26, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)', flexShrink: 0 }}>Nv</span>
              <span style={{ flex: 1, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>Blinds · ante</span>
              <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>Duração</span>
            </div>
            {blinds.map((r, i) => <PhBlindRow key={r.level} r={r} last={i === blinds.length - 1} />)}
          </Card>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
            {blinds.filter((b) => b.type === 'jogo').length} níveis · intervalos de 10 min · duração estimada ~{Math.round(blinds.reduce((s, b) => s + b.min, 0) / 60)}h
          </div>
        </div>
      )}

      {/* 4 · Premiação */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad="md">
            <PHSwitchW label="Usar tabela de premiação da liga" sub="1º 50% · 2º 30% · 3º 20% (prioritário)" checked={usePrizeTable} onChange={setUsePrizeTable} />
          </Card>
          {!usePrizeTable ? (
            <React.Fragment>
              <div style={{ display: 'flex', gap: 4, background: 'var(--secondary)', padding: 4, borderRadius: 'var(--radius-md)' }}>
                {segBtn(prizeMode === 'pct', 'Percentual', () => setPrizeMode('pct'))}
                {segBtn(prizeMode === 'fixo', 'Valor fixo (R$)', () => setPrizeMode('fixo'))}
              </div>
              <Card pad="md">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {positions.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 64, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', color: i === 0 ? 'var(--podium-gold)' : i === 1 ? 'var(--podium-silver)' : i === 2 ? 'var(--podium-bronze)' : 'var(--muted-foreground)', flexShrink: 0 }}>{i + 1}º lugar</span>
                      <div style={{ flex: 1 }}>
                        <PHInputW mono prefix={prizeMode === 'fixo' ? 'R$' : undefined} inputMode="numeric" value={String(p)}
                          onChange={(e) => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0; setPositions((ps) => ps.map((x, j) => (j === i ? v : x))); }} />
                      </div>
                      {prizeMode === 'pct' ? <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)', fontSize: 14 }}>%</span> : null}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="outline" size="sm" icon="plus" onClick={() => setPositions((ps) => [...ps, 0])}>Posição</Button>
                    <Button variant="ghost" size="sm" icon="minus" disabled={positions.length <= 1} onClick={() => setPositions((ps) => ps.slice(0, -1))}>Remover</Button>
                  </div>
                </div>
              </Card>
              {prizeMode === 'pct' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: prizeTotal === 100 ? 'color-mix(in oklab, var(--positive) 8%, transparent)' : 'color-mix(in oklab, var(--warning) 8%, transparent)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: prizeTotal === 100 ? 'var(--positive)' : 'var(--warning)' }}>{prizeTotal}%</span>
                  <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{prizeTotal === 100 ? 'Tudo certo — soma 100%.' : 'A soma precisa fechar em 100%.'}</span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '0 2px' }}>Total fixo: R$ {prizeTotal.toLocaleString('pt-BR')} — o restante do prize pool segue para o 1º lugar.</div>
              )}
            </React.Fragment>
          ) : null}
        </div>
      )}

      {/* 5 · Confirmação */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad="none">
            {[
              ['Nome', name || '—'],
              ['Data · hora', '12/06 · 20:00'],
              ['Local', local || '—'],
              ['Buy-in', `R$ ${buyIn || 0} · stack ${Number(stack || 0).toLocaleString('pt-BR')}`],
              ['Rebuy', rebuy ? `R$ ${rebuyVal} · até nível ${rebuyLvl}` : 'não'],
              ['Add-on', addon ? `R$ ${addonVal}` : 'não'],
              ['Check-in tardio', lateCheckin ? `até nível ${lateLvl}` : 'não'],
              ['Blinds', `${blindCfg.label} · ${blindCfg.min} min · ${blinds.filter((b) => b.type === 'jogo').length} níveis`],
              ['Premiação', usePrizeTable ? 'tabela da liga (50/30/20)' : positions.map((p, i) => `${i + 1}º ${p}${prizeMode === 'pct' ? '%' : ''}`).join(' · ')],
            ].map(([l, v], i, a) => sumRow(l, v, i, a.length))}
          </Card>
          {!prizeOk ? <div style={{ fontSize: 12.5, color: 'var(--warning)' }}>Atenção: a premiação não soma 100% — volte ao passo 4.</div> : null}
        </div>
      )}

      {/* Footer nav */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        {step > 0 ? <Button variant="secondary" block onClick={() => setStep(step - 1)}>Voltar</Button> : <Button variant="ghost" block onClick={back}>Cancelar</Button>}
        <Button variant="primary" block disabled={!canNext || (step === 4 && !prizeOk)} onClick={next}>
          {step === 4 ? (edit ? 'Salvar' : 'Criar torneio') : 'Próximo'}
        </Button>
      </div>
    </div>
  );
}

window.PHTorneioWizard = PHTorneioWizard;
