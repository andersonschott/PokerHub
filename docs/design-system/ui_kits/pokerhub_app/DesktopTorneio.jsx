/* PokerHub UI kit — Desktop: Torneio ao vivo (timer grande + operar mesa).
   Equivalente desktop do Timer.jsx + Dashboard.jsx do mobile: o organizador
   controla nível e jogadores na mesma tela, ações inline na tabela. */

const dkFmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* Small inline action button for table rows (DkIcon-based: safe under re-render). */
function DkRowBtn({ icon, label, tone, onClick, disabled }) {
  const color = tone === 'danger' ? 'var(--negative)' : tone === 'gold' ? 'var(--gold-400)' : 'var(--muted-foreground)';
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 9px', borderRadius: 'var(--radius-sm)', cursor: disabled ? 'default' : 'pointer',
        border: '1px solid var(--border)', background: 'transparent', color, opacity: disabled ? 0.4 : 1,
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--secondary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <window.DkIcon name={icon} size={14} />{label}
    </button>
  );
}

function DkTorneioEmpty({ go }) {
  const { Card, Button, Badge } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
      <Card pad="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '10px 4px' }}>
          <div style={{ width: 60, height: 60, flexShrink: 0, borderRadius: 16, background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}><window.DkIcon name="calendar-plus" size={28} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>Nenhum torneio em andamento</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted-foreground)', marginTop: 3 }}>Crie o próximo torneio a partir de um modelo e abra o check-in.</div>
          </div>
          <Button variant="primary" icon="plus" onClick={() => go('wizard')}>Criar torneio</Button>
        </div>
      </Card>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)', marginBottom: 12 }}>Agenda</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {D.upcoming.map((u, i) => (
            <Card key={i} pad="md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{u.when} · {u.confirmed} confirmados</div>
                </div>
                <Badge tone="neutral">R$ {u.buyIn}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function DkTorneio({ go, onTv }) {
  const { Card, Button, StatusPill, MoneyValue, ProgressBar, Avatar, Badge, StatTile } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA; const t = D.tournament;
  if (!D.league.live) return <DkTorneioEmpty go={go} />;

  const [players, setPlayers] = React.useState(() => D.table.map((p) => ({ ...p })));
  const [level, setLevel] = React.useState(t.level);
  const [seconds, setSeconds] = React.useState(t.secondsRemaining);
  const [paused, setPaused] = React.useState(false);
  const [elim, setElim] = React.useState(null); // jogador a eliminar → modal "quem eliminou"

  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : t.levelSeconds)), 1000);
    return () => clearInterval(id);
  }, [paused, t.levelSeconds]);

  const inGame = players.filter((p) => p.status === 'in');
  const rebuys = players.reduce((a, p) => a + p.rebuys, 0);
  const addons = players.reduce((a, p) => a + p.addons, 0);
  const prizePool = t.buyIn * (players.length + rebuys + addons) * 2; // mock

  const bump = (id, key) => setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, [key]: p[key] + 1 } : p)));
  const unbump = (id, key) => setPlayers((ps) => ps.map((p) => (p.id === id && p[key] > 0 ? { ...p, [key]: p[key] - 1 } : p)));
  const eliminate = (id) => {
    setPlayers((ps) => {
      const place = ps.filter((p) => p.status === 'in').length;
      return ps.map((p) => (p.id === id ? { ...p, status: 'out', place } : p));
    });
    setElim(null);
  };
  const undo = (id) => setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, status: 'in', place: undefined } : p)));

  const sb = t.sb * Math.pow(1.5, level - t.level), bb = sb * 2;
  const fmtB = (v) => Math.round(v / 25) * 25;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 0.9fr) minmax(0, 1.3fr)', gap: 20, alignItems: 'start' }}>
      {/* ---- Coluna esquerda: timer + premiação ---- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card variant={paused ? 'default' : 'live'} pad="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{t.name}</span>
            <StatusPill status={paused ? 'paused' : 'live'} />
          </div>
          <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>Nível {level}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 84, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, margin: '6px 0 10px', color: paused ? 'var(--warning)' : 'var(--foreground)' }}>{dkFmtTime(seconds)}</div>
            <ProgressBar value={Math.round((1 - seconds / t.levelSeconds) * 100)} tone={paused ? 'warning' : 'emerald'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' }}>
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>Blinds</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24, color: 'var(--gold-400)' }}>{fmtB(sb)}/{fmtB(bb)}</div>
              <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)' }}>ante {t.ante}</div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)' }}>Próximo nível</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24 }}>{fmtB(sb * 1.5)}/{fmtB(bb * 1.5)}</div>
              <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--muted-foreground)' }}>ante {t.nextAnte}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
            <DkRowBtn icon="skip-back" label="Nível" onClick={() => { setLevel((l) => Math.max(1, l - 1)); setSeconds(t.levelSeconds); }} disabled={level <= 1} />
            <Button variant="primary" icon={paused ? 'play' : 'pause'} onClick={() => setPaused((p) => !p)}>{paused ? 'Retomar' : 'Pausar'}</Button>
            <DkRowBtn icon="skip-forward" label="Nível" onClick={() => { setLevel((l) => l + 1); setSeconds(t.levelSeconds); }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <Button variant="secondary" icon="tv" block onClick={onTv}>Ver na TV · tela cheia</Button>
          </div>
        </Card>

        <Card pad="md">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: 10 }}>Premiação</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {D.prizes.map((pr) => (
              <div key={pr.position} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, background: pr.position === 1 ? 'color-mix(in oklab, var(--podium-gold) 22%, var(--card))' : 'var(--secondary)', color: pr.position === 1 ? 'var(--podium-gold)' : 'var(--muted-foreground)', border: '1px solid var(--border)' }}>{pr.position}º</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{pr.pct}%</span>
                <MoneyValue value={pr.amount} cents={false} color={pr.position === 1 ? 'gold' : 'none'} size="15px" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ---- Coluna direita: mesa ---- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatTile icon="users" value={`${inGame.length}/${players.length}`} label="Na mesa" />
          <StatTile icon="trophy" value={<window.PHMoney value={prizePool} />} label="Prize pool" tone="emerald" />
          <StatTile icon="repeat" value={rebuys} label="Rebuys" />
          <StatTile icon="plus" value={addons} label="Add-ons" tone="gold" />
        </div>
        <Card pad="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>Mesa · {t.name}</span>
            <DkRowBtn icon="user-plus" label="Check-in" tone="gold" onClick={() => {}} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {players.map((p) => {
                const out = p.status === 'out';
                return (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--border)', opacity: out ? 0.55 : 1 }}>
                    <td style={{ padding: '9px 8px 9px 0', width: 44 }}><Avatar name={p.name} size={34} /></td>
                    <td style={{ padding: '9px 8px 9px 0', minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: out ? 'line-through' : 'none' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>@{p.nick}</div>
                    </td>
                    <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>
                      {out ? <Badge tone="negative" icon="skull">{p.place}º</Badge> : <Badge tone="positive">Na mesa</Badge>}
                    </td>
                    <td style={{ padding: '9px 6px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }} title="rebuys · add-ons">
                      {p.rebuys}R · {p.addons}A
                    </td>
                    <td style={{ padding: '9px 0', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {out ? (
                          <DkRowBtn icon="undo-2" label="Desfazer" onClick={() => undo(p.id)} />
                        ) : (
                          <React.Fragment>
                            <DkRowBtn icon="repeat" label={`Rebuy`} onClick={() => bump(p.id, 'rebuys')} />
                            <DkRowBtn icon="plus" label={`Add-on`} onClick={() => bump(p.id, 'addons')} />
                            <DkRowBtn icon="minus" label="" onClick={() => unbump(p.id, 'rebuys')} disabled={p.rebuys === 0 && p.addons === 0} />
                            <DkRowBtn icon="skull" label="Eliminar" tone="danger" onClick={() => setElim(p)} disabled={inGame.length <= 1} />
                          </React.Fragment>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" icon="check-check" onClick={() => go('pagamentos')}>Encerrar torneio</Button>
        </div>
      </div>

      {/* Quem eliminou? */}
      {elim ? (
        <window.DkModal title={`Eliminar ${elim.name.split(' ')[0]}`} sub="Quem eliminou? (conta para as estatísticas)" onClose={() => setElim(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inGame.filter((p) => p.id !== elim.id).map((p) => (
              <button key={p.id} onClick={() => eliminate(elim.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--foreground)', textAlign: 'left' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--secondary)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <Avatar name={p.name} size={32} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{p.name}</span>
              </button>
            ))}
            <button onClick={() => eliminate(elim.id)} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13.5 }}>
              Não sei / blind out
            </button>
          </div>
        </window.DkModal>
      ) : null}
    </div>
  );
}

Object.assign(window, { DkTorneio });
