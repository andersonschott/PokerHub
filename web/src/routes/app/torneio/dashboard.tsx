/**
 * /app/torneio/dashboard — Painel ao vivo do organizador.
 * Refatorado na Fase 4 para consumir SignalR e a API Real.
 */
import { useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2, Flag, Users, Trophy, Repeat, Undo2, Loader2, MonitorPlay, UserCheck } from 'lucide-react';
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

import { useTournaments, useTournament, TournamentStatus, usePauseTournament, useResumeTournament, useNextLevel, usePrevLevel, useCheckInPlayer, useEliminatePlayer, useAddRebuy, useSetAddon, useUndoElimination, useFinishTournament, type FinishPlayerPosition } from '@/lib/api/hooks/use-tournaments';
import { useActiveLeague } from '@/features/leagues/league-context';
import { useTournamentClock } from '@/lib/api/hooks/use-tournament-clock';
import { ApiError } from '@/lib/api/client';
import { type MockTablePlayer } from '@/mocks/data';

type SheetStep = 'actions' | 'eliminate';

export default function DashboardRoute() {
  const navigate = useNavigate();
  const { activeLeagueId } = useActiveLeague();

  // Find active tournament
  const { data: tournaments, isLoading: isLoadingTournaments } = useTournaments(activeLeagueId ?? '');
  const activeT = tournaments?.find(t => t.status === TournamentStatus.InProgress || t.status === TournamentStatus.Paused);
  const activeTId = activeT?.id ?? '';

  const { data: tDetail, isLoading: isLoadingDetail } = useTournament(activeTId);
  const { state: clock } = useTournamentClock(activeTId);

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

            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Na mesa · {inPlay.length}
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
    </>
  );
}
