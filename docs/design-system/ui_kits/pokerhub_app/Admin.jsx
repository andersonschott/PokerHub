/* PokerHub UI kit — Administração da liga (organizer-only):
   dados da liga, código de convite, caixinha, temporada, tabela de
   premiação e gestão de jogadores. Mirrors Liga/Edit + Details.razor. */

function PHAdminRow({ icon, label, sub, trailing, onClick, last }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '12px 14px', border: 0, borderBottom: last ? 0 : '1px solid var(--border)', background: 'transparent', cursor: onClick ? 'pointer' : 'default', textAlign: 'left', color: 'var(--foreground)' }}>
      <i data-lucide={icon} style={{ width: 18, height: 18, color: 'var(--muted-foreground)', flexShrink: 0 }}></i>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14.5 }}>{label}</span>
        {sub ? <span style={{ display: 'block', fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>{sub}</span> : null}
      </span>
      {trailing}
      {onClick ? <i data-lucide="chevron-right" style={{ width: 16, height: 16, color: 'var(--muted-foreground)', flexShrink: 0 }}></i> : null}
    </button>
  );
}

function PHAdmin({ go }) {
  const { Card, Button, Avatar, Badge, Sheet, SectionTitle, ProgressBar } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const S = D.season;
  const FH = window.PHFormHeader;
  const PHInputA = window.PHInput;
  const PHSwitchA = window.PHSwitch;
  const PHChipsA = window.PHChips;

  const [sheet, setSheet] = React.useState(null); // 'edit' | 'invite'
  const [players, setPlayers] = React.useState(() => D.ranking.map((p) => ({ name: p.name, nick: p.nick })));
  const [name, setName] = React.useState(D.league.name);
  const [blockDebt, setBlockDebt] = React.useState(true);
  const [pct, setPct] = React.useState(D.caixinha.percent);
  const [copied, setCopied] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const fire = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const copy = () => { setCopied(true); setTimeout(() => { setCopied(false); setSheet(null); }, 1400); };
  const removePlayer = (p) => { setPlayers((ps) => ps.filter((x) => x.nick !== p.nick)); fire(`${p.name} removido da liga`); };

  const balance = D.caixinha.balance;

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      <FH title="Administração" sub={D.league.name} onBack={() => go('perfil')} />

      {/* Liga */}
      <SectionTitle icon="settings-2">Liga</SectionTitle>
      <Card pad="none" style={{ margin: '8px 0 18px' }}>
        <PHAdminRow icon="pencil" label="Editar dados da liga" sub="Nome, descrição, regras de check-in" onClick={() => setSheet('edit')} />
        <PHAdminRow icon="ticket" label="Código de convite" sub="Convide jogadores para a liga" onClick={() => setSheet('invite')} />
        <PHAdminRow icon="piggy-bank" label="Caixinha" sub={`${pct}% de cada prize pool`} last
          trailing={<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--gold-400)', flexShrink: 0, whiteSpace: 'nowrap' }}>R$ {balance.toLocaleString('pt-BR')}</span>}
          onClick={() => go('caixinha')} />
      </Card>

      {/* Temporada */}
      <SectionTitle icon="calendar-range">Temporada</SectionTitle>
      <Card pad="md" style={{ margin: '8px 0 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5 }}>{S.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', flexShrink: 0 }}>{S.range}</span>
        </div>
        <ProgressBar value={(S.played / S.total) * 100} tone="gold" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--foreground)' }}>{S.played}</span>/{S.total} torneios realizados</span>
          <button onClick={() => fire('Temporada encerrada (exemplo)')} style={{ border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12.5, color: 'var(--negative)', padding: '6px 0' }}>Encerrar temporada</button>
        </div>
      </Card>

      {/* Premiação */}
      <SectionTitle icon="trophy">Tabela de premiação</SectionTitle>
      <Card pad="none" style={{ margin: '8px 0 18px' }}>
        {[['1º lugar', 50, 'var(--podium-gold)'], ['2º lugar', 30, 'var(--podium-silver)'], ['3º lugar', 20, 'var(--podium-bronze)']].map(([label, p, c], i, a) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }}></span>
            <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14.5 }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>{p}%</span>
          </div>
        ))}
      </Card>

      {/* Jogadores */}
      <SectionTitle icon="users">Jogadores · {players.length}</SectionTitle>
      <Card pad="none" style={{ marginTop: 8 }}>
        {players.map((p, i) => (
          <div key={p.nick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < players.length - 1 ? '1px solid var(--border)' : 0 }}>
            <Avatar name={p.name} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>@{p.nick}</div>
            </div>
            <button onClick={() => removePlayer(p)} title="Remover da liga"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
              Remover
            </button>
          </div>
        ))}
      </Card>
      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" icon="user-plus" block onClick={() => setSheet('invite')}>Convidar jogador</Button>
      </div>

      {/* Editar liga */}
      {sheet === 'edit' && (
        <Sheet open onClose={() => setSheet(null)} title="Editar dados da liga" subtitle="As mudanças valem para os próximos torneios">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PHInputA label="Nome da liga" value={name} onChange={(e) => setName(e.target.value)} />
            <PHSwitchA label="Bloquear check-in com débitos" sub="Jogador com pagamento pendente não entra" checked={blockDebt} onChange={setBlockDebt} />
            <PHChipsA label="Caixinha — % do prize pool" options={[0, 5, 10, 15]} value={pct} onChange={setPct} render={(o) => `${o}%`} />
            <Button variant="primary" icon="check" block disabled={!name.trim()} onClick={() => { setSheet(null); fire('Liga atualizada'); }}>Salvar</Button>
          </div>
        </Sheet>
      )}

      {/* Convite */}
      {sheet === 'invite' && (
        <Sheet open onClose={() => setSheet(null)} title={`Convite · ${name}`} subtitle="Compartilhe este código para convidar jogadores">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px solid var(--border)', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 26, letterSpacing: '0.14em', color: 'var(--gold-400)' }}>AMIGOS-2K6</span>
          </div>
          <Button variant="primary" icon={copied ? 'check' : 'copy'} block onClick={copy}>{copied ? 'Copiado!' : 'Copiar código'}</Button>
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

window.PHAdmin = PHAdmin;
