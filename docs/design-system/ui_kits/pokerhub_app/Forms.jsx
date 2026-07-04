/* PokerHub UI kit — Cadastro forms (Criar Liga · Criar Torneio).
   Field primitives are local to the kit (token-styled) and shared via
   window.PH* with the other screens (Caixinha, Admin). */

(function injectFormCss() {
  if (document.getElementById('phf-css')) return;
  const s = document.createElement('style');
  s.id = 'phf-css';
  s.textContent = `
.phf-input{
  width:100%;height:46px;padding:0 14px;border-radius:var(--radius-md);
  border:1px solid var(--input);background:color-mix(in oklab, var(--card) 55%, transparent);
  color:var(--foreground);font-family:var(--font-display);font-size:15px;outline:none;
  transition:border-color var(--dur-fast),box-shadow var(--dur-fast);
  -webkit-appearance:none;appearance:none;color-scheme:dark;box-sizing:border-box;
}
[data-theme="light"] .phf-input{color-scheme:light;}
.phf-input:focus{border-color:var(--ring);box-shadow:0 0 0 3px color-mix(in oklab, var(--ring) 20%, transparent);}
.phf-input::placeholder{color:var(--ink-600);}
.phf-input--mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums;}
textarea.phf-input{height:auto;padding:12px 14px;resize:none;line-height:1.45;}
.phf-label{display:block;font-family:var(--font-display);font-size:11px;font-weight:600;
  text-transform:uppercase;letter-spacing:0.07em;color:var(--muted-foreground);margin-bottom:7px;}
`;
  document.head.appendChild(s);
})();

/* Labeled input. mono=numbers; prefix renders "R$" inside the field. */
function PHInput({ label, mono, prefix, area, style, ...props }) {
  const cls = `phf-input${mono ? ' phf-input--mono' : ''}`;
  return (
    <div style={style}>
      {label ? <label className="phf-label">{label}</label> : null}
      {prefix ? (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--muted-foreground)', pointerEvents: 'none' }}>{prefix}</span>
          <input className={cls} style={{ paddingLeft: 14 + prefix.length * 9 + 8 }} {...props} />
        </div>
      ) : area ? (
        <textarea className={cls} rows={3} {...props}></textarea>
      ) : (
        <input className={cls} {...props} />
      )}
    </div>
  );
}

/* Full-width switch row (≥44px target). */
function PHSwitch({ label, sub, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 48, padding: '10px 2px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--foreground)' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14.5 }}>{label}</span>
        {sub ? <span style={{ display: 'block', fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{sub}</span> : null}
      </span>
      <span aria-hidden style={{ width: 42, height: 24, borderRadius: 999, padding: 2, flexShrink: 0, boxSizing: 'border-box', background: checked ? 'var(--primary)' : 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: checked ? 'flex-end' : 'flex-start', transition: 'background var(--dur-fast)' }}>
        <span style={{ width: 18, height: 18, borderRadius: '50%', background: checked ? 'var(--primary-foreground)' : 'var(--muted-foreground)' }}></span>
      </span>
    </button>
  );
}

/* Segmented chip picker (e.g. % da caixinha). */
function PHChips({ label, options, value, onChange, render }) {
  return (
    <div>
      {label ? <label className="phf-label">{label}</label> : null}
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map((o) => {
          const active = o === value;
          return (
            <button key={o} type="button" onClick={() => onChange(o)}
              style={{ flex: 1, height: 38, borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13.5,
                border: `1px solid ${active ? 'color-mix(in oklab, var(--gold-500) 45%, var(--border))' : 'var(--border)'}`,
                background: active ? 'color-mix(in oklab, var(--gold-500) 14%, var(--card))' : 'transparent',
                color: active ? 'var(--gold-400)' : 'var(--muted-foreground)' }}>
              {render ? render(o) : o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Shared sub-screen header. */
function PHFormHeader({ title, sub, onBack }) {
  const { IconButton } = window.PokerHubDesignSystem_b95f9b;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <IconButton icon="arrow-left" onClick={onBack} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>{title}</div>
        {sub ? <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{sub}</div> : null}
      </div>
    </div>
  );
}

/* ---- Criar Liga -------------------------------------------------------- */
function PHLigaForm({ go }) {
  const { Button, Card } = window.PokerHubDesignSystem_b95f9b;
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [blockDebt, setBlockDebt] = React.useState(true);
  const [pct, setPct] = React.useState(10);

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      <PHFormHeader title="Criar liga" sub="Sua liga, suas regras" onBack={() => go('lobby')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PHInput label="Nome da liga" placeholder="Ex.: Liga dos Amigos" value={name} onChange={(e) => setName(e.target.value)} />
        <PHInput label="Descrição (opcional)" area placeholder="Torneio toda sexta, buy-in leve, vale o churrasco." value={desc} onChange={(e) => setDesc(e.target.value)} />
        <Card pad="md">
          <PHSwitch label="Bloquear check-in com débitos" sub="Jogador com pagamento pendente não entra no próximo torneio" checked={blockDebt} onChange={setBlockDebt} />
        </Card>
        <PHChips label="Caixinha — % do prize pool" options={[0, 5, 10, 15]} value={pct} onChange={setPct} render={(o) => `${o}%`} />
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.45, marginTop: -6 }}>
          A caixinha acumula essa fatia de cada prize pool para torneios especiais e despesas da liga.
        </div>
        <div style={{ height: 4 }}></div>
        <Button variant="primary" icon="check" block disabled={!name.trim()} onClick={() => go('lobby')}>Criar liga</Button>
        <Button variant="ghost" block onClick={() => go('lobby')}>Cancelar</Button>
      </div>
    </div>
  );
}

Object.assign(window, { PHInput, PHSwitch, PHChips, PHFormHeader, PHLigaForm });
