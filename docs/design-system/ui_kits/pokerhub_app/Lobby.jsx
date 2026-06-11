/* PokerHub UI kit — Lobby de ligas (switch between leagues you belong to).
   Mirrors Liga/Index.razor: "Organizo" + "Participo" sections, invite code,
   members/tournaments chips, empty state that teaches. Mobile-first. */

function LeagueCard({ lg, active, onPick, onInvite, onAdmin }) {
  const { Card, Badge } = window.PokerHubDesignSystem_b95f9b;
  const suitRed = lg.suit === '♥' || lg.suit === '♦';
  return (
    <Card interactive pad="md" onClick={() => onPick(lg)}
      style={active ? { borderColor: 'color-mix(in oklab, var(--gold-500) 55%, var(--border))', boxShadow: 'var(--glow-gold)' } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, lineHeight: 1,
          background: 'var(--secondary)', border: '1px solid var(--border)', color: suitRed ? 'var(--suit-red)' : 'var(--foreground)' }}>{lg.suit}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lg.name}</span>
            {active ? <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gold-400)', background: 'color-mix(in oklab,var(--gold-500) 16%,var(--card))', border: '1px solid color-mix(in oklab,var(--gold-500) 30%,transparent)', padding: '2px 7px', borderRadius: 999 }}>Atual</span> : null}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lg.role === 'player' ? `por ${lg.organizer} · ` : ''}{lg.season}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <Badge tone="neutral" icon="users">{lg.members}</Badge>
        <Badge tone="neutral" icon="trophy">{lg.tournaments}</Badge>
        {lg.live
          ? <span style={{ marginLeft: 'auto', minWidth: 0, fontSize: 11.5, color: 'var(--emerald-400)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>● AO VIVO · {lg.liveName}</span>
          : <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>próx · {lg.next}</span>}
      </div>

      {lg.role === 'organizer' ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={(e) => { e.stopPropagation(); onInvite(lg); }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--gold-400)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
            <i data-lucide="ticket"></i>Convite
          </button>
          <button onClick={(e) => { e.stopPropagation(); onAdmin(lg); }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--foreground)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
            <i data-lucide="settings-2"></i>Administrar
          </button>
        </div>
      ) : null}
    </Card>
  );
}

function PHLobby({ go }) {
  const { Button, Sheet, IconButton } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const [, force] = React.useReducer((x) => x + 1, 0);
  const [invite, setInvite] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const organizo = D.leagues.filter((l) => l.role === 'organizer');
  const participo = D.leagues.filter((l) => l.role === 'player');
  const activeId = D.league.id;

  const pick = (lg) => {
    D.league = { id: lg.id, name: lg.name, season: lg.season, members: lg.members, live: lg.live, liveName: lg.liveName, suit: lg.suit };
    force();
    go('home');
  };
  const copy = () => { setCopied(true); setTimeout(() => { setCopied(false); setInvite(null); }, 1400); };

  return (
    <div style={{ padding: '14px 16px 96px', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em' }}>Minhas ligas</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{D.leagues.length} ligas · toque para entrar</div>
        </div>
        <Button variant="primary" icon="plus" size="sm" onClick={() => go('liga-create')}>Criar</Button>
      </div>

      {/* Organizo */}
      {organizo.length > 0 && (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 10 }}>
            <i data-lucide="crown" style={{ width: 14, height: 14, color: 'var(--gold-400)' }}></i>Organizo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {organizo.map((lg) => <LeagueCard key={lg.id} lg={lg} active={lg.id === activeId} onPick={pick} onInvite={setInvite} onAdmin={() => go('admin')} />)}
          </div>
        </React.Fragment>
      )}

      {/* Participo */}
      {participo.length > 0 && (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 10 }}>
            <i data-lucide="users" style={{ width: 14, height: 14 }}></i>Participo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {participo.map((lg) => <LeagueCard key={lg.id} lg={lg} active={lg.id === activeId} onPick={pick} onInvite={setInvite} onAdmin={() => go('admin')} />)}
          </div>
        </React.Fragment>
      )}

      {/* Entrar com código */}
      <button style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px dashed var(--border)', cursor: 'pointer', color: 'var(--muted-foreground)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>
        <i data-lucide="log-in"></i>Entrar em uma liga com código
      </button>

      {/* Invite sheet */}
      {invite && (
        <Sheet open onClose={() => setInvite(null)} title={`Convite · ${invite.name}`} subtitle="Compartilhe este código para convidar jogadores">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px solid var(--border)', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 26, letterSpacing: '0.14em', color: 'var(--gold-400)' }}>{invite.invite}</span>
          </div>
          <Button variant="primary" icon={copied ? 'check' : 'copy'} block onClick={copy}>{copied ? 'Copiado!' : 'Copiar código'}</Button>
        </Sheet>
      )}
    </div>
  );
}

window.PHLobby = PHLobby;
