import { describe, it, expect } from 'vitest';
import {
  mapPlayersToTable,
  aggregateStats,
  eliminatedFromTable,
  normalizePrizes,
  restFallbackClock,
  isLiveClock,
  tvPhase,
} from './tv-projection';
import { TournamentStatus, type TournamentPlayerDto, type BlindLevelDto } from '@/lib/api/hooks/use-tournaments';

function makePlayer(overrides: Partial<TournamentPlayerDto> = {}): TournamentPlayerDto {
  return {
    id: 'tp-1',
    tournamentId: 't1',
    playerId: 'p1',
    playerName: 'Ana Reis',
    nickname: null,
    isCheckedIn: true,
    checkedInAt: null,
    rebuyCount: 0,
    hasAddon: false,
    position: null,
    prize: 0,
    eliminatedByPlayerId: null,
    eliminatedByPlayerName: null,
    eliminatedAt: null,
    totalInvestment: 0,
    profitLoss: 0,
    ...overrides,
  };
}

function makeBlind(overrides: Partial<BlindLevelDto> = {}): BlindLevelDto {
  return {
    id: 'bl',
    order: 1,
    smallBlind: 25,
    bigBlind: 50,
    ante: 0,
    durationMinutes: 15,
    isBreak: false,
    breakDescription: null,
    ...overrides,
  };
}

describe('mapPlayersToTable', () => {
  it('inclui só participantes (check-in feito ou já posicionados) e classifica in/out', () => {
    const table = mapPlayersToTable([
      makePlayer({ playerId: 'in', isCheckedIn: true, position: null }),
      makePlayer({ playerId: 'out', isCheckedIn: true, position: 7 }),
      makePlayer({ playerId: 'noshow', isCheckedIn: false, position: null }), // descartado
      makePlayer({ playerId: 'placed-noco', isCheckedIn: false, position: 9 }), // mantido (posicionado)
    ]);

    expect(table.map((p) => p.id)).toEqual(['in', 'out', 'placed-noco']);
    expect(table[0].status).toBe('in');
    expect(table[1].status).toBe('out');
    expect(table[1].place).toBe(7);
  });

  it('usa o primeiro nome como nick quando nickname é null e conta add-on', () => {
    const [p] = mapPlayersToTable([
      makePlayer({ playerName: 'Bruno Lima', nickname: null, hasAddon: true, rebuyCount: 2 }),
    ]);
    expect(p.nick).toBe('Bruno');
    expect(p.addons).toBe(1);
    expect(p.rebuys).toBe(2);
  });

  it('lista vazia/undefined → []', () => {
    expect(mapPlayersToTable(undefined)).toEqual([]);
    expect(mapPlayersToTable([])).toEqual([]);
  });
});

describe('aggregateStats', () => {
  it('agrega total, restantes, rebuys e add-ons a partir da table', () => {
    const table = mapPlayersToTable([
      makePlayer({ playerId: 'a', position: null, rebuyCount: 1, hasAddon: true }),
      makePlayer({ playerId: 'b', position: null, rebuyCount: 0, hasAddon: false }),
      makePlayer({ playerId: 'c', position: 3, rebuyCount: 2, hasAddon: true }),
    ]);
    const stats = aggregateStats(table);
    expect(stats.players).toBe(3);
    expect(stats.remaining).toBe(2);
    expect(stats.rebuys).toBe(3);
    expect(stats.addons).toBe(2);
  });
});

describe('eliminatedFromTable', () => {
  it('retorna só eliminados ordenados por colocação', () => {
    const table = mapPlayersToTable([
      makePlayer({ playerId: 'a', position: null }),
      makePlayer({ playerId: 'b', position: 9 }),
      makePlayer({ playerId: 'c', position: 7 }),
    ]);
    expect(eliminatedFromTable(table).map((p) => p.place)).toEqual([7, 9]);
  });
});

