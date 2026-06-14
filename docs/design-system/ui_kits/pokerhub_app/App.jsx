/* PokerHub UI kit — App shell (phone frame + routing + bottom nav) */

/* Theme: persisted light/dark, applied to <html data-theme>. */
window.PHTheme = {
  get() { try { return localStorage.getItem('ph-theme') || 'dark'; } catch (e) { return 'dark'; } },
  set(t) { try { localStorage.setItem('ph-theme', t); } catch (e) {} document.documentElement.setAttribute('data-theme', t); },
  toggle() { const next = this.get() === 'dark' ? 'light' : 'dark'; this.set(next); return next; },
};

const PH_NAV = [
  { key: 'ligas',   label: 'Ligas',   icon: 'layers' },
  { key: 'torneio', label: 'Torneio', icon: 'timer' },
  { key: 'debitos', label: 'Débitos', icon: 'wallet', dot: true },
  { key: 'ranking', label: 'Ranking', icon: 'trending-up' },
  { key: 'perfil',  label: 'Perfil',  icon: 'user' },
];

const NAV_TO_ROUTE = { ligas: 'lobby', torneio: 'timer', debitos: 'settlement', ranking: 'ranking', perfil: 'perfil' };
const ROUTE_TO_NAV = {
  home: 'ligas', lobby: 'ligas', timer: 'torneio', dashboard: 'torneio', settlement: 'debitos',
  ranking: 'ranking', perfil: 'perfil', tv: 'torneio',
  caixinha: 'perfil', admin: 'perfil', 'liga-create': 'ligas', 'torneio-create': 'torneio', 'torneio-edit': 'torneio', 'torneio-detalhe': 'torneio', pagamentos: 'debitos',
};

function Perfil({ go }) {
  const { Card, Avatar, Button, MoneyValue, Sheet } = window.PokerHubDesignSystem_b95f9b;
  const [theme, setTheme] = React.useState(window.PHTheme.get());
  const toggleTheme = () => setTheme(window.PHTheme.toggle());
  // Cadastro do WhatsApp — usado para lembretes de pagamento e avisos
  const [whats, setWhats] = React.useState('');
  const [whatsSheet, setWhatsSheet] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const PHInputP = window.PHInput;
  const fmtPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };
  return (
    <div style={{ padding: '14px 16px 96px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0 8px' }}>
        <Avatar name="Você Org" size={72} badgeIcon="crown" badgeGold />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Você</div>
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Organizador · Liga dos Amigos</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '8px 0 16px' }}>
        <Card pad="md"><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24 }}>R$ 1.840</div><div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Lucro na temporada</div></Card>
        <Card pad="md"><div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24 }}>62%</div><div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>ITM</div></Card>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Aparência — theme toggle */}
        <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--foreground)', textAlign: 'left', width: '100%' }}>
          <i data-lucide={theme === 'dark' ? 'moon-star' : 'sun'} style={{ color: 'var(--gold-400)' }}></i>
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15 }}>Aparência</span>
          <span style={{ fontSize: 13, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
          <span style={{ width: 42, height: 24, borderRadius: 999, padding: 2, background: theme === 'dark' ? 'var(--secondary)' : 'var(--gold-500)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: theme === 'dark' ? 'flex-start' : 'flex-end', transition: 'background var(--dur-fast)' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: theme === 'dark' ? 'var(--muted-foreground)' : 'var(--primary-foreground)' }}></span>
          </span>
        </button>
        {/* Organização da liga + conta */}
        {[['settings-2', 'Administração da liga', () => go('admin'), null],
          ['piggy-bank', 'Caixinha da liga', () => go('caixinha'), `R$ ${window.PH_DATA.caixinha.balance.toLocaleString('pt-BR')}`],
          ['key-round', 'Minha chave PIX', null, null],
          ['message-circle', 'WhatsApp', () => { setDraft(whats); setWhatsSheet(true); }, whats || 'Adicionar'],
          ['bell', 'Notificações', null, null],
          ['log-out', 'Sair', null, null]].map(([ic, lbl, onClick, trail]) => (
          <button key={lbl} onClick={onClick || undefined} disabled={!onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: onClick ? 'pointer' : 'default', color: 'var(--foreground)', textAlign: 'left', width: '100%' }}>
            <i data-lucide={ic} style={{ color: 'var(--muted-foreground)' }}></i>
            <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15 }}>{lbl}</span>
            {trail ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13.5, color: 'var(--gold-400)', whiteSpace: 'nowrap' }}>{trail}</span> : null}
            <i data-lucide="chevron-right" style={{ color: 'var(--muted-foreground)' }}></i>
          </button>
        ))}
      </div>

      {/* Cadastro do WhatsApp */}
      {whatsSheet && (
        <Sheet open onClose={() => setWhatsSheet(false)} title="Cadastrar WhatsApp" subtitle="Usado para lembretes de pagamento e avisos de torneio">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PHInputP label="Número com DDD" mono type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={draft} onChange={(e) => setDraft(fmtPhone(e.target.value))} />
            <Button variant="primary" block disabled={draft.replace(/\D/g, '').length < 10} onClick={() => { setWhats(draft); setWhatsSheet(false); }}>Salvar</Button>
            {whats ? <Button variant="ghost" block onClick={() => { setWhats(''); setDraft(''); setWhatsSheet(false); }}>Remover número</Button> : null}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function App() {
  const { BottomNav } = window.PokerHubDesignSystem_b95f9b;
  const [route, setRoute] = React.useState('home');
  const [splash, setSplash] = React.useState(true); // abertura do app — uma vez por load
  const go = (r) => { setRoute(r); const el = document.getElementById('ph-screen'); if (el) el.scrollTop = 0; };
  const onNav = (key) => go(NAV_TO_ROUTE[key]);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const screens = {
    home: window.PHHome,
    lobby: window.PHLobby,
    timer: window.PHTimerTab,
    dashboard: window.PHDashboard,
    settlement: window.PHSettlement,
    ranking: window.PHRanking,
    perfil: Perfil,
    caixinha: window.PHCaixinha,
    admin: window.PHAdmin,
    'liga-create': window.PHLigaForm,
    'torneio-create': window.PHTorneioWizard,
    'torneio-edit': (props) => <window.PHTorneioWizard {...props} edit />,
    'torneio-detalhe': window.PHTorneioDetalhe,
    pagamentos: window.PHPagamentos,
  };
  const Screen = screens[route] || window.PHHome;

  return (
    <div className="ph-page">
      <div className="ph-phone">
        <div id="ph-screen" className="ph-screen">
          <Screen go={go} />
        </div>
        {route !== 'tv' ? <BottomNav items={PH_NAV} active={ROUTE_TO_NAV[route]} onSelect={onNav} /> : null}
        {splash ? <window.PHSplash onDone={() => setSplash(false)} /> : null}
      </div>
      {route === 'tv' ? <window.PHTimerTV onExit={() => go('timer')} /> : null}
      <div className="ph-hint">Toque em <b>Operar</b> no card ao vivo para o painel do organizador · <b>Assistir</b> abre o timer · ícone <b>TV</b> = modo tela cheia<br /><a href="desktop.html" style={{ color: 'var(--gold-400)', fontWeight: 600, textDecoration: 'none' }}>Abrir versão PC →</a></div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
