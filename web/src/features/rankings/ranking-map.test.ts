import { describe, it, expect } from 'vitest';
import { mapRankingEntry, mapRanking } from './ranking-map';
import type { PlayerRankingDto } from '@/lib/api/hooks/use-rankings';

function makeDto(overrides: Partial<PlayerRankingDto> = {}): PlayerRankingDto {
  return {
    position: 1,
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
    roi: 112.3,
    itmRate: 62,
    totalSeasonTournaments: 14,
    participationPercentage: 98,
    ...overrides,
  };
}

describe('mapRankingEntry', () => {
  it('mapeia os campos diretos do DTO para o shape MockRankingEntry', () => {
    const e = mapRankingEntry(makeDto());

    expect(e.position).toBe(1);
    expect(e.name).toBe('Ana Reis');
    expect(e.nick).toBe('a_reis');
    expect(e.profit).toBe(1840);
    expect(e.tournaments).toBe(9);
    expect(e.wins).toBe(8);
    expect(e.second).toBe(0);
    expect(e.third).toBe(1);
    expect(e.itm).toBe(62);
    expect(e.roi).toBe(112.3);
    expect(e.buyIns).toBe(1640);
    expect(e.prizes).toBe(3480);
    expect(e.part).toBe(98);
  });

  it('DERIVA winRate = wins / tournamentsPlayed * 100', () => {
    expect(mapRankingEntry(makeDto({ wins: 8, tournamentsPlayed: 9 })).winRate).toBeCloseTo(
      (8 / 9) * 100,
    );
    expect(mapRankingEntry(makeDto({ wins: 5, tournamentsPlayed: 10 })).winRate).toBe(50);
  });

  it('winRate = 0 quando não jogou nenhum torneio (evita divisão por zero)', () => {
    const e = mapRankingEntry(makeDto({ wins: 0, tournamentsPlayed: 0 }));
    expect(e.winRate).toBe(0);
  });

  it('avgPos é sempre 0 (backend não fornece posição média no ranking)', () => {
    expect(mapRankingEntry(makeDto()).avgPos).toBe(0);
  });

  it('best / worst / recent ficam undefined (vêm da F16)', () => {
    const e = mapRankingEntry(makeDto());
    expect(e.best).toBeUndefined();
    expect(e.worst).toBeUndefined();
    expect(e.recent).toBeUndefined();
  });

  it('usa o primeiro nome como nick quando nickname é null', () => {
    const e = mapRankingEntry(makeDto({ nickname: null, playerName: 'Bruno Lima' }));
    expect(e.nick).toBe('Bruno');
    expect(e.sub).toBe('');
  });

  it('preserva nickname em sub quando presente', () => {
    expect(mapRankingEntry(makeDto({ nickname: 'brunin' })).sub).toBe('brunin');
  });
});

describe('mapRanking', () => {
  it('mapeia a lista preservando a ordem do backend', () => {
    const list = mapRanking([
      makeDto({ position: 1, playerName: 'Ana Reis', profit: 1840 }),
      makeDto({ position: 2, playerName: 'Caio Souza', profit: 1120 }),
    ]);
    expect(list.map((e) => e.name)).toEqual(['Ana Reis', 'Caio Souza']);
    expect(list.map((e) => e.position)).toEqual([1, 2]);
  });

  it('retorna lista vazia para undefined', () => {
    expect(mapRanking(undefined)).toEqual([]);
  });
});