describe('normalizePrizes', () => {
  it('ordena por posição, esconde prêmios <= 0 e arredonda o pct', () => {
    const out = normalizePrizes([
      { position: 2, amount: 60, percentage: 30 },
      { position: 1, amount: 100, percentage: 50 },
      { position: 3, amount: 0, percentage: 0 }, // escondido
      { position: 4, amount: 40, percentage: 19.6 },
    ]);
    expect(out).toEqual([
      { position: 1, amount: 100, pct: 50 },
      { position: 2, amount: 60, pct: 30 },
      { position: 4, amount: 40, pct: 20 },
    ]);
  });

  it('undefined → []', () => {
    expect(normalizePrizes(undefined)).toEqual([]);
  });
});

describe('isLiveClock', () => {
  it('distingue LOADING (level 0) do clock real', () => {
    expect(isLiveClock({ level: 0 } as never)).toBe(false);
    expect(isLiveClock({ level: 1 } as never)).toBe(true);
  });
});

describe('restFallbackClock', () => {
  const blindLevels = [
    makeBlind({ order: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 15 }),
    makeBlind({ order: 2, smallBlind: 50, bigBlind: 100, ante: 0, durationMinutes: 15 }),
  ];

  it('torneio agendado: pausado, blinds do nível 1, duração cheia', () => {
    const c = restFallbackClock({
      status: TournamentStatus.Scheduled,
      currentLevel: 1,
      timeRemainingSeconds: null,
      blindLevels,
    });
    expect(c.paused).toBe(true);
    expect(c.level).toBe(1);
    expect(c.blinds).toEqual({ sb: 25, bb: 50, ante: 0 });
    expect(c.nextBlinds).toEqual({ sb: 50, bb: 100, ante: 0 });
    expect(c.remainingSeconds).toBe(900);
    expect(c.elapsedPct).toBe(0);
  });

  it('em andamento sem sync: usa timeRemainingSeconds do REST e calcula elapsedPct', () => {
    const c = restFallbackClock({
      status: TournamentStatus.InProgress,
      currentLevel: 2,
      timeRemainingSeconds: 450,
      blindLevels,
    });
    expect(c.paused).toBe(false);
    expect(c.level).toBe(2);
    expect(c.blinds).toEqual({ sb: 50, bb: 100, ante: 0 });
    expect(c.nextBlinds).toEqual({ sb: 0, bb: 0, ante: 0 }); // não há nível 3
    expect(c.remainingSeconds).toBe(450);
    expect(c.elapsedPct).toBe(50); // 1 - 450/900
  });

  it('sem blindLevels: zeros, sem 00:00 enganoso quebrando', () => {
    const c = restFallbackClock({
      status: TournamentStatus.Scheduled,
      currentLevel: 1,
      timeRemainingSeconds: null,
      blindLevels: [],
    });
    expect(c.blinds).toEqual({ sb: 0, bb: 0, ante: 0 });
    expect(c.levelSeconds).toBe(0);
    expect(c.remainingSeconds).toBe(0);
    expect(c.elapsedPct).toBe(0);
  });

  it('remaining negativo é clampado em 0', () => {
    const c = restFallbackClock({
      status: TournamentStatus.InProgress,
      currentLevel: 1,
      timeRemainingSeconds: -10,
      blindLevels,
    });
    expect(c.remainingSeconds).toBe(0);
    expect(c.elapsedPct).toBe(100);
  });
});

describe('tvPhase', () => {
  it('mapeia status + presença de clock para a fase de exibição', () => {
    expect(tvPhase(TournamentStatus.Scheduled, false)).toBe('waiting');
    expect(tvPhase(TournamentStatus.Scheduled, true)).toBe('live');
    expect(tvPhase(TournamentStatus.InProgress, false)).toBe('live');
    expect(tvPhase(TournamentStatus.Finished, true)).toBe('ended');
    expect(tvPhase(TournamentStatus.Cancelled, false)).toBe('ended');
  });
});
