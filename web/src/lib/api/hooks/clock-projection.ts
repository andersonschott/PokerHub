/**
 * clock-projection — lógica PURA do relógio do torneio (sem React, sem SignalR).
 *
 * Separada do hook para ser testável de forma determinística com fake timers:
 *  - `projectClock` projeta um TimerStateSyncDto + (now, offset) no estado da UI;
 *  - `reduceSync` aplica um novo DTO descartando mensagens fora de ordem (seq <= último).
 *
 * A forma de saída espelha `MockClockState` para não quebrar os consumidores.
 * Consumidor atual: dashboard.tsx via LevelControl (useTournamentClock). tv.tsx ainda usa
 * useMockClock e será migrado para esta projeção numa fase posterior (Fase 4).
 */
import { type MockClockState, type BlindInfo } from '@/features/timer/use-mock-clock';

/** Blinds reais de um nível, vindos do backend (espelha TimerBlindInfoDto em C#). */
export interface BlindLevelDto {
  sb: number;
  bb: number;
  ante: number;
  durationMinutes: number;
  isBreak: boolean;
}

export interface TimerStateSyncDto {
  seq: number;
  tournamentId: string;
  status: string;
  currentLevel: number;
  /** Número de jogo derivado pelo backend (intervalo não conta). Ver TimerStateSyncDto.cs. */
  currentLevelDisplay?: number;
  /** True quando o passo atual é um intervalo/break. */
  isBreak?: boolean;
  currentBlindLevel?: number;
  nextBlindLevel?: number;
  currentBlind?: BlindLevelDto | null;
  nextBlind?: BlindLevelDto | null;
  levelEndsAtUtc?: string | null;
  pausedRemainingSeconds?: number | null;
  serverNowUtc: string;
}

/** Estado de "carregando": forma válida de MockClockState, porém sem dados reais (zero mock). */
export const LOADING_CLOCK_STATE: MockClockState = {
  level: 0,
  displayLevel: 0,
  isBreak: false,
  remainingSeconds: 0,
  levelSeconds: 0,
  paused: true,
  blinds: { sb: 0, bb: 0, ante: 0 },
  nextBlinds: { sb: 0, bb: 0, ante: 0 },
  nextIsBreak: false,
  elapsedPct: 0,
};

/** Estado acumulado da sincronização: último DTO aceito, seu seq e o offset relógio cliente↔servidor. */
export interface ClockSyncState {
  dto: TimerStateSyncDto | null;
  lastSeq: number;
  offsetMs: number;
}

export const EMPTY_SYNC_STATE: ClockSyncState = {
  dto: null,
  lastSeq: 0,
  offsetMs: 0,
};

function blindsOf(b: BlindLevelDto | null | undefined): BlindInfo {
  return b ? { sb: b.sb, bb: b.bb, ante: b.ante } : { sb: 0, bb: 0, ante: 0 };
}

/**
 * Aplica um novo DTO ao estado de sincronização.
 * Descarta mensagens com `seq` menor ou igual ao último aceito (cobre reconexão/replay
 * e reordenação de entrega). Quando aceito, recalcula o offset = serverNow - localNow.
 */
export function reduceSync(
  prev: ClockSyncState,
  dto: TimerStateSyncDto,
  localNowMs: number,
): ClockSyncState {
  if (dto.seq <= prev.lastSeq) return prev;

  const serverNowMs = new Date(dto.serverNowUtc).getTime();
  return {
    dto,
    lastSeq: dto.seq,
    offsetMs: serverNowMs - localNowMs,
  };
}

/**
 * Projeta o DTO atual no estado da UI usando os blinds REAIS do DTO.
 *
 * Precedência (defesa em profundidade — pausa SEMPRE vence a âncora):
 * - Pausado (pausedRemainingSeconds presente): remaining congelado, paused = true. Testado ANTES
 *   de levelEndsAtUtc para que o congelado nunca decremente, mesmo que o backend ainda envie a
 *   âncora junto (o contrato manda enviar null em pausa, mas o cliente não confia nisso).
 * - Em andamento (levelEndsAtUtc presente, sem pausa): remaining = endsAt - (now + offset), clamp >= 0.
 * - Terminal (nenhum dos dois): remaining = 0, paused = true.
 *
 * `levelSeconds` vem de currentBlind.durationMinutes * 60; `elapsedPct` é clampado em [0,100].
 */
export function projectClock(
  dto: TimerStateSyncDto,
  nowMs: number,
  offsetMs: number,
): MockClockState {
  const levelSeconds = (dto.currentBlind?.durationMinutes ?? 0) * 60;

  let remaining = 0;
  let paused = true;

  if (dto.pausedRemainingSeconds !== undefined && dto.pausedRemainingSeconds !== null) {
    remaining = dto.pausedRemainingSeconds;
    paused = true;
  } else if (dto.levelEndsAtUtc) {
    const endsAtMs = new Date(dto.levelEndsAtUtc).getTime();
    const nowServerMs = nowMs + offsetMs;
    remaining = (endsAtMs - nowServerMs) / 1000;
    paused = false;
  }

  if (remaining < 0) remaining = 0;
  const roundedRemaining = Math.ceil(remaining);

  let elapsedPct =
    levelSeconds > 0 ? Math.round((1 - roundedRemaining / levelSeconds) * 100) : 0;
  if (elapsedPct < 0) elapsedPct = 0;
  if (elapsedPct > 100) elapsedPct = 100;

  return {
    level: dto.currentLevel,
    // Número de jogo derivado pelo backend (intervalo não conta). Fallbacks defensivos para
    // payloads antigos: displayLevel ← currentLevel; isBreak ← flag do blind atual, senão false.
    displayLevel: dto.currentLevelDisplay ?? dto.currentLevel,
    isBreak: dto.isBreak ?? dto.currentBlind?.isBreak ?? false,
    remainingSeconds: roundedRemaining,
    levelSeconds,
    paused,
    blinds: blindsOf(dto.currentBlind),
    nextBlinds: blindsOf(dto.nextBlind),
    nextIsBreak: dto.nextBlind?.isBreak ?? false,
    elapsedPct,
  };
}
