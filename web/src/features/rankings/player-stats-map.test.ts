import { describe, it, expect } from 'vitest';
import {
  formatResultDate,
  mapRecentResult,
  mapPlayerStatsDetail,
} from './player-stats-map';
import type {
  PlayerStatsDto,
  PlayerTournamentResultDto,
} from '@/lib/api/hooks/use-player-stats';

function makeResult(
  overrides: Partial<PlayerTournamentResultDto> = {},
): PlayerTournamentResultDto {
  return {
    tournamentId: 't1',
    tournamentName: 'Etapa 3',
    date: '2026-03-15T20:00:00Z',
    position: 2,
    totalPlayers: 12,
    investment: 200,
    prize: 480,
    profit: 280,
    ...overrides,
  };
}

function makeStats(overrides: Partial<PlayerStatsDto> = {}): PlayerStatsDto {
  return {
    playerId: 'p1',
    playerName: 'Ana Reis',
    nickname: 'a_reis',
    tournamentsPlayed: 9,
    wins: 8,
    secondPlaces: 0,
    thirdPlaces: 1,
    top3Finishes: 9,
    totalBuyIns: 1640,
    totalPrizes: 3480,
    profit: 1840,
    bestResult: 980,
    worstResult: -200,
    averagePosition: 2.4,
    recentResults: [makeResult()],
    hasLegacyData: false,
    ...overrides,
  };
}

describe('formatResultDate', () => {
  it('formata ISO para pt-BR (dd/mm/aaaa)', () => {
    expect(formatResultDate('2026-03-15T20:00:00Z')).toBe('15/03/2026');
  });

  it('devolve a entrada original quando a data é inválida', () => {
    expect(formatResultDate('not-a-date')).toBe('not-a-date');
  });
});

describe('mapRecentResult', () => {
  it('mapeia PlayerTournamentResultDto -> MockRecentTournament', () => {
    const r = mapRecentResult(makeResult());
    expect(r.name).toBe('Etapa 3');
    expect(r.date).toBe('15/03/2026');
    expect(r.pos).toBe(2);
    expect(r.total).toBe(12);
    expect(r.invest).toBe(200);
    expect(r.prize).toBe(480);
    expect(r.profit).toBe(280);
  });

  it('usa pos = 0 quando position é null (não pontuou / não finalizou)', () => {
    expect(mapRecentResult(makeResult({ position: null })).pos).toBe(0);
  });
});

describe('mapPlayerStatsDetail', () => {
  it('extrai best/worst/avgPos e mapeia o histórico', () => {
    const d = mapPlayerStatsDetail(makeStats());
    expect(d.best).toBe(980);
    expect(d.worst).toBe(-200);
    expect(d.avgPos).toBe(2.4);
    expect(d.recent).toHaveLength(1);
    expect(d.recent[0].name).toBe('Etapa 3');
  });

  it('best/worst caem para 0 quando o backend manda null (sem torneios)', () => {
    const d = mapPlayerStatsDetail(
      makeStats({ bestResult: null, worstResult: null, recentResults: [] }),
    );
    expect(d.best).toBe(0);
    expect(d.worst).toBe(0);
    expect(d.recent).toEqual([]);
  });

  it('preserva a ordem do histórico vinda do backend', () => {
    const d = mapPlayerStatsDetail(
      makeStats({
        recentResults: [
          makeResult({ tournamentName: 'Etapa 5' }),
          makeResult({ tournamentName: 'Etapa 4' }),
        ],
      }),
    );
    expect(d.recent.map((r) => r.name)).toEqual(['Etapa 5', 'Etapa 4']);
  });
});
