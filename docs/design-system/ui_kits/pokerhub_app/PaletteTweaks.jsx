/* PokerHub UI kit — painel de Tweaks (paletas do tema claro + tema).
   Compartilhado entre index.html (mobile) e desktop.html.
   Aplica <html data-palette="…"> e persiste em localStorage('ph-palette')
   para que a escolha sobreviva entre as duas versões e ao reload. */

const PH_PALETTES = [
  { id: 'meia-noite', label: 'Meia-noite (atual)', dots: ['oklch(0.972 0.004 85)', 'oklch(1 0 0)', 'oklch(0.640 0.110 76)', 'oklch(0.545 0.090 160)'] },
  { id: 'tinta',      label: 'Tinta firme',        dots: ['oklch(0.952 0.005 85)', 'oklch(0.175 0.012 80)', 'oklch(0.505 0.118 72)', 'oklch(0.500 0.105 158)'] },
  { id: 'feltro',     label: 'Feltro de dia',      dots: ['oklch(0.958 0.013 165)', 'oklch(0.215 0.022 175)', 'oklch(0.525 0.112 74)', 'oklch(0.520 0.100 162)'] },
  { id: 'clube',      label: 'Clube diurno',       dots: ['oklch(0.952 0.022 88)', 'oklch(0.215 0.022 70)', 'oklch(0.520 0.132 72)', 'oklch(0.635 0.128 80)'] },
];

const PH_ACCENTS = [
  { id: 'champanhe', label: 'Champanhe (atual)', dot: 'oklch(0.795 0.092 86)' },
  { id: 'ouro',      label: 'Ouro vivo',         dot: 'oklch(0.770 0.142 80)' },
  { id: 'cobre',     label: 'Cobre',             dot: 'oklch(0.710 0.145 55)' },
  { id: 'vinho',     label: 'Vinho',             dot: 'oklch(0.600 0.150 18)' },
];

function phApplyPalette(id) {
  const root = document.documentElement;
  if (!id || id === 'meia-noite') root.removeAttribute('data-palette');
  else root.setAttribute('data-palette', id);
  try { localStorage.setItem('ph-palette', id || 'meia-noite'); } catch (e) {}
}

function phApplyAccent(id) {
  const root = document.documentElement;
  if (!id || id === 'champanhe') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', id);
  try { localStorage.setItem('ph-accent', id || 'champanhe'); } catch (e) {}
}

/* Custom palette picker — label + 4 swatch dots per option. */
function PHPaletteOption({ p, active, onPick }) {
  return (
    <button onClick={() => onPick(p.id)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 8, cursor: 'default',
        border: active ? '1.5px solid rgba(41,38,27,.75)' : '.5px solid rgba(0,0,0,.12)',
        background: active ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.45)', font: 'inherit', color: 'inherit', textAlign: 'left' }}>
      <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {p.dots.map((c, i) => <span key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: c, border: '.5px solid rgba(0,0,0,.18)' }}></span>)}
      </span>
      <span style={{ flex: 1, fontWeight: active ? 600 : 500 }}>{p.label}</span>
    </button>
  );
}

function PHPaletteTweaks() {
  const getStored = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const [t, setTweak] = window.useTweaks({
    palette: getStored('ph-palette', 'meia-noite'),
    accent: getStored('ph-accent', 'champanhe'),
    theme: getStored('ph-theme', 'dark'),
  });

  /* Aplicar paleta + acento + tema quando os tweaks mudam. */
  React.useEffect(() => { phApplyPalette(t.palette); }, [t.palette]);
  React.useEffect(() => { phApplyAccent(t.accent); }, [t.accent]);
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.theme);
    try { localStorage.setItem('ph-theme', t.theme); } catch (e) {}
  }, [t.theme]);

  /* O app também troca o tema (Perfil / topo) — manter o painel em sincronia. */
  React.useEffect(() => {
    const obs = new MutationObserver(() => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      if (cur !== t.theme) setTweak('theme', cur);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [t.theme, setTweak]);

  const { TweaksPanel, TweakSection, TweakRadio } = window;
  return (
    <TweaksPanel>
      <TweakSection label="Tema" />
      <TweakRadio label="Modo" value={t.theme === 'dark' ? 'Escuro' : 'Claro'} options={['Escuro', 'Claro']}
        onChange={(v) => setTweak('theme', v === 'Escuro' ? 'dark' : 'light')} />
      <TweakSection label="Cor de destaque" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {PH_ACCENTS.map((a) => {
          const active = t.accent === a.id;
          return (
            <button key={a.id} onClick={() => setTweak('accent', a.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 8, cursor: 'default',
                border: active ? '1.5px solid rgba(41,38,27,.75)' : '.5px solid rgba(0,0,0,.12)',
                background: active ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.45)', font: 'inherit', color: 'inherit', textAlign: 'left' }}>
              <span style={{ width: 14, height: 14, flexShrink: 0, borderRadius: '50%', background: a.dot, border: '.5px solid rgba(0,0,0,.18)' }}></span>
              <span style={{ fontWeight: active ? 600 : 500, fontSize: 11, lineHeight: 1.15 }}>{a.label}</span>
            </button>
          );
        })}
      </div>
      <TweakSection label="Paleta do tema claro" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {PH_PALETTES.map((p) => (
          <PHPaletteOption key={p.id} p={p} active={t.palette === p.id}
            onPick={(id) => { setTweak('palette', id); if (t.theme !== 'light') setTweak('theme', 'light'); }} />
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: 'rgba(41,38,27,.55)', lineHeight: 1.4 }}>
        A cor de destaque vale para os dois temas. As paletas re-skinam só o tema claro;
        o escuro "meia-noite" é o canônico da marca. Escolher uma paleta já muda para o modo claro.
      </div>
    </TweaksPanel>
  );
}

/* Monta num root próprio — não interfere no app. */
(function mountPaletteTweaks() {
  const el = document.createElement('div');
  el.id = 'ph-tweaks-root';
  document.body.appendChild(el);
  ReactDOM.createRoot(el).render(<PHPaletteTweaks />);
})();
