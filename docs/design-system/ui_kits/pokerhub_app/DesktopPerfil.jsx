/* PokerHub UI kit — Desktop: Perfil (conta + preferências da liga). */

function DkPerfil({ go }) {
  const { Card, Avatar, Button, MoneyValue, StatTile } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const getTheme = () => { try { return localStorage.getItem('ph-theme') || 'dark'; } catch (e) { return 'dark'; } };
  const [theme, setTheme] = React.useState(getTheme());
  const [whats, setWhats] = React.useState('');
  const [pix, setPix] = React.useState('voce@pix.com');
  const [modal, setModal] = React.useState(null); // 'whats' | 'pix'
  const [draft, setDraft] = React.useState('');
  const PHInputD = window.PHInput;

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('ph-theme', next); } catch (e) {}
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
  };
  const fmtPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const row = (icon, label, trail, onClick) => (
    <button key={label} onClick={onClick || undefined} disabled={!onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', width: '100%', background: 'transparent', border: 0, borderTop: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default', color: 'var(--foreground)', textAlign: 'left' }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'var(--secondary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <window.DkIcon name={icon} size={18} style={{ color: 'var(--muted-foreground)' }} />
      <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14.5 }}>{label}</span>
      {trail ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--gold-400)', whiteSpace: 'nowrap' }}>{trail}</span> : null}
      {onClick ? <window.DkIcon name="chevron-right" size={16} style={{ color: 'var(--muted-foreground)' }} /> : null}
    </button>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(0, 1.2fr)', gap: 20, alignItems: 'start', maxWidth: 980 }}>
      {/* Identidade + stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card pad="lg">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <Avatar name="Você Org" size={84} badgeIcon="crown" badgeGold />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21 }}>Você</div>
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Organizador · {D.league.name}</div>
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatTile icon="trending-up" value={<MoneyValue value={1840} signed cents={false} size="19px" />} label="Lucro na temporada" tone="positive" center />
          <StatTile icon="target" value="62%" label="ITM" center />
        </div>
      </div>

      {/* Preferências */}
      <Card pad="none">
        {/* Aparência */}
        <button onClick={toggleTheme}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', width: '100%', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--foreground)', textAlign: 'left' }}>
          <window.DkIcon name={theme === 'dark' ? 'moon-star' : 'sun'} size={18} style={{ color: 'var(--gold-400)' }} />
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14.5 }}>Aparência</span>
          <span style={{ fontSize: 13, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
          <span style={{ width: 42, height: 24, borderRadius: 999, padding: 2, boxSizing: 'border-box', background: theme === 'dark' ? 'var(--secondary)' : 'var(--gold-500)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: theme === 'dark' ? 'flex-start' : 'flex-end', transition: 'background var(--dur-fast)' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: theme === 'dark' ? 'var(--muted-foreground)' : 'var(--primary-foreground)' }}></span>
          </span>
        </button>
        {row('settings-2', 'Administração da liga', null, () => go('admin'))}
        {row('piggy-bank', 'Caixinha da liga', `R$ ${D.caixinha.balance.toLocaleString('pt-BR')}`, () => go('caixinha'))}
        {row('key-round', 'Minha chave PIX', pix, () => { setDraft(pix); setModal('pix'); })}
        {row('message-circle', 'WhatsApp', whats || 'Adicionar', () => { setDraft(whats); setModal('whats'); })}
        {row('bell', 'Notificações', 'Ativadas', null)}
        {row('log-out', 'Sair', null, null)}
      </Card>

      {modal ? (
        <window.DkModal
          title={modal === 'pix' ? 'Minha chave PIX' : 'Cadastrar WhatsApp'}
          sub={modal === 'pix' ? 'Usada para receber prêmios e acertos' : 'Usado para lembretes de pagamento e avisos de torneio'}
          onClose={() => setModal(null)}
          footer={(() => {
            const valid = modal === 'pix' ? draft.trim().length > 3 : draft.replace(/\D/g, '').length >= 10;
            return (
              <React.Fragment>
                <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
                <Button variant="primary" icon="check" disabled={!valid}
                  onClick={() => { if (modal === 'pix') setPix(draft.trim()); else setWhats(draft); setModal(null); }}>Salvar</Button>
              </React.Fragment>
            );
          })()}>
          {modal === 'pix'
            ? <PHInputD label="Chave PIX (e-mail, telefone ou aleatória)" mono value={draft} onChange={(e) => setDraft(e.target.value)} />
            : <PHInputD label="Número com DDD" mono type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={draft} onChange={(e) => setDraft(fmtPhone(e.target.value))} />}
        </window.DkModal>
      ) : null}
    </div>
  );
}

Object.assign(window, { DkPerfil });
