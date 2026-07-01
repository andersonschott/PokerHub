/**
 * /app/torneio/dashboard — Painel ao vivo do organizador.
 * Refatorado na Fase 4 para consumir SignalR e a API Real.
 */
import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2, Flag, Users, Trophy, Repeat, Undo2, Loader2, MonitorPlay, UserCheck, UserPlus, Receipt, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { LevelControl } from '@/features/live/level-control';
import { PlayerRow } from '@/features/live/player-row';
import { ActionSheet } from '@/features/live/action-sheet';
import { EliminateSheet } from '@/features/live/eliminate-sheet';
import { Sheet } from '@/components/ui/sheet';

import { useTournaments, useTournament, TournamentStatus, usePauseTournament, useResumeTournament, useNextLevel, usePrevLevel, useCheckInPlayer, useEliminatePlayer, useAddRebuy, useSetAddon, useUndoElimination, useFinishTournament, useDelegates, useAddPlayerToTournament, type FinishPlayerPosition } from '@/lib/api/hooks/use-tournaments';
import { useActiveLeague } from '@/features/leagues/league-context';
import { useTournamentClock } from '@/lib/api/hooks/use-tournament-clock';
import { useLeague, useLeaguePlayers, type PlayerDto } from '@/lib/api/hooks/use-leagues';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api/client';
import { type MockTablePlayer } from '@/mocks/data';
import { canOperateTournament, isLeagueOrganizer } from '@/features/tournaments/permissions';
import { useTickingRestClock } from '../use-ticking-rest-clock';
import { isLiveClock } from '../tv-projection';
import { levelChangeSound } from '@/features/timer/level-change-sound';
import { playLevelChange, playBreakStart, primeAudioOnGesture } from '@/lib/timer-sounds';
import {
  useExpenses,
  useEligiblePlayers,
  useExpenseLeaguePlayers,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  type TournamentExpenseDto,
  type CreateExpenseDto,
} from '@/lib/api/hooks/use-expenses';
import { ExpenseSheet } from '@/features/expenses/expense-sheet';

type SheetStep = 'actions' | 'eliminate';

type ExpenseSheetMode = { open: boolean; expense: TournamentExpenseDto | null };

