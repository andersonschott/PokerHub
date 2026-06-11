/* PokerHub UI kit — Desktop: Caixinha da liga + Administração.
   Caixinha: saldo hero + entradas/saídas + registrar gasto / usar em torneio.
   Admin: dados da liga, convite, temporada, premiação e jogadores. */

/* ---- Caixinha ---------------------------------------------------------- */
function DkCaixinha() {
  const { Card, Button, MoneyValue, Badge } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA; const C = D.caixinha;
  const [usages, setUsages] = React.useState(() => C.usages.map((u) => ({ ...u })));
  const [balance, setBalance] = React.useState(C.balance);
  const [modal, setModal] = React.useState(null); // 'gasto' | 'torneio'
  const [desc, setDesc] = React.useState('');
  const [val, setVal] = React.useState('');
  const PHInputD = window.PHInput;

  const submit = () => {
    const amount = parseInt(val, 10) || 0;
    const next = balance - amount;
    setUsages((u) => [{ id: 'u' + Date.now(), desc: desc || (modal === 'gasto' ? 'Gasto da liga' : 'Torneio especial'), date: 'hoje', amount, type: modal === 'gasto' ? 'expense' : 'tournament', balanceAfter: next }, ...u]);
    setBalance(next);
    setModal(null); setDesc(''); setVal('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card variant="gold" pad="lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>Saldo acumulado</div>
            <MoneyValue value={balance} cents={false} color="gold" size="44px" />
            <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginTop: 4 }}>{C.percent}% de cada prize pool vai para a caixinha</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button variant="secondary" icon="pencil" onClick={() => setModal('gasto')}>Registrar gasto</Button>
            <Button variant="primary" icon="trophy" onClick={() => setModal('torneio')}>Usar em torneio</Button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <Card pad="md">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: 10 }}>Entradas · contribuição por torneio</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {C.entries.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.tournament}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{e.date} · {e.pct}% de R$ {e.prizePool.toLocaleString('pt-BR')}</div>
                </div>
                <MoneyValue value={e.amount} signed cents={false} size="14px" />
              </div>
            ))}
          </div>
        </Card>
        <Card pad="md">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: 10 }}>Saídas · usos da caixinha</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {usages.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? '1px solid var(--border)' : 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.desc}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>{u.date} · saldo após R$ {u.balanceAfter}</div>
                </div>
                <Badge tone={u.type === 'tournament' ? 'gold' : 'neutral'}>{u.type === 'tournament' ? 'Torneio' : 'Gasto'}</Badge>
                <MoneyValue value={-u.amount} cents={false} size="14px" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {modal ? (
        <window.DkModal title={modal === 'gasto' ? 'Registrar gasto' : 'Usar em torneio especial'}
          sub={modal === 'gasto' ? 'Despesa paga com o saldo da caixinha' : 'O valor vira prize pool extra do torneio'}
          onClose={() => setModal(null)}
          footer={<React.Fragment>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" icon="check" disabled={!(parseInt(val, 10) > 0) || parseInt(val, 10) > balance} onClick={submit}>Confirmar</Button>
          </React.Fragment>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PHInputD label="Descrição" placeholder={modal === 'gasto' ? 'Ex.: Baralhos novos + fichas' : 'Ex.: Especial de São João'} value={desc} onChange={(e) => setDesc(e.target.value)} />
            <PHInputD label="Valor" mono prefix="R$" inputMode="numeric" placeholder="0" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))} />
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Saldo disponível: <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-400)' }}>R$ {balance.toLocaleString('pt-BR')}</b></div>
          </div>
        </window.DkModal>
      ) : null}
    </div>
  );
}

