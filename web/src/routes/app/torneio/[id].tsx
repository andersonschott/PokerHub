/**
 * /app/torneio/:tournamentId — Detalhe / gestão de torneio agendado.
 *
 * Para todos: header, stat tiles, código de convite (copiável) e lista de inscritos.
 * Para o organizador, esta é a tela de GESTÃO do torneio agendado:
 *  - Iniciar torneio (quando agendado)
 *  - Adicionar / remover jogadores
 *  - Check-in / desfazer check-in por jogador
 *  - Gerir delegados e cancelar o torneio
 *
 * Operar o jogo ao vivo (timer, rebuy, eliminar) é no /app/torneio/dashboard.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, Wallet, Trophy, CheckCircle2, Loader2,
  Ticket, Copy, Check, ShieldCheck, Ban, UserPlus, Trash2, Play,
} from 'lucide-react';
import { toast } from 'sonner';

import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { SectionTitle } from '@/components/ui/section-title';
import { Avatar } from '@/components/ui/avatar';
import { SearchField } from '@/components/ui/search-field';
import { cn } from '@/lib/utils';

import { useAuth } from '@/lib/auth-context';
import { useLeague, useLeaguePlayers } from '@/lib/api/hooks/use-leagues';
import {
  useTournament,
  useStartTournament,
  useCancelTournament,
  useAddPlayerToTournament,
  useRemovePlayerFromTournament,
  useCheckInPlayer,
  useCheckoutPlayer,
  useDelegates,
  useAddDelegate,
  useRemoveDelegate,
  TournamentStatus,
} from '@/lib/api/hooks/use-tournaments';
import { formatPtBrDate } from '@/routes/app/torneio/historico-map';

// Ordena/filtra seletores de jogador por nome (pt-BR).
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'pt-BR');
const matchesQuery = (name: string, q: string) => name.toLowerCase().includes(q.trim().toLowerCase());

// ---------------------------------------------------------------------------
// Status → rótulo + tom do badge
// ---------------------------------------------------------------------------

type StatusTone = 'neutral' | 'gold' | 'emerald' | 'positive' | 'negative' | 'warning';

function statusLabel(status: TournamentStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case TournamentStatus.Scheduled:
      return { label: 'Agendado', tone: 'gold' };
    case TournamentStatus.InProgress:
      return { label: 'Ao vivo', tone: 'positive' };
    case TournamentStatus.Paused:
      return { label: 'Pausado', tone: 'warning' };
    case TournamentStatus.Finished:
      return { label: 'Encerrado', tone: 'neutral' };
    case TournamentStatus.Cancelled:
      return { label: 'Cancelado', tone: 'negative' };
    default:
      return { label: 'Torneio', tone: 'neutral' };
  }
}

// ---------------------------------------------------------------------------
// Sheet: adicionar jogador (membros da liga ainda não inscritos)
// ---------------------------------------------------------------------------

function AddPlayerSheet({
  tournamentId,
  leagueId,
  registeredPlayerIds,
  onClose,
}: {
  tournamentId: string;
  leagueId: string;
  registeredPlayerIds: Set<string>;
  onClose: () => void;
}) {
  const { data: members } = useLeaguePlayers(leagueId);
  const addMut = useAddPlayerToTournament(tournamentId);
  const [q, setQ] = useState('');
  const all = (members ?? []).filter((m) => !registeredPlayerIds.has(m.id)).sort(byName);
  const candidates = q.trim() ? all.filter((m) => matchesQuery(m.name, q)) : all;

  const add = (playerId: string, name: string) =>
    addMut.mutate(playerId, {
      onSuccess: () => toast.success(`${name.split(' ')[0]} adicionado`),
      onError: () => toast.error('Não foi possível adicionar.'),
    });

  return (
    <Sheet open fixed onClose={onClose} title="Adicionar jogador" subtitle="Membros da liga ainda não inscritos">
      {all.length === 0 ? (
        <div className="text-[13px] text-muted-foreground">Todos os membros já estão inscritos.</div>
      ) : (
        <>
          <SearchField value={q} onChange={setQ} placeholder="Buscar jogador…" />
          <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto">
            {candidates.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">Nenhum jogador encontrado.</div>
            ) : (
              candidates.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => add(m.id, m.name)}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] border border-border bg-card cursor-pointer text-left"
                >
                  <Avatar name={m.name} size={32} />
                  <span className="flex-1 min-w-0 font-sans font-semibold text-[14px] truncate">{m.name}</span>
                  <UserPlus className="w-[18px] h-[18px] text-gold-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Sheet: gestão de delegados
// ---------------------------------------------------------------------------

function DelegatesSheet({
  tournamentId,
  leagueId,
  organizerId,
  onClose,
}: {
  tournamentId: string;
  leagueId: string;
  organizerId?: string;
  onClose: () => void;
}) {
  const { data: delegates } = useDelegates(tournamentId);
  const { data: members } = useLeaguePlayers(leagueId);
  const addMut = useAddDelegate(tournamentId);
  const removeMut = useRemoveDelegate(tournamentId);

  const [q, setQ] = useState('');
  const delegateUserIds = new Set((delegates ?? []).map((d) => d.userId));
  const currentDelegates = (delegates ?? [])
    .slice()
    .sort((a, b) => a.userName.localeCompare(b.userName, 'pt-BR'));
  const allCandidates = (members ?? [])
    .filter((m) => m.userId && m.userId !== organizerId && !delegateUserIds.has(m.userId))
    .sort(byName);
  const candidates = q.trim() ? allCandidates.filter((m) => matchesQuery(m.name, q)) : allCandidates;

  const add = (userId: string, name: string) =>
    addMut.mutate({ userId }, { onSuccess: () => toast.success(`${name.split(' ')[0]} agora é delegado`) });
  const remove = (userId: string, name: string) =>
    removeMut.mutate(userId, { onSuccess: () => toast.success(`${name.split(' ')[0]} removido`) });

  return (
    <Sheet open fixed onClose={onClose} title="Delegados" subtitle="Quem pode operar a mesa (check-in, rebuy, eliminar)">
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground mb-2">Delegados atuais</div>
          {currentDelegates.length === 0 ? (
            <div className="text-[13px] text-muted-foreground">Nenhum delegado ainda.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {currentDelegates.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <Avatar name={d.userName} size={32} />
                  <span className="flex-1 min-w-0 font-sans font-semibold text-[14px] truncate">{d.userName}</span>
                  <button
                    type="button"
                    onClick={() => remove(d.userId, d.userName)}
                    aria-label="Remover delegado"
                    className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-sm)] border border-border bg-transparent text-muted-foreground hover:text-negative cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground mb-2">Adicionar membro</div>
          {allCandidates.length === 0 ? (
            <div className="text-[13px] text-muted-foreground">Nenhum membro com conta disponível.</div>
          ) : (
            <>
              <SearchField value={q} onChange={setQ} placeholder="Buscar membro…" />
              <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
                {candidates.length === 0 ? (
                  <div className="text-[13px] text-muted-foreground">Nenhum membro encontrado.</div>
                ) : (
                  candidates.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => add(m.userId!, m.name)}
                      className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] border border-border bg-card cursor-pointer text-left"
                    >
                      <Avatar name={m.name} size={32} />
                      <span className="flex-1 min-w-0 font-sans font-semibold text-[14px] truncate">{m.name}</span>
                      <UserPlus className="w-[18px] h-[18px] text-gold-400 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export default function TorneioDetalheRoute() {
  const navigate = useNavigate();
  const { tournamentId = '' } = useParams<{ tournamentId: string }>();
  const { user } = useAuth();

  const { data: detail, isLoading } = useTournament(tournamentId);
  const leagueId = detail?.leagueId ?? '';
  const { data: league } = useLeague(leagueId);
  const isOrganizer = !!user && !!league && league.organizerId === user.userId;

  const [copied, setCopied] = useState(false);
  const [delegatesOpen, setDelegatesOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);

  const startMut = useStartTournament(tournamentId);
  const cancelMut = useCancelTournament(tournamentId, leagueId);
  const removePlayerMut = useRemovePlayerFromTournament(tournamentId);
  const checkInMut = useCheckInPlayer(tournamentId);
  const checkoutMut = useCheckoutPlayer(tournamentId);

  const status = detail ? statusLabel(detail.status) : null;
  const players = detail?.players ?? [];
  const checkedInCount = players.filter((p) => p.isCheckedIn).length;
  const canCancel =
    !!detail &&
    detail.status !== TournamentStatus.Finished &&
    detail.status !== TournamentStatus.Cancelled;
  const isScheduled = detail?.status === TournamentStatus.Scheduled;

  const copyInvite = () => {
    if (!detail) return;
    const link = `${window.location.origin}/torneio/entrar/${detail.inviteCode}`;
    try {
      void navigator.clipboard.writeText(link);
    } catch {
      // clipboard indisponível
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    toast.success('Convite copiado');
  };

  const startTournament = () => {
    startMut.mutate(undefined, {
      onSuccess: () => {
        toast.success('Torneio iniciado!');
        navigate('/app/torneio/dashboard');
      },
      onError: () => toast.error('Não foi possível iniciar o torneio.'),
    });
  };

  const cancelTournament = () => {
    if (!window.confirm('Cancelar este torneio? Esta ação não pode ser desfeita.')) return;
    cancelMut.mutate(undefined, {
      onSuccess: () => {
        toast.success('Torneio cancelado');
        navigate(-1);
      },
      onError: () => toast.error('Não foi possível cancelar o torneio.'),
    });
  };

  const removePlayer = (playerId: string, name: string) =>
    removePlayerMut.mutate(playerId, {
      onSuccess: () => toast.success(`${name.split(' ')[0]} removido do torneio`),
      onError: () => toast.error('Não foi possível remover o jogador.'),
    });

  const toggleCheckin = (playerId: string, isCheckedIn: boolean) => {
    const mut = isCheckedIn ? checkoutMut : checkInMut;
    mut.mutate(playerId, { onError: () => toast.error('Não foi possível atualizar o check-in.') });
  };

  return (
    <div className="px-4 pt-[14px] pb-24 min-h-full lg:px-8 lg:py-6">
      <div className="mx-auto w-full lg:max-w-[720px]">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <IconButton icon={ArrowLeft} aria-label="Voltar" onClick={() => navigate(-1)} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-sans font-bold text-[18px] tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis">
              {detail?.name ?? 'Torneio'}
            </div>
            <div className="text-[12px] text-muted-foreground">
              {detail ? (
                <>
                  <span className="font-mono">{formatPtBrDate(detail.scheduledDateTime)}</span>
                  {detail.location ? <> · {detail.location}</> : null} · buy-in{' '}
                  <MoneyValue value={detail.buyIn} cents={false} color="none" size="12px" />
                </>
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
          </div>
          {status ? (
            <Badge tone={status.tone} className="shrink-0">
              {status.label}
            </Badge>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Torneio não encontrado
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <StatTile icon={Users} value={players.length} label="Jogadores" center />
              <StatTile
                icon={Wallet}
                value={<MoneyValue value={detail.buyIn} cents={false} color="none" size="18px" />}
                label="Buy-in"
                center
              />
              <StatTile
                icon={Trophy}
                value={<MoneyValue value={detail.prizePool} cents={false} color="none" size="18px" />}
                label="Prize pool"
                tone="emerald"
                center
              />
            </div>

            {/* Convite */}
            {detail.inviteCode ? (
              <Card pad="md" className="mb-4">
                <div className="flex items-center gap-[10px]">
                  <Ticket className="w-[18px] h-[18px] text-gold-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Convite</div>
                    <div className="font-mono font-bold text-[15px] tracking-[0.08em] text-gold-400 truncate">
                      {detail.inviteCode}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={copyInvite} className="shrink-0">
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
              </Card>
            ) : null}

            {/* Ações de administração (organizador) */}
            {isOrganizer ? (
              <div className="flex flex-col gap-2 mb-4">
                {isScheduled ? (
                  <Button variant="primary" icon={Play} block onClick={startTournament} disabled={startMut.isPending}>
                    Iniciar torneio
                  </Button>
                ) : null}
                <div className="flex gap-2">
                  <Button variant="secondary" icon={UserPlus} block onClick={() => setAddPlayerOpen(true)}>
                    Adicionar jogador
                  </Button>
                  <Button variant="secondary" icon={ShieldCheck} block onClick={() => setDelegatesOpen(true)}>
                    Delegados
                  </Button>
                </div>
                {canCancel ? (
                  <Button variant="destructive" icon={Ban} block onClick={cancelTournament} disabled={cancelMut.isPending}>
                    Cancelar torneio
                  </Button>
                ) : null}
              </div>
            ) : null}

            {/* Inscritos */}
            <SectionTitle icon={Users}>
              Inscritos · {players.length}
              {players.length > 0 ? ` · ${checkedInCount} confirmados` : ''}
            </SectionTitle>

            {players.length === 0 ? (
              <Card pad="lg">
                <div className="text-center text-[13px] text-muted-foreground py-2">
                  Nenhum jogador inscrito ainda.
                </div>
              </Card>
            ) : (
              <Card pad="none">
                {players.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-[10px]"
                    style={{ borderBottom: i < players.length - 1 ? '1px solid var(--border)' : undefined }}
                  >
                    <Avatar name={p.playerName} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-sans font-semibold text-[14.5px] whitespace-nowrap overflow-hidden text-ellipsis">
                        {p.playerName}
                        {p.nickname ? (
                          <span className="text-muted-foreground font-normal text-[13px] ml-1">@{p.nickname}</span>
                        ) : null}
                      </div>
                    </div>

                    {isOrganizer ? (
                      <>
                        {/* Check-in toggle */}
                        <button
                          type="button"
                          onClick={() => toggleCheckin(p.playerId, p.isCheckedIn)}
                          aria-label={p.isCheckedIn ? 'Desfazer check-in' : 'Fazer check-in'}
                          className={cn(
                            'shrink-0 inline-flex items-center gap-1 min-h-9 px-3 rounded-[var(--radius-sm)] cursor-pointer font-sans font-semibold text-[12px] border',
                            p.isCheckedIn
                              ? 'border-[color-mix(in_oklab,var(--positive)_40%,transparent)] text-positive bg-[color-mix(in_oklab,var(--positive)_10%,transparent)]'
                              : 'border-border text-muted-foreground bg-transparent',
                          )}
                        >
                          <CheckCircle2 className="w-[14px] h-[14px]" />
                          {p.isCheckedIn ? 'Confirmado' : 'Check-in'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removePlayer(p.playerId, p.playerName)}
                          aria-label="Remover do torneio"
                          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-sm)] border border-border bg-transparent text-muted-foreground hover:text-negative cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : p.isCheckedIn ? (
                      <Badge tone="positive" icon={CheckCircle2} className="shrink-0">
                        Check-in
                      </Badge>
                    ) : (
                      <Badge tone="neutral" className="shrink-0">
                        Aguardando
                      </Badge>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </div>

      {/* Sheets */}
      {delegatesOpen && detail ? (
        <DelegatesSheet
          tournamentId={tournamentId}
          leagueId={leagueId}
          organizerId={league?.organizerId}
          onClose={() => setDelegatesOpen(false)}
        />
      ) : null}
      {addPlayerOpen && detail ? (
        <AddPlayerSheet
          tournamentId={tournamentId}
          leagueId={leagueId}
          registeredPlayerIds={new Set(players.map((p) => p.playerId))}
          onClose={() => setAddPlayerOpen(false)}
        />
      ) : null}
    </div>
  );
}