export default function DashboardRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeLeagueId } = useActiveLeague();

  // Find active tournament
  const { data: tournaments, isLoading: isLoadingTournaments } = useTournaments(activeLeagueId ?? '');
  const activeT = tournaments?.find(t => t.status === TournamentStatus.InProgress || t.status === TournamentStatus.Paused);
  const activeTId = activeT?.id ?? '';

  // Poll de segurança (5s, igual /tv): mantém jogadores/prize pool frescos e, se o SignalR
  // estiver inacessível, é o poll que alimenta o fallback de clock abaixo.
  const { data: tDetail, isLoading: isLoadingDetail } = useTournament(activeTId, { refetchInterval: 5000 });
  const { state: liveClock } = useTournamentClock(activeTId);

  // Clock fiel via SignalR; sem 1º sync (level 0) → fallback REST que TICA localmente.
  // Antes o dashboard não tinha fallback nenhum e ficava ZERADO até o 1º sync do hub.
  const hasLive = isLiveClock(liveClock);
  const restClock = useTickingRestClock(
    tDetail
      ? {
          status: tDetail.status,
          currentLevel: tDetail.currentLevel,
          timeRemainingSeconds: tDetail.timeRemainingSeconds,
          blindLevels: tDetail.blindLevels,
        }
      : null,
  );
  const clock = hasLive ? liveClock : (restClock ?? liveClock);

  // Som na virada de nível (espelha LevelChanged do Blazor) sobre o clock EFETIVO.
  const prevLevelRef = useRef<number | null>(null);
  useEffect(() => {
    const sound = levelChangeSound(prevLevelRef.current, clock.level, clock.isBreak);
    prevLevelRef.current = clock.level;
    if (sound === 'break-start') playBreakStart();
    else if (sound === 'level-change') playLevelChange();
  }, [clock.level, clock.isBreak]);

  // Libera o áudio no 1º gesto do usuário (autoplay policy mobile/PWA instalado).
  useEffect(() => {
    primeAudioOnGesture();
  }, []);

  const { data: league } = useLeague(tDetail?.leagueId ?? '');
  const { data: delegates } = useDelegates(activeTId);
  const canOperate = canOperateTournament(activeTId, user, league, delegates ?? []);

  const { data: expenses, isLoading: isLoadingExpenses } = useExpenses(activeTId);
  const { data: eligiblePlayers } = useEligiblePlayers(activeTId);
  const { data: leaguePlayers } = useExpenseLeaguePlayers(activeTId);

  const createExpenseMut = useCreateExpense(activeTId);
  const updateExpenseMut = useUpdateExpense(activeTId);
  const deleteExpenseMut = useDeleteExpense(activeTId);

  // Mutations
  const pauseMut = usePauseTournament(activeTId);
  const resumeMut = useResumeTournament(activeTId);
  const nextMut = useNextLevel(activeTId);
  const prevMut = usePrevLevel(activeTId);
  const checkInMut = useCheckInPlayer(activeTId);
  const eliminateMut = useEliminatePlayer(activeTId);
  const rebuyMut = useAddRebuy(activeTId);
  const addonMut = useSetAddon(activeTId);
  const undoEliminateMut = useUndoElimination(activeTId);
  const finishMut = useFinishTournament(activeTId, activeLeagueId ?? '');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<SheetStep>('actions');
  const [finishOpen, setFinishOpen] = useState(false);
  const [expenseSheet, setExpenseSheet] = useState<ExpenseSheetMode>({ open: false, expense: null });
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);

  // Inscrição tardia (porta do AddTournamentPlayerDialog do Blazor): jogadores ATIVOS da liga
  // que ainda não estão no torneio. Mutation reaproveita o POST /tournaments/{id}/players.
  const { data: leagueRoster } = useLeaguePlayers(tDetail?.leagueId ?? '');
  const addPlayerMut = useAddPlayerToTournament(activeTId);

  // NB: nenhum `return` antecipado pode vir ANTES dos hooks abaixo (useCallback).
  // As derivações são null-safe (tDetail pode ser undefined durante o carregamento) e os
  // guards de render ficam DEPOIS de todos os hooks — caso contrário a contagem de hooks
  // muda entre renders e o React quebra ("change in the order of Hooks").

  // Derived state from real data
  const tName = tDetail?.name ?? '';
  const tBuyIn = tDetail?.buyIn ?? 0;
  const tMaxPlayers = tDetail?.players?.length ?? 0;

  // Transform API players to MockTablePlayer shape for existing UI components
  // Consider checked-in players or eliminated ones
  const table: MockTablePlayer[] = (tDetail?.players ?? [])
    .filter(p => p.isCheckedIn || p.position !== null)
    .map(p => ({
      id: p.playerId,
      name: p.playerName,
      nick: p.nickname ?? p.playerName.split(' ')[0],
      status: p.position ? 'out' : 'in',
      place: p.position ?? undefined,
      rebuys: p.rebuyCount,
      addons: p.hasAddon ? 1 : 0
    }));

  const inPlay = table.filter(p => p.status === 'in');
  const out = table.filter(p => p.status === 'out').sort((a, b) => (a.place ?? 99) - (b.place ?? 99));

  // Inscritos que ainda não fizeram check-in (RAW: não passam pelo filtro de `table`).
  const awaitingCheckIn = (tDetail?.players ?? []).filter(
    (p) => !p.isCheckedIn && p.position === null,
  );

  // ---- Inscrição tardia (mesma regra do Blazor Dashboard.razor) ----
  // Botão visível: Scheduled sempre; em jogo (InProgress|Paused) só para o organizador ou
  // enquanto o check-in é permitido (allowCheckInUntilLevel ≥ nível atual → isCheckInAllowed).
  const isOrganizer = isLeagueOrganizer(league, user);
  const tStatus = tDetail?.status;
  const canAddPlayer = canOperate && (
    tStatus === TournamentStatus.Scheduled ||
    ((tStatus === TournamentStatus.InProgress || tStatus === TournamentStatus.Paused) &&
      (isOrganizer || tDetail?.isCheckInAllowed === true)));

  // Só jogadores ATIVOS da liga (membershipStatus 0 e sem soft-delete) fora do torneio.
  const playersInTournament = new Set((tDetail?.players ?? []).map((p) => p.playerId));
  const availablePlayers = (leagueRoster ?? []).filter(
    (p) => p.isActive && p.membershipStatus === 0 && !playersInTournament.has(p.id),
  );

  const totalRebuys = table.reduce((s, p) => s + (p.rebuys || 0), 0);
  const prizePool = tDetail?.prizePool ?? 0; // Provided by backend

  const selectedPlayer = selectedId ? table.find(p => p.id === selectedId) ?? null : null;

  // ---- Final standings (derived from RAW tDetail.players) ----
  // participants = checked-in OR already eliminated (position != null)
  const participants = (tDetail?.players ?? []).filter(p => p.isCheckedIn || p.position !== null);
  const eliminatedParticipants = participants.filter(p => p.position !== null);
  // alive = still in play (no position) → ordered by the on-table display order
  const aliveParticipants = inPlay
    .map(row => participants.find(p => p.playerId === row.id))
    .filter((p): p is NonNullable<typeof p> => p != null && p.position === null);

  // alive get positions 1..k (champion = 1)
  const finishPositions: FinishPlayerPosition[] = [
    ...eliminatedParticipants.map(p => ({ playerId: p.playerId, position: p.position as number })),
    ...aliveParticipants.map((p, i) => ({ playerId: p.playerId, position: i + 1 })),
  ];

  // Display ranking ordered by position (1º, 2º, 3º…)
  const finishRanking = [
    ...aliveParticipants.map((p, i) => ({
      playerId: p.playerId,
      name: p.playerName,
      position: i + 1,
    })),
    ...eliminatedParticipants.map(p => ({
      playerId: p.playerId,
      name: p.playerName,
      position: p.position as number,
    })),
  ].sort((a, b) => a.position - b.position);

  const handleConfirmFinish = async () => {
    try {
      await finishMut.mutateAsync({ positions: finishPositions });
      toast.success('Torneio encerrado!');
      setFinishOpen(false);
      navigate(`/app/debitos/pagamentos?t=${activeTId}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Falha ao encerrar o torneio.';
      toast.error(message);
    }
  };

  // Actions
  // Pausado → resume (/resume), nunca /start; o estado de sucesso chega via SignalR.
  const onTimerError = { onError: () => toast.error('Falha ao atualizar o timer') };
  const handleTogglePause = () => clock.paused ? resumeMut.mutate(undefined, onTimerError) : pauseMut.mutate(undefined, onTimerError);
  const handleNextLevel = () => nextMut.mutate(undefined, onTimerError);
  const handlePrevLevel = () => prevMut.mutate(undefined, onTimerError);

  const openSheet = useCallback((p: MockTablePlayer) => {
    setSelectedId(p.id);
    setStep('actions');
  }, []);

  const closeSheet = useCallback(() => {
    setSelectedId(null);
  }, []);

  const adjust = useCallback((id: string, key: 'rebuys' | 'addons', delta: number) => {
    if (delta > 0) {
      if (key === 'rebuys') {
        rebuyMut.mutate(id, { onSuccess: () => toast.success('Rebuy adicionado') });
      } else {
        addonMut.mutate({ playerId: id, hasAddon: true }, { onSuccess: () => toast.success('Add-on adicionado') });
      }
    } else {
      if (key === 'addons') {
        addonMut.mutate({ playerId: id, hasAddon: false }, { onSuccess: () => toast.success('Add-on removido') });
      }
    }
  }, [rebuyMut, addonMut]);

  const handleCheckIn = useCallback(() => {
    if (!selectedPlayer) return;
    checkInMut.mutate(selectedPlayer.id, {
      onSuccess: () => {
        toast.success(`${selectedPlayer.name}: check-in confirmado`);
        closeSheet();
      }
    });
  }, [selectedPlayer, checkInMut, closeSheet]);

  // Check-in inline da seção "Aguardando check-in" (não depende de `selectedPlayer` do sheet).
  const handleCheckInPending = useCallback(
    (playerId: string, playerName: string) => {
      checkInMut.mutate(playerId, {
        onSuccess: () => toast.success(`${playerName}: check-in confirmado`),
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : 'Falha no check-in.'),
      });
    },
    [checkInMut],
  );

  // Inscrição tardia: adiciona e, com o jogo já rolando, faz o check-in na sequência para o
  // jogador entrar direto na mesa (mesmo fluxo do dialog do Blazor durante o torneio).
  const handleAddPlayer = useCallback(
    async (p: PlayerDto) => {
      try {
        await addPlayerMut.mutateAsync(p.id);
        if (tStatus !== TournamentStatus.Scheduled) {
          await checkInMut.mutateAsync(p.id);
        }
        toast.success(`${p.name} adicionado ao torneio`);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Falha ao adicionar jogador.');
      }
    },
    [addPlayerMut, checkInMut, tStatus],
  );

  const handleEliminate = useCallback(
    (eliminatedBy: MockTablePlayer) => {
      if (!selectedPlayer) return;
      eliminateMut.mutate(
        { playerId: selectedPlayer.id, eliminatedByPlayerId: eliminatedBy.id, position: inPlay.length },
        {
          onSuccess: () => {
            toast.success(`${selectedPlayer.name} eliminado`);
            closeSheet();
          }
        }
      );
    },
    [selectedPlayer, eliminateMut, closeSheet, inPlay.length],
  );

  const undoElimination = useCallback(
    (p: MockTablePlayer) => {
      undoEliminateMut.mutate(p.id, {
        onSuccess: () => toast.success(`Eliminação de ${p.name} desfeita`)
      });
    },
    [undoEliminateMut],
  );

  // ---- Expenses handlers ----
  const openNewExpense = () => setExpenseSheet({ open: true, expense: null });
  const openEditExpense = (expense: TournamentExpenseDto) => setExpenseSheet({ open: true, expense });
  const closeExpenseSheet = () => setExpenseSheet({ open: false, expense: null });

  const handleSaveExpense = async (dto: CreateExpenseDto) => {
    if (expenseSheet.expense) {
      await updateExpenseMut.mutateAsync({ expenseId: expenseSheet.expense.id, dto });
      toast.success('Despesa atualizada');
    } else {
      await createExpenseMut.mutateAsync(dto);
      toast.success('Despesa adicionada');
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseSheet.expense) return;
    await deleteExpenseMut.mutateAsync(expenseSheet.expense.id);
    toast.success('Despesa excluída');
  };

  // ---- Render guards (DEPOIS de todos os hooks) ----
  if (isLoadingTournaments || (activeTId && isLoadingDetail)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeTId || !tDetail) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center text-center p-4">
        <p className="text-muted-foreground mb-4">Nenhum torneio em andamento na liga.</p>
        <Button onClick={() => navigate('/app/torneio')}>Voltar</Button>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pb-24 min-h-full" style={{ '--dashboard-content': 'block' } as CSSProperties}>
        {/* ---- Header (uma linha enxuta: título prioritário + ações) ---- */}
        <div className="flex items-center gap-2 mb-[14px] pt-1">
          <IconButton icon={ArrowLeft} aria-label="Voltar" size="md" onClick={() => navigate('/app/torneio')} className="shrink-0" />
          <span className="flex-1 min-w-0 font-sans font-bold text-[17px] whitespace-nowrap overflow-hidden text-ellipsis">
            {tName}
          </span>
          <IconButton
            icon={MonitorPlay}
            aria-label="Modo TV"
            variant="solid"
            size="sm"
            onClick={() => window.open(`/tv/${tDetail.inviteCode}`, '_blank')}
            className="shrink-0 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
          />
          <IconButton
            icon={Settings2}
            aria-label="Configurar torneio"
            variant="solid"
            size="sm"
            onClick={() => navigate(`/app/torneio/novo?edit=1&id=${tDetail.id}`)}
            className="shrink-0"
          />
        </div>

        {/* ---- Desktop lg: two-column layout ---- */}
        <div className="lg:grid lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.3fr)] lg:gap-5 lg:items-start">
          {/* Left column */}
          <div className="flex flex-col gap-3">
            <LevelControl state={clock} onPrev={handlePrevLevel} onTogglePause={handleTogglePause} onNext={handleNextLevel} />

            <div className="grid grid-cols-3 gap-[10px]">
              <StatTile value={`${inPlay.length}/${tMaxPlayers}`} label="Na mesa" icon={Users} center valueSize="17px" />
              <StatTile value={<MoneyValue value={prizePool} cents={false} color="none" size="17px" />} label="Prize pool" icon={Trophy} tone="emerald" center valueSize="17px" />
              <StatTile value={totalRebuys} label="Rebuys" icon={Repeat} center valueSize="17px" />
            </div>

            <div className="mt-1">
              <Button variant="primary" icon={Flag} block onClick={() => setFinishOpen(true)}>
                Encerrar torneio
              </Button>
              <div className="text-[12px] text-muted-foreground text-center mt-2">
                Calcula prêmios, caixinha e quem paga quem.
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="mt-3 lg:mt-0">
            {awaitingCheckIn.length > 0 && (
              <>
                <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                  Aguardando check-in · {awaitingCheckIn.length}
                </div>
                <div className="flex flex-col gap-2 mb-[18px]">
                  {awaitingCheckIn.map((p) => {
                    const pending = checkInMut.isPending && checkInMut.variables === p.playerId;
                    return (
                      <div
                        key={p.playerId}
                        className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] border border-border bg-card"
                      >
                        <Avatar name={p.playerName} />
                        <div className="flex-1 min-w-0">
                          <div className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">
                            {p.playerName}
                          </div>
                          <div className="text-[12px] text-muted-foreground">
                            @{p.nickname ?? p.playerName.split(' ')[0]}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={pending ? Loader2 : UserCheck}
                          disabled={checkInMut.isPending}
                          onClick={() => handleCheckInPending(p.playerId, p.playerName)}
                          className={pending ? '[&_svg]:animate-spin' : undefined}
                        >
                          Check-in
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex items-center justify-between mb-2">
              <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Na mesa · {inPlay.length}
              </div>
              {canAddPlayer && (
                <Button variant="outline" size="sm" icon={UserPlus} onClick={() => setAddPlayerOpen(true)}>
                  Adicionar
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {inPlay.map((p) => (
                <PlayerRow key={p.id} player={p} onSelect={openSheet} />
              ))}
            </div>

            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-[18px] mb-2">
              Eliminados · {out.length}
            </div>
            <div className="flex flex-col gap-2">
              {out.length === 0 ? (
                <div className="text-[12.5px] text-muted-foreground px-[2px] py-1">Ninguém eliminado ainda.</div>
              ) : (
                out.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)]">
                    <span className="w-[30px] h-[30px] rounded-[8px] bg-secondary flex items-center justify-center font-mono font-bold text-[13px] text-muted-foreground shrink-0">
                      {p.place}º
                    </span>
                    <span className="flex-1 min-w-0 font-sans font-medium text-[14px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      {p.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => undoElimination(p)}
                      title="Desfazer eliminação"
                      className="inline-flex items-center gap-1.5 h-8 px-[10px] rounded-[var(--radius-sm)] border border-border bg-transparent cursor-pointer text-muted-foreground font-sans font-semibold text-[12.5px] shrink-0 hover:bg-secondary transition-colors"
                    >
                      <Undo2 className="w-[13px] h-[13px]" />
                      Desfazer
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* ---- Despesas ---- */}
            <div className="mt-[18px]">
              <div className="flex items-center justify-between mb-2">
                <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Despesas · {expenses?.length ?? 0}
                </div>
                {canOperate && (
                  <Button variant="outline" size="sm" icon={Plus} onClick={openNewExpense}>
                    Adicionar
                  </Button>
                )}
              </div>

              {isLoadingExpenses ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (expenses ?? []).length === 0 ? (
                <div className="text-[12.5px] text-muted-foreground px-[2px] py-1">
                  Nenhuma despesa registrada.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(expenses ?? []).map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] border border-border bg-card"
                    >
                      <div className="size-8 rounded-[8px] bg-secondary flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">
                          {e.description}
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">
                          Pago por {e.paidByPlayerName.split(' ')[0]} · {e.shares.length} rateando
                        </div>
                      </div>
                      <MoneyValue value={e.totalAmount} cents={false} color="none" size="14px" />
                      {canOperate && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditExpense(e)}
                            aria-label="Editar despesa"
                            className="inline-flex items-center justify-center size-8 rounded-[var(--radius-sm)] hover:bg-secondary text-muted-foreground"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditExpense(e)}
                            aria-label="Excluir despesa"
                            className="inline-flex items-center justify-center size-8 rounded-[var(--radius-sm)] hover:bg-destructive/10 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedPlayer && step === 'actions' && (
        <ActionSheet
          player={selectedPlayer}
          buyIn={tBuyIn}
          onClose={closeSheet}
          onAdjust={adjust}
          onEliminate={() => setStep('eliminate')}
          onCheckIn={handleCheckIn}
        />
      )}

      {selectedPlayer && step === 'eliminate' && (
        <EliminateSheet
          eliminatedPlayer={selectedPlayer}
          activePlayers={inPlay.filter((p) => p.id !== selectedPlayer.id)}
          onEliminate={handleEliminate}
          onBack={() => setStep('actions')}
          onClose={closeSheet}
        />
      )}

      {addPlayerOpen && (
        <Sheet
          open
          onClose={() => setAddPlayerOpen(false)}
          title="Adicionar jogador"
          subtitle={
            tStatus !== TournamentStatus.Scheduled
              ? 'Inscrição tardia: o jogador entra direto na mesa'
              : 'Jogadores ativos da liga fora do torneio'
          }
          fixed
        >
          <div className="flex flex-col gap-2">
            {availablePlayers.length === 0 ? (
              <div className="text-[12.5px] text-muted-foreground px-[2px] py-1">
                Todos os jogadores ativos da liga já estão no torneio.
              </div>
            ) : (
              availablePlayers.map((p) => {
                const pending =
                  (addPlayerMut.isPending && addPlayerMut.variables === p.id) ||
                  (checkInMut.isPending && checkInMut.variables === p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] border border-border bg-card"
                  >
                    <Avatar name={p.name} />
                    <div className="flex-1 min-w-0">
                      <div className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">
                        {p.name}
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        @{p.nickname ?? p.name.split(' ')[0]}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={pending ? Loader2 : UserPlus}
                      disabled={addPlayerMut.isPending || checkInMut.isPending}
                      onClick={() => void handleAddPlayer(p)}
                      className={pending ? '[&_svg]:animate-spin' : undefined}
                    >
                      Adicionar
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </Sheet>
      )}

      {finishOpen && (
        <Sheet
          open
          onClose={() => setFinishOpen(false)}
          title="Encerrar torneio"
          subtitle="Confira a classificação final antes de confirmar"
          fixed
        >
          <div className="flex flex-col gap-2">
            {aliveParticipants.length > 1 && (
              <div className="text-[12px] text-muted-foreground px-[2px] pb-1">
                Há mais de um jogador na mesa: a ordem de exibição vira o ranking (primeiro = campeão).
              </div>
            )}

            {finishRanking.length === 0 ? (
              <div className="text-[12.5px] text-muted-foreground px-[2px] py-1">
                Nenhum participante para classificar.
              </div>
            ) : (
              finishRanking.map((r) => (
                <div
                  key={r.playerId}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] border border-border bg-card"
                >
                  <span
                    className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center font-mono font-bold text-[13px] shrink-0 ${
                      r.position === 1 ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {r.position}º
                  </span>
                  <span className="flex-1 min-w-0 font-sans font-medium text-[14px] text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                    {r.name}
                  </span>
                </div>
              ))
            )}

            <Button
              variant="primary"
              icon={finishMut.isPending ? Loader2 : Flag}
              block
              disabled={finishMut.isPending || finishRanking.length === 0}
              onClick={handleConfirmFinish}
              className={finishMut.isPending ? '[&_svg]:animate-spin' : undefined}
            >
              Confirmar encerramento
            </Button>
            <Button
              variant="ghost"
              block
              disabled={finishMut.isPending}
              onClick={() => setFinishOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </Sheet>
      )}

      {expenseSheet.open && (
        <ExpenseSheet
          open
          onClose={closeExpenseSheet}
          tournamentId={activeTId}
          expense={expenseSheet.expense}
          leaguePlayers={leaguePlayers ?? []}
          eligiblePlayers={eligiblePlayers ?? []}
          onSubmit={handleSaveExpense}
          onDelete={expenseSheet.expense ? handleDeleteExpense : undefined}
          isPending={createExpenseMut.isPending || updateExpenseMut.isPending || deleteExpenseMut.isPending}
        />
      )}
    </>
  );
}