/* ---- Administração ------------------------------------------------------ */
function DkAdmin({ go }) {
  const { Card, Button, Avatar, Badge, ProgressBar, MoneyValue } = window.PokerHubDesignSystem_b95f9b;
  const D = window.PH_DATA;
  const lg = D.leagues.find((l) => l.id === D.league.id) || D.leagues[0];
  const [edit, setEdit] = React.useState(false);
  const [name, setName] = React.useState(lg.name);
  const [pct, setPct] = React.useState(D.caixinha.percent);
  const [copied, setCopied] = React.useState(false);
  const [confirmEnd, setConfirmEnd] = React.useState(false);
  const PHInputD = window.PHInput; const PHChipsD = window.PHChips;

  const copyInvite = () => { try { navigator.clipboard.writeText(lg.invite); } catch (e) {} setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Dados da liga */}
        <Card pad="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: 'var(--secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{lg.suit}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>{lg.members} jogadores · {lg.tournaments} torneios · caixinha {pct}%</div>
            </div>
            <Button variant="secondary" icon="pencil" size="sm" onClick={() => setEdit(true)}>Editar</Button>
          </div>
        </Card>

        {/* Convite */}
        <Card pad="md">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: 10 }}>Código de convite</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1px dashed var(--border)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, letterSpacing: '0.12em', textAlign: 'center' }}>{lg.invite}</div>
            <Button variant="primary" icon={copied ? 'check' : 'copy'} onClick={copyInvite}>{copied ? 'Copiado!' : 'Copiar'}</Button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 8 }}>Quem tiver o código entra na liga pelo app.</div>
        </Card>

        {/* Temporada */}
        <Card pad="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>{D.season.name} · {D.season.range}</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)}>Encerrar</Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 24 }}>{D.season.played}/{D.season.total}</span>
            <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>torneios realizados · líder {D.season.leader}</span>
          </div>
          <ProgressBar value={Math.round((D.season.played / D.season.total) * 100)} tone="gold" />
        </Card>

        {/* Premiação padrão */}
        <Card pad="md">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: 10 }}>Tabela de premiação padrão</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {D.prizes.map((p) => (
              <div key={p.position} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5, background: 'var(--secondary)', border: '1px solid var(--border)', color: p.position === 1 ? 'var(--podium-gold)' : 'var(--muted-foreground)' }}>{p.position}º</span>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--secondary)', overflow: 'hidden' }}>
                  <div style={{ width: `${p.pct}%`, height: '100%', borderRadius: 999, background: p.position === 1 ? 'var(--gold-500)' : 'var(--felt-600)' }}></div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13.5, width: 42, textAlign: 'right' }}>{p.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Jogadores */}
      <Card pad="md">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)' }}>Jogadores · {D.ranking.length}</span>
          <Button variant="secondary" icon="user-plus" size="sm">Convidar</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {D.ranking.map((p, i) => (
            <div key={p.nick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--border)' : 0 }}>
              <Avatar name={p.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>@{p.nick} · {p.tournaments} torneios</div>
              </div>
              {p.position === 1 ? <Badge tone="gold" icon="crown">Líder</Badge> : null}
              <button title="Remover da liga" style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--negative)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
                <window.DkIcon name="trash-2" size={14} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Editar dados */}
      {edit ? (
        <window.DkModal title="Editar dados da liga" onClose={() => setEdit(false)}
          footer={<React.Fragment>
            <Button variant="ghost" onClick={() => setEdit(false)}>Cancelar</Button>
            <Button variant="primary" icon="check" disabled={!name.trim()} onClick={() => setEdit(false)}>Salvar</Button>
          </React.Fragment>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PHInputD label="Nome da liga" value={name} onChange={(e) => setName(e.target.value)} />
            <PHChipsD label="Caixinha — % do prize pool" options={[0, 5, 10, 15]} value={pct} onChange={setPct} render={(o) => `${o}%`} />
          </div>
        </window.DkModal>
      ) : null}

      {/* Encerrar temporada */}
      {confirmEnd ? (
        <window.DkModal title={`Encerrar ${D.season.name}?`} sub="O ranking é congelado e uma nova temporada começa zerada." onClose={() => setConfirmEnd(false)}
          footer={<React.Fragment>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>Cancelar</Button>
            <Button variant="destructive" icon="check" onClick={() => setConfirmEnd(false)}>Encerrar temporada</Button>
          </React.Fragment>}>
          <div style={{ fontSize: 13.5, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
            Faltam <b style={{ color: 'var(--foreground)', fontFamily: 'var(--font-mono)' }}>{D.season.total - D.season.played}</b> torneios planejados. Os débitos pendentes continuam cobráveis após o encerramento.
          </div>
        </window.DkModal>
      ) : null}
    </div>
  );
}

Object.assign(window, { DkCaixinha, DkAdmin });
