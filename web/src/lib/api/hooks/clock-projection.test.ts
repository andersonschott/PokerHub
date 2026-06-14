import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  projectClock,
  reduceSync,
  EMPTY_SYNC_STATE,
  type TimerStateSyncDto,
} from './clock-projection';

const BASE = Date.parse('2026-01-01T00:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

function makeDto(overrides: Partial<TimerStateSyncDto> = {}): TimerStateSyncDto {
  return {
    seq: 1,
    tournamentId: 't1',
    status: 'InProgress',
    currentLevel: 1,
    currentBlindLevel: 1,
    nextBlindLevel: 2,
    currentBlind: { sb: 50, bb: 100, ante: 0, durationMinutes: 15, isBreak: false },
    nextBlind: { sb: 75, bb: 150, ante: 25, durationMinutes: 15, isBreak: false },
    levelEndsAtUtc: undefined,
    pausedRemainingSeconds: undefined,
    serverNowUtc: iso(BASE),
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('projectClock', () => {
  it('1. corrige o remaining pelo offset (servidor à frente e atrás do cliente)', () => {
    const endsAt = BASE + 600_000; // nível termina 10min após a base
    const dto = makeDto({ levelEndsAtUtc: iso(endsAt), serverNowUtc: iso(BASE + 30_000) });

    // Servidor 30s à FRENTE: reduceSync deriva offset = +30s; remaining encurta para 570s.
    const ahead = reduceSync(EMPTY_SYNC_STATE, dto, BASE);
    expect(ahead.offsetMs).toBe(30_000);
    expect(projectClock(dto, BASE, ahead.offsetMs).remainingSeconds).toBe(570);

    // Servidor 30s ATRÁS: offset = -30s; remaining alonga para 630s.
    const behindDto = makeDto({ levelEndsAtUtc: iso(endsAt), serverNowUtc: iso(BASE - 30_000) });
    const behind = reduceSync(EMPTY_SYNC_STATE, behindDto, BASE);
    expect(behind.offsetMs).toBe(-30_000);
    expect(projectClock(behindDto, BASE, behind.offsetMs).remainingSeconds).toBe(630);

    // Offset zero: remaining = duração inteira (600s).
    expect(projectClock(dto, BASE, 0).remainingSeconds).toBe(600);
  });

  it('2. pausado: pausedRemainingSeconds sem levelEndsAtUtc => paused e remaining congelado', () => {
    const dto = makeDto({ pausedRemainingSeconds: 420, levelEndsAtUtc: undefined });

    const a = projectClock(dto, BASE, 0);
    expect(a.paused).toBe(true);
    expect(a.remainingSeconds).toBe(420);

    // Avançar o "agora" não altera o congelado (não há âncora).
    const b = projectClock(dto, BASE + 5 * 60_000, 12_345);
    expect(b.paused).toBe(true);
    expect(b.remainingSeconds).toBe(420);
  });

  it('pausa REAL do backend: levelEndsAtUtc presente + pausedRemainingSeconds => congela', () => {
    // Contrato real: mesmo se o backend ainda enviasse a âncora junto com o congelado,
    // o cliente prioriza pausedRemainingSeconds (defesa em profundidade) e NÃO decrementa.
    const dto = makeDto({
      status: 'Paused',
      levelEndsAtUtc: iso(BASE + 600_000),
      pausedRemainingSeconds: 420,
    });

    const a = projectClock(dto, BASE, 0);
    expect(a.paused).toBe(true);
    expect(a.remainingSeconds).toBe(420);

    // Avançar o relógio (e até aplicar offset) não pode decrementar o congelado.
    expect(projectClock(dto, BASE + 5 * 60_000, 12_345).remainingSeconds).toBe(420);
    expect(projectClock(dto, BASE + 5 * 60_000, 12_345).paused).toBe(true);
  });

  it('3. troca de nível: novo currentLevel/blinds refletem no estado', () => {
    const dto = makeDto({
      currentLevel: 5,
      currentBlind: { sb: 300, bb: 600, ante: 75, durationMinutes: 20, isBreak: false },
      nextBlind: { sb: 400, bb: 800, ante: 100, durationMinutes: 20, isBreak: false },
      levelEndsAtUtc: iso(BASE + 20 * 60_000),
    });

    const s = projectClock(dto, BASE, 0);
    expect(s.level).toBe(5);
    expect(s.blinds).toEqual({ sb: 300, bb: 600, ante: 75 });
    expect(s.nextBlinds).toEqual({ sb: 400, bb: 800, ante: 100 });
    expect(s.levelSeconds).toBe(20 * 60); // durationMinutes*60, sem mock
  });

  it('5. gap de background: ~20min além do fim => remaining clampa em 0 (sem negativo)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE);

    const endsAt = BASE + 600_000; // 10min
    const dto = makeDto({ levelEndsAtUtc: iso(endsAt) });

    // Simula a aba acordando 20min depois — recomputa da âncora absoluta.
    vi.advanceTimersByTime(20 * 60_000);
    const s = projectClock(dto, Date.now(), 0);

    expect(s.remainingSeconds).toBe(0);
    expect(s.remainingSeconds).toBeGreaterThanOrEqual(0);
    expect(s.paused).toBe(false); // ainda há âncora; não é estado pausado
    expect(s.elapsedPct).toBe(100);
  });

  it('6. elapsedPct sempre dentro de [0,100] (passado, futuro e meio do nível)', () => {
    const levelSeconds = 900;
    const cases: TimerStateSyncDto[] = [
      makeDto({ levelEndsAtUtc: iso(BASE - 60_000) }), // já passou -> 100
      makeDto({ levelEndsAtUtc: iso(BASE + 1_000_000) }), // remaining > duração -> 0
      makeDto({ levelEndsAtUtc: iso(BASE + (levelSeconds / 2) * 1000) }), // meio -> ~50
    ];

    for (const dto of cases) {
      const pct = projectClock(dto, BASE, 0).elapsedPct;
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }

    expect(projectClock(cases[0]!, BASE, 0).elapsedPct).toBe(100);
    expect(projectClock(cases[1]!, BASE, 0).elapsedPct).toBe(0);
    expect(projectClock(cases[2]!, BASE, 0).elapsedPct).toBe(50);
  });

  it('terminal: sem levelEndsAtUtc e sem pausedRemainingSeconds => remaining 0 e paused', () => {
    const dto = makeDto({ levelEndsAtUtc: undefined, pausedRemainingSeconds: undefined });
    const s = projectClock(dto, BASE, 0);
    expect(s.remainingSeconds).toBe(0);
    expect(s.paused).toBe(true);
  });
});

describe('reduceSync (descarte de seq fora de ordem)', () => {
  it('4. aplica seq=10 e depois IGNORA seq=5 (estado continua do seq=10)', () => {
    const dto10 = makeDto({ seq: 10, currentLevel: 10, serverNowUtc: iso(BASE) });
    const dto5 = makeDto({ seq: 5, currentLevel: 5, serverNowUtc: iso(BASE + 999_000) });

    const afterTen = reduceSync(EMPTY_SYNC_STATE, dto10, BASE);
    expect(afterTen.lastSeq).toBe(10);
    expect(afterTen.dto).toBe(dto10);

    // seq=5 <= 10 -> ignorado: retorna o MESMO estado (referência inalterada).
    const afterFive = reduceSync(afterTen, dto5, BASE + 1000);
    expect(afterFive).toBe(afterTen);
    expect(afterFive.dto).toBe(dto10);
    expect(afterFive.lastSeq).toBe(10);

    // Um seq maior (11) é aceito normalmente.
    const dto11 = makeDto({ seq: 11, currentLevel: 11, serverNowUtc: iso(BASE) });
    const afterEleven = reduceSync(afterFive, dto11, BASE);
    expect(afterEleven.lastSeq).toBe(11);
    expect(afterEleven.dto).toBe(dto11);
  });

  it('seq igual ao último também é ignorado (reconexão/replay)', () => {
    const dto = makeDto({ seq: 7 });
    const first = reduceSync(EMPTY_SYNC_STATE, dto, BASE);
    const again = reduceSync(first, makeDto({ seq: 7, currentLevel: 99 }), BASE);
    expect(again).toBe(first);
  });
});
