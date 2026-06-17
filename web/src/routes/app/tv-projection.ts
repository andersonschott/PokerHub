/**
 * tv-projection — lógica PURA do modo TV (sem React, sem SignalR).
 *
 * Separada da rota tv.tsx para ser testável de forma determinística (padrão do projectClock/1B):
 *  - `mapPlayersToTable`  : TournamentPlayerDto[] → shape de UI (id/name/nick/status/place/rebuys/addons)
 *  - `aggregateStats`     : agrega total/restantes/rebuys/addons a partir da table
 *  - `normalizePrizes`    : TournamentPrizeDto[] → linhas de premiação ordenadas (esconde prêmios <= 0)
 *  - `restFallbackClock`  : deriva um relógio do DTO REST quando ainda não há TimerStateSync (sem mock)
 *  - `isLiveClock`        : distingue o estado "carregando" (level 0) do clock real do SignalR
 *
 * Nenhuma regra de dinheiro vive aqui: os valores de prêmio vêm prontos do backend (engine única).
 */
import { type MockClockState } from '@/features/timer/use-mock-clock';
import {
  TournamentStatus,
  type BlindLevelDto,
  type TournamentPlayerDto,
  type TournamentPrizeDto,
} from '@/lib/api/hooks/use-tournaments';

export type TvPlayerStatus = 'in' | 'out';

export interface TvTablePlayer {
  id: string;
  name: string;
  nick: string;
  status: TvPlayerStatus;
  place?: number;
  rebuys: number;
  addons: number;
}

export interface TvStats {
  /** Participantes (com check-in ou já posicionados). */
  players: number;
  /** Ainda na mesa (sem posição definida). */
  remaining: number;
  rebuys: number;
  addons: number;
}

export interface TvPrize {
  position: number;
  amount: number;
  /** Percentual já arredondado para exibição. */
  pct: number;
}

/**
 * Mapeia os jogadores da API para o shape consumido pela lista de eliminações da TV.
 * Considera apenas quem participou (check-in feito OU já tem posição). Espelha dashboard.tsx (~:77).
 */
export function mapPlayersToTable(players: readonly TournamentPlayerDto[] | undefined): TvTablePlayer[] {
  return (players ?? [])
    .filter((p) => p.isCheckedIn || p.position !== null)
    .map((p) => ({
      id: p.playerId,
      name: p.playerName,
      nick: p.nickname ?? p.playerName.split(' ')[0],
      status: p.position !== null ? 'out' : 'in',
      place: p.position ?? undefined,
      rebuys: p.rebuyCount,
      addons: p.hasAddon ? 1 : 0,
    }));
}

/** Agrega os contadores exibidos no painel "Mesa" a partir da table já mapeada (fonte única). */
export function aggregateStats(table: readonly TvTablePlayer[]): TvStats {
  return {
    players: table.length,
    remaining: table.filter((p) => p.status === 'in').length,
    rebuys: table.reduce((s, p) => s + (p.rebuys || 0), 0),
    addons: table.reduce((s, p) => s + (p.addons || 0), 0),
  };
}

/** Eliminados ordenados por colocação (1º, 2º, ...) — para a lista de eliminações da TV. */
export function eliminatedFromTable(table: readonly TvTablePlayer[]): TvTablePlayer[] {
  return table
    .filter((p) => p.status === 'out')
    .sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
}

/** Normaliza os prêmios do backend: esconde valores <= 0, ordena por posição e arredonda o pct. */
export function normalizePrizes(prizes: readonly TournamentPrizeDto[] | undefined): TvPrize[] {
  return (prizes ?? [])
    .filter((p) => p.amount > 0)
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ position: p.position, amount: p.amount, pct: Math.round(p.percentage) }));
}

function blindInfo(b: BlindLevelDto | undefined) {
  return b ? { sb: b.smallBlind, bb: b.bigBlind, ante: b.ante } : { sb: 0, bb: 0, ante: 0 };
}

/** `true` quando o clock veio do SignalR (qualquer nível real ≥ 1); `false` no LOADING (level 0). */
export function isLiveClock(clock: MockClockState): boolean {
  return clock.level > 0;
}

export interface RestClockInput {
  status: TournamentStatus;
  currentLevel: number;
  timeRemainingSeconds: number | null;
  blindLevels: readonly BlindLevelDto[];
}

/**
 * Deriva um relógio a partir do DTO REST quando ainda não há TimerStateSync (torneio agendado/pausado
 * ou sync ainda não chegou). NUNCA inventa blinds: usa os blindLevels reais do torneio, casando
 * `order === currentLevel` (mesma regra do TournamentTimerService). Sem dado → zeros (não 00:00 enganoso).
 */
export function restFallbackClock(t: RestClockInput): MockClockState {
  const levels = [...(t.blindLevels ?? [])].sort((a, b) => a.order - b.order);
  const current = levels.find((b) => b.order === t.currentLevel) ?? levels[0];
  const next = current ? levels.find((b) => b.order === current.order + 1) : undefined;

  const levelSeconds = (current?.durationMinutes ?? 0) * 60;
  const remainingRaw = t.timeRemainingSeconds ?? levelSeconds;
  const remaining = remainingRaw < 0 ? 0 : remainingRaw;

  let elapsedPct = levelSeconds > 0 ? Math.round((1 - remaining / levelSeconds) * 100) : 0;
  if (elapsedPct < 0) elapsedPct = 0;
  if (elapsedPct > 100) elapsedPct = 100;

  return {
    level: current?.order ?? t.currentLevel,
    remainingSeconds: remaining,
    levelSeconds,
    paused: t.status !== TournamentStatus.InProgress,
    blinds: blindInfo(current),
    nextBlinds: blindInfo(next),
    elapsedPct,
  };
}

export type TvPhase = 'live' | 'waiting' | 'ended';

/** Fase de exibição do timer: aguardando início, encerrado, ou ao vivo. */
export function tvPhase(status: TournamentStatus, hasLiveClock: boolean): TvPhase {
  if (status === TournamentStatus.Finished || status === TournamentStatus.Cancelled) return 'ended';
  if (status === TournamentStatus.Scheduled && !hasLiveClock) return 'waiting';
  return 'live';
}
