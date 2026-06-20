/**
 * Teste de DRIFT do relógio do torneio (restrição inegociável do projeto: zero drift).
 *
 * O relógio é ancorado em tempo absoluto: remaining = levelEndsAtUtc - (now + offset).
 * Por construção isso é imune a drift acumulado e a throttling de aba (a projeção é
 * stateless em relação à anterior). Estes testes PINAM esse comportamento — uma regressão
 * para "decrementar por tick" falharia aqui.
 *
 * Determinístico: usa timestamps fixos, sem Date.now() / sem esperar tempo real.
 */
import { describe, it, expect } from 'vitest';
import {
  projectClock,
  reduceSync,
  EMPTY_SYNC_STATE,
  type TimerStateSyncDto,
  type ClockSyncState,
} from './clock-projection';

const SERVER_BASE = 1_700_000_000_000; // época de servidor fixa
const MIN = 60_000;

function makeBlind(durationMinutes: number) {
  return { sb: 100, bb: 200, ante: 25, durationMinutes, isBreak: false };
}

function syncForLevel(
  level: number,
  levelStartServerMs: number,
  seq: number,
  durationMin: number,
): TimerStateSyncDto {
  return {
    seq,
    tournamentId: 't1',
    status: 'InProgress',
    currentLevel: level,
    currentBlindLevel: level,
    nextBlindLevel: level + 1,
    currentBlind: makeBlind(durationMin),
    nextBlind: makeBlind(durationMin),
    levelEndsAtUtc: new Date(levelStartServerMs + durationMin * MIN).toISOString(),
    pausedRemainingSeconds: null,
    serverNowUtc: new Date(levelStartServerMs).toISOString(),
  };
}

describe('clock drift — projeção ancorada (zero drift)', () => {
  it('zero drift ao longo de 2h+ (10 níveis x 15min), cliente 5s adiantado, amostrando a cada 250ms', () => {
    const SKEW = 5_000; // relógio do cliente 5s à frente do servidor
    const DURATION_MIN = 15;
    const LEVELS = 10; // 150 min > 2h
    const LEVEL_MS = DURATION_MIN * MIN;
    const TOTAL_MS = LEVELS * LEVEL_MS;

    let sync: ClockSyncState = EMPTY_SYNC_STATE;
    let seq = 0;
    let currentLevel = 0;
    let maxErr = 0;
    let samples = 0;

    for (let t = 0; t <= TOTAL_MS; t += 250) {
      const serverNow = SERVER_BASE + t;
      const localNow = serverNow + SKEW; // relógio local enviesado
      const level = Math.min(LEVELS, Math.floor(t / LEVEL_MS) + 1);

      if (level !== currentLevel) {
        currentLevel = level;
        const levelStartServer = SERVER_BASE + (level - 1) * LEVEL_MS;
        // o servidor emite o sync no início do nível; o cliente recebe com seu relógio local
        sync = reduceSync(
          sync,
          syncForLevel(level, levelStartServer, ++seq, DURATION_MIN),
          levelStartServer + SKEW,
        );
      }

      const projected = projectClock(sync.dto!, localNow, sync.offsetMs);

      const levelEndServer = SERVER_BASE + level * LEVEL_MS;
      const trueRemaining = Math.ceil(Math.max(0, (levelEndServer - serverNow) / 1000));
      maxErr = Math.max(maxErr, Math.abs(projected.remainingSeconds - trueRemaining));
      samples++;
    }

    // o offset corrige o skew → projeção idêntica à verdade ancorada, sem acúmulo de erro.
    expect(maxErr).toBe(0);
    // garante que de fato cobrimos 2h+ (em passos de 250ms).
    expect(samples).toBeGreaterThan((2 * 60 * MIN) / 250);
  });

  it('catch-up instantâneo e EXATO após 45min de aba congelada (sem drift)', () => {
    const DURATION_MIN = 60; // nível longo
    const levelStartServer = SERVER_BASE;
    const sync = reduceSync(
      EMPTY_SYNC_STATE,
      syncForLevel(1, levelStartServer, 1, DURATION_MIN),
      levelStartServer,
    );

    const atStart = projectClock(sync.dto!, levelStartServer, sync.offsetMs);
    expect(atStart.remainingSeconds).toBe(60 * 60);

    // 45min depois, SEM nenhuma projeção intermediária (aba throttled):
    const after = projectClock(sync.dto!, levelStartServer + 45 * MIN, sync.offsetMs);
    expect(after.remainingSeconds).toBe(15 * 60); // exato; um relógio por-tick estaria errado
    expect(after.paused).toBe(false);
  });

  it('remaining satura em 0 após o fim do nível (nunca negativo)', () => {
    const sync = reduceSync(EMPTY_SYNC_STATE, syncForLevel(1, SERVER_BASE, 1, 15), SERVER_BASE);
    const past = projectClock(sync.dto!, SERVER_BASE + 20 * MIN, sync.offsetMs);
    expect(past.remainingSeconds).toBe(0);
    expect(past.elapsedPct).toBe(100);
  });

  it('transição de nível segue a nova âncora e descarta sync fora de ordem', () => {
    let sync = reduceSync(EMPTY_SYNC_STATE, syncForLevel(1, SERVER_BASE, 1, 15), SERVER_BASE);
    const l2Start = SERVER_BASE + 15 * MIN;
    sync = reduceSync(sync, syncForLevel(2, l2Start, 2, 15), l2Start);

    const p = projectClock(sync.dto!, l2Start, sync.offsetMs);
    expect(p.level).toBe(2);
    expect(p.remainingSeconds).toBe(15 * 60);

    // sync atrasado do nível 1 (seq menor) é descartado — não regride a âncora
    const stale = reduceSync(sync, syncForLevel(1, SERVER_BASE, 1, 15), l2Start);
    expect(stale.dto!.currentLevel).toBe(2);
  });
});
