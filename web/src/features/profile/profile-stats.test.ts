import { describe, it, expect } from 'vitest';
import { resolveProfileStats } from './profile-stats';
import type { PlayerDto } from '@/lib/api/hooks/use-leagues';
import type { PlayerRankingDto } from '@/lib/api/hooks/use-rankings';

const player = (over: Partial<PlayerDto>): PlayerDto =>
  ({ id: 'p1', leagueId: 'l1', name: 'Eu', nickname: null, email: null, phone: null,
     pixKey: null, pixKeyType: null, userId: 'u1', createdAt: '', isActive: true,
     membershipStatus: 0, totalProfit: 0, tournamentsPlayed: 0, wins: 0, secondPlaces: 0,
     thirdPlaces: 0, totalBuyIns: 0, totalPrizes: 0, itmCount: 0, roi: 0, itmRate: 0,
     ...over }) as PlayerDto;

const rank = (over: Partial<PlayerRankingDto>): PlayerRankingDto =>
  ({ position: 1, playerId: 'p1', playerName: 'Eu', nickname: null, tournamentsPlayed: 0,
     wins: 0, secondPlaces: 0, thirdPlaces: 0, top3Finishes: 0, totalBuyIns: 0,
     totalPrizes: 0, profit: 0, roi: 0, itmRate: 0, totalSeasonTournaments: 0,
     participationPercentage: 0, ...over }) as PlayerRankingDto;

describe('resolveProfileStats', () => {
  it('retorna nulls quando faltam players, ranking ou userId', () => {
    expect(resolveProfileStats(undefined, [], 'u1')).toEqual({ profit: null, itmRate: null });
    expect(resolveProfileStats([], undefined, 'u1')).toEqual({ profit: null, itmRate: null });
    expect(resolveProfileStats([], [], undefined)).toEqual({ profit: null, itmRate: null });
  });

  it('retorna nulls quando o usuário não tem player vinculado', () => {
    const players = [player({ userId: 'outro' })];
    expect(resolveProfileStats(players, [rank({})], 'u1')).toEqual({ profit: null, itmRate: null });
  });

  it('retorna nulls quando não há entry no ranking para o player', () => {
    const players = [player({ id: 'p1', userId: 'u1' })];
    const ranking = [rank({ playerId: 'pX' })];
    expect(resolveProfileStats(players, ranking, 'u1')).toEqual({ profit: null, itmRate: null });
  });

  it('retorna profit e itmRate do entry do player do usuário', () => {
    const players = [player({ id: 'p1', userId: 'u1' })];
    const ranking = [rank({ playerId: 'p1', profit: 1840, itmRate: 62 })];
    expect(resolveProfileStats(players, ranking, 'u1')).toEqual({ profit: 1840, itmRate: 62 });
  });
});
