/* PokerHub UI kit — Desktop: Wizard de criar torneio (5 passos).
   Espelha o TorneioWizard mobile: Informações · Valores · Blinds ·
   Premiação · Confirmação — em layout PC (rail de passos + conteúdo). */

const DK_WIZ_STEPS = ['Informações', 'Valores', 'Blinds', 'Premiação', 'Confirmação'];
const DK_BLIND_TPL = { turbo: { label: 'Turbo', min: 10 }, regular: { label: 'Regular', min: 15 }, deep: { label: 'Deep', min: 20 } };

function dkBlindLevels(tpl) {
  const sbs = [25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1000, 1500];
  const min = (DK_BLIND_TPL[tpl] || DK_BLIND_TPL.regular).min;
  return sbs.map((sb, i) => ({ lvl: i + 1, sb, bb: sb * 2, ante: i >= 3 ? Math.max(25, Math.round(sb / 4 / 25) * 25) : 0, min, pause: i === 5 }));
}

function DkWizard({ go }) {
  const { Card, Button, Badge, MoneyValue } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const PHInputD = window.PHInput, PHSwitchD = window.PHSwitch, PHChipsD = window.PHChips;

  const [step, setStep] = React.useState(0);
  const [nome, setNome] = React.useState('');
  const [copyFrom, setCopyFrom] = React.useState('');
  const [buyIn, setBuyIn] = React.useState('50');
  const [stack, setStack] = React.useState('10000');
  const [rebuy, setRebuy] = React.useState(true);
  const [rebuyVal, setRebuyVal] = React.useState('50');
  const [rebuyLvl, setRebuyLvl] = React.useState(4);
  const [addon, setAddon] = React.useState(true);
  const [addonVal, setAddonVal] = React.useState('50');
  const [lateCk, setLateCk] = React.useState(true);
  const [tpl, setTpl] = React.useState('regular');
  const [prizes, setPrizes] = React.useState([50, 30, 20]);

  const applyCopy = (id) => {
    setCopyFrom(id);
    const p = D.pastTournaments.find((x) => x.id === id);
    if (!p) return;
    setNome(p.name); setBuyIn(String(p.buyIn)); setStack(String(p.stack));
    setRebuy(p.rebuy); setRebuyVal(String(p.rebuyVal)); setRebuyLvl(p.rebuyLvl);
    setAddon(p.addon); setAddonVal(String(p.addonVal)); setTpl(p.blinds); setPrizes([...p.prize]);
  };

  const prizeSum = prizes.reduce((a, b) => a + (parseInt(b, 10) || 0), 0);
  const setPrize = (i, v) => setPrizes((ps) => ps.map((x, j) => (j === i ? (v === '' ? '' : Math.max(0, Math.min(100, parseInt(v, 10) || 0))) : x)));
  const canNext = step === 0 ? nome.trim().length > 0 : step === 3 ? prizeSum === 100 : true;
  const label = (txt) => <label className="phf-label">{txt}</label>;

  const summary = [
    ['Nome', nome || '—'], ['Buy-in', `R$ ${buyIn}`], ['Stack inicial', Number(stack).toLocaleString('pt-BR')],
    ['Rebuy', rebuy ? `R$ ${rebuyVal} · até nível ${rebuyLvl}` : 'Não'],
    ['Add-on', addon ? `R$ ${addonVal}` : 'Não'],
    ['Check-in tardio', lateCk ? 'Permitido' : 'Não'],
    ['Blinds', `${DK_BLIND_TPL[tpl].label} · ${DK_BLIND_TPL[tpl].min} min/nível`],
    ['Premiação', prizes.map((p, i) => `${i + 1}º ${p}%`).join(' · ')],
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 24, maxWidth: 880, alignItems: 'start' }}>
      {/* Rail de passos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 0 }}>
        {DK_WIZ_STEPS.map((s, i) => {
          const on = i === step, done = i < step;
          return (
            <button key={s} onClick={() => { if (i < step) setStep(i); }}
              style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 0, cursor: i < step ? 'pointer' : 'default', textAlign: 'left',
                background: on ? 'color-mix(in oklab, var(--gold-500) 14%, transparent)' : 'transparent',
                color: on ? 'var(--gold-400)' : done ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
              <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12,
                background: done ? 'var(--positive)' : on ? 'var(--gold-500)' : 'var(--secondary)',
                color: done || on ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                border: done || on ? 0 : '1px solid var(--border)' }}>
                {done ? <window.DkIcon name="check" size={13} /> : i + 1}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{s}</span>
            </button>
          );
        })}
        <Button variant="ghost" size="sm" onClick={() => go('inicio')} style={{ marginTop: 10 }}>Cancelar</Button>
      </div>

      {/* Conteúdo do passo */}
      <Card pad="lg">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{DK_WIZ_STEPS[step]}</div>

        {step === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              {label('Copiar configurações de…')}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {D.pastTournaments.map((p) => (
                  <button key={p.id} onClick={() => applyCopy(p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      border: `1px solid ${copyFrom === p.id ? 'color-mix(in oklab, var(--gold-500) 45%, var(--border))' : 'var(--border)'}`,
                      background: copyFrom === p.id ? 'color-mix(in oklab, var(--gold-500) 12%, var(--card))' : 'transparent',
                      color: copyFrom === p.id ? 'var(--gold-400)' : 'var(--muted-foreground)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                    <window.DkIcon name="copy" size={13} />{p.name}
                  </button>
                ))}
              </div>
            </div>
            <PHInputD label="Nome do torneio" placeholder="Ex.: Torneio da Sexta" value={nome} onChange={(e) => setNome(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <PHInputD label="Data" type="date" mono defaultValue="2026-06-12" />
              <PHInputD label="Horário" type="time" mono defaultValue="20:00" />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <PHInputD label="Buy-in" mono prefix="R$" inputMode="numeric" value={buyIn} onChange={(e) => setBuyIn(e.target.value.replace(/\D/g, ''))} />
              <PHInputD label="Stack inicial" mono inputMode="numeric" value={stack} onChange={(e) => setStack(e.target.value.replace(/\D/g, ''))} />
            </div>
            <PHSwitchD label="Permitir rebuy" sub="Recompra após eliminação, até o nível limite" checked={rebuy} onChange={setRebuy} />
            {rebuy ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingLeft: 2 }}>
                <PHInputD label="Valor do rebuy" mono prefix="R$" inputMode="numeric" value={rebuyVal} onChange={(e) => setRebuyVal(e.target.value.replace(/\D/g, ''))} />
                <PHChipsD label="Até o nível" options={[3, 4, 5, 6]} value={rebuyLvl} onChange={setRebuyLvl} />
              </div>
            ) : null}
            <PHSwitchD label="Permitir add-on" sub="Compra extra única no fim do período de rebuy" checked={addon} onChange={setAddon} />
            {addon ? <PHInputD label="Valor do add-on" mono prefix="R$" inputMode="numeric" value={addonVal} onChange={(e) => setAddonVal(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: 220 }} /> : null}
            <PHSwitchD label="Check-in tardio" sub="Jogador pode entrar com o torneio já em andamento" checked={lateCk} onChange={setLateCk} />
          </div>
        ) : null}

        {step === 2 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PHChipsD label="Estrutura" options={['turbo', 'regular', 'deep']} value={tpl} onChange={setTpl}
              render={(o) => `${DK_BLIND_TPL[o].label} ${DK_BLIND_TPL[o].min}'`} />
            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Nível', 'Blinds', 'Ante', 'Duração'].map((c, i) => (
                    <th key={c} style={{ position: 'sticky', top: 0, background: 'var(--card)', textAlign: i === 0 ? 'left' : 'right', padding: '10px 14px', fontFamily: 'var(--font-display)', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)' }}>{c}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {dkBlindLevels(tpl).map((l) => (
                    <React.Fragment key={l.lvl}>
                      <tr>
                        <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{l.lvl}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--gold-400)' }}>{l.sb}/{l.bb}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted-foreground)' }}>{l.ante || '—'}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{l.min} min</td>
                      </tr>
                      {l.pause ? (
                        <tr><td colSpan="4" style={{ padding: '7px 14px', textAlign: 'center', fontSize: 11.5, fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--warning)', background: 'color-mix(in oklab, var(--warning) 8%, transparent)' }}>Intervalo · 10 min</td></tr>
                      ) : null}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Percentual do prize pool por posição. A soma precisa fechar em <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }}>100%</b>.</div>
            {prizes.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 34, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: i === 0 ? 'var(--podium-gold)' : 'var(--muted-foreground)' }}>{i + 1}º</span>
                <input className="phf-input phf-input--mono" style={{ width: 110 }} inputMode="numeric" value={p} onChange={(e) => setPrize(i, e.target.value.replace(/\D/g, ''))} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--muted-foreground)' }}>%</span>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--secondary)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, parseInt(p, 10) || 0)}%`, height: '100%', borderRadius: 999, background: i === 0 ? 'var(--gold-500)' : 'var(--felt-600)' }}></div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" icon="plus" disabled={prizes.length >= 5} onClick={() => setPrizes((ps) => [...ps, 0])}>Posição</Button>
              <Button variant="ghost" size="sm" icon="minus" disabled={prizes.length <= 1} onClick={() => setPrizes((ps) => ps.slice(0, -1))}>Remover</Button>
              <div style={{ flex: 1 }}></div>
              <Badge tone={prizeSum === 100 ? 'positive' : 'warning'} icon={prizeSum === 100 ? 'check' : 'alert-triangle'}>Soma {prizeSum}%</Badge>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {summary.map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '11px 0', borderTop: i ? '1px solid var(--border)' : 0 }}>
                <span style={{ width: 150, flexShrink: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'color-mix(in oklab, var(--gold-500) 10%, var(--card))', border: '1px solid var(--border)', fontSize: 13, color: 'var(--muted-foreground)' }}>
              {D.caixinha.percent}% do prize pool vai para a caixinha da liga, conforme as regras da {D.league.name}.
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {step > 0 ? <Button variant="ghost" icon="arrow-left" onClick={() => setStep((s) => s - 1)}>Voltar</Button> : null}
          {step < 4
            ? <Button variant="primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continuar</Button>
            : <Button variant="primary" icon="check" onClick={() => go('torneio')}>Criar torneio</Button>}
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { DkWizard });
