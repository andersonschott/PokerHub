/* PokerHub UI kit — Home / League lobby */
function Segmented({ tabs, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--secondary)', padding: 4, borderRadius: 'var(--radius-md)' }}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            style={{
              flex: 1, height: 36, border: 0, cursor: 'pointer', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
              background: active ? 'var(--felt-700)' : 'transparent',
              color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
            }}>{t.label}</button>
        );
      })}
    </div>
  );
}

function PHHome({ go }) {
  const { Card, Button, StatusPill, StatTile, MoneyValue, SectionTitle, PodiumStat, Avatar, Badge, IconButton } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const [tab, setTab] = React.useState('torneios');
  const [notif, setNotif] = React.useState(false);
  const [rsvp, setRsvp] = React.useState(null);       // torneio aberto no sheet de presença
  const [going, setGoing] = React.useState({});        // nome do torneio → true/false
  const [toast, setToast] = React.useState(null);
  const { Sheet } = window.PokerHubDesignSystem_b95f9b;
  const t = D.tournament;
  const fire = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  return (
    <div style={{ padding: '14px 16px 96px' }}>
      {/* League header — tap to switch leagues */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => go('lobby')} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'var(--foreground)', font: 'inherit' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(160deg,var(--gold-400),var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-foreground)', fontSize: 20 }}>{D.league.suit || '♠'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17.5, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{D.league.name}</span>
              <i data-lucide="chevrons-up-down" style={{ width: 15, height: 15, color: 'var(--muted-foreground)', flexShrink: 0 }}></i>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{D.league.season} · {D.league.members} jogadores</div>
          </div>
        </button>
        <button onClick={() => { window.PHTheme.toggle(); setTab((x) => x); go('home'); }} title="Tema claro/escuro" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0 }}><i data-lucide={window.PHTheme.get() === 'dark' ? 'sun' : 'moon-star'}></i></button>
        <button onClick={() => setNotif(true)} title="Notificações" style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0 }}>
          <i data-lucide="bell"></i>
          <span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', border: '1.5px solid var(--background)' }}></span>
        </button>
      </div>

      {/* Live tournament — discreet banner (tap = assistir, gear = operar) */}
      {D.league.live ? (
      <Card variant="live" pad="md" interactive onClick={() => go('timer')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--live)', flexShrink: 0, animation: 'ph-pulse 1.4s var(--ease-out) infinite' }}></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{D.league.liveName || t.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.levelLabel} · {t.sb}/{t.bb} · {t.remaining}/{t.players}</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', flexShrink: 0 }}>12:43</span>
          <IconButton icon="settings-2" variant="solid" size="sm" gold title="Operar" onClick={(e) => { e.stopPropagation(); go('dashboard'); }} style={{ flexShrink: 0 }} />
        </div>
      </Card>
      ) : (
      <Card pad="md">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i data-lucide="calendar-plus" style={{ color: 'var(--muted-foreground)', width: 18, height: 18 }}></i>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Nenhum torneio em andamento</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 1 }}>Crie o próximo e chame a galera.</div>
          </div>
          <Button variant="primary" size="sm" icon="plus" onClick={() => go('torneio-create')} style={{ flexShrink: 0 }}>Criar</Button>
        </div>
      </Card>
      )}

      <div style={{ height: 14 }}></div>
      <Segmented value={tab} onChange={setTab} tabs={[{ key: 'torneios', label: 'Torneios' }, { key: 'jogadores', label: 'Jogadores' }]} />
      <div style={{ height: 14 }}></div>

      {tab === 'torneios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionTitle icon="calendar-clock">Próximos</SectionTitle>
          {D.upcoming.filter((u) => !(u.status === 'live' && D.league.live)).map((u, i) => (
            <Card key={u.name} interactive pad="md" onClick={() => setRsvp(u)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{u.name}</span>
                    {going[u.name] === true ? <Badge tone="positive" icon="check">Vou</Badge> : null}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 2 }}>{u.when} · {u.confirmed + (going[u.name] === true ? 1 : 0)} confirmados</div>
                </div>
                <Badge tone="neutral">R$ {u.buyIn}</Badge>
                <i data-lucide="chevron-right" style={{ color: 'var(--muted-foreground)' }}></i>
              </div>
            </Card>
          ))}
          {/* Caixinha — atalho */}
          <Card interactive pad="md" onClick={() => go('caixinha')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <i data-lucide="piggy-bank" style={{ width: 18, height: 18, color: 'var(--muted-foreground)', flexShrink: 0 }}></i>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>Caixinha da liga</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 2 }}>{D.caixinha.percent}% de cada prize pool · despesas da liga</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14.5, color: 'var(--gold-400)', whiteSpace: 'nowrap', flexShrink: 0 }}>R$ {D.caixinha.balance.toLocaleString('pt-BR')}</span>
              <i data-lucide="chevron-right" style={{ color: 'var(--muted-foreground)' }}></i>
            </div>
          </Card>
          <div style={{ height: 10 }}></div>
          {/* Torneios realizados */}
          <window.PHHistoricoList go={go} limit={4} />
        </div>
      )}

      {tab === 'jogadores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionTitle icon="users">{D.league.members} jogadores</SectionTitle>
          {D.ranking.map((p) => (
            <Card key={p.position} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={p.name} podium={p.position <= 3 ? ['gold','silver','bronze'][p.position-1] : undefined} badge={p.position <= 3 ? String(p.position) : undefined} badgeGold={p.position === 1} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{p.sub}</div>
                </div>
                <MoneyValue value={p.profit} signed size="15px" />
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* RSVP — confirmar presença no próximo torneio */}
      {rsvp && (
        <Sheet open onClose={() => setRsvp(null)} title={rsvp.name} subtitle={`${rsvp.when} · buy-in R$ ${rsvp.buyIn}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card)' }}>
              <i data-lucide="users" style={{ width: 15, height: 15, color: 'var(--muted-foreground)', flexShrink: 0 }}></i>
              <span style={{ flex: 1, fontSize: 13.5 }}>Confirmados</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13.5 }}>{rsvp.confirmed + (going[rsvp.name] === true ? 1 : 0)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.45, padding: '0 2px' }}>O organizador usa as confirmações para montar a mesa e estimar o prize pool.</div>
            {going[rsvp.name] !== true && <Button variant="primary" icon="check" block onClick={() => { setGoing({ ...going, [rsvp.name]: true }); setRsvp(null); fire('Presença confirmada · ' + rsvp.when); }}>Confirmar presença</Button>}
            <Button variant="ghost" block onClick={() => { setGoing({ ...going, [rsvp.name]: false }); setRsvp(null); if (going[rsvp.name] === true) fire('Presença desmarcada'); }}>{going[rsvp.name] === true ? 'Desmarcar presença' : 'Não vou'}</Button>
          </div>
        </Sheet>
      )}

      {/* Notificações */}
      {notif && (
        <Sheet open onClose={() => setNotif(false)} title="Notificações">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['receipt', 'Você tem pagamentos pendentes do Torneio da Sexta', 'há 2h', 'settlement'],
              ['calendar-clock', 'Especial de Fim de Mês é sábado — confirme sua presença', 'ontem', null],
              ['trending-up', 'Você subiu para 2º no ranking da temporada', 'há 3 dias', 'ranking']].map(([ic, txt, when, dest]) => (
              <button key={txt} onClick={() => { setNotif(false); if (dest) go(dest); }} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', color: 'var(--foreground)', textAlign: 'left', width: '100%' }}>
                <i data-lucide={ic} style={{ width: 16, height: 16, color: 'var(--gold-400)', flexShrink: 0, marginTop: 2 }}></i>
                <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45 }}>{txt}</span>
                <span style={{ fontSize: 11.5, color: 'var(--muted-foreground)', flexShrink: 0 }}>{when}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 84, zIndex: 70, background: 'var(--felt-700)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)' }}>
          <i data-lucide="check-circle" style={{ color: 'var(--positive)', width: 18, height: 18 }}></i>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

window.PHHome = PHHome;
