import { describe, it, expect } from 'vitest';
import { isLeagueOrganizer, canOperateTournament } from './permissions';
import type { LeagueDto } from '@/lib/api/hooks/use-leagues';
import type { AuthUser } from '@/lib/auth-context';
import type { TournamentDelegateDto } from '@/lib/api/hooks/use-tournaments';

const user: AuthUser = { userId: 'u1', name: 'Anderson', email: 'a@a.com' };
const otherUser: AuthUser = { userId: 'u2', name: 'Bruno', email: 'b@b.com' };

const league: LeagueDto = {
  id: 'l1',
  name: 'Liga dos Amigos',
  description: null,
  inviteCode: 'ABC',
  organizerId: user.userId,
  organizerName: user.name,
  blockCheckInWithDebt: false,
  playerCount: 10,
  tournamentCount: 5,
  jackpotPercentage: 5,
  accumulatedPrizePool: 1000,
  createdAt: '2026-01-01T00:00:00Z',
  isActive: true,
};

const delegate: TournamentDelegateDto = {
  id: 'd1',
  tournamentId: 't1',
  userId: otherUser.userId,
  userName: otherUser.name,
  permissions: 15,
  assignedAt: '2026-01-01T00:00:00Z',
};

describe('isLeagueOrganizer', () => {
  it('retorna true quando o usuário é o organizador da liga', () => {
    expect(isLeagueOrganizer(league, user)).toBe(true);
  });

  it('retorna false quando o usuário não é o organizador', () => {
    expect(isLeagueOrganizer(league, otherUser)).toBe(false);
  });

  it('retorna false quando a liga é nula', () => {
    expect(isLeagueOrganizer(undefined, user)).toBe(false);
  });

  it('retorna false quando o usuário é nulo', () => {
    expect(isLeagueOrganizer(league, null)).toBe(false);
  });
});

describe('canOperateTournament', () => {
  it('retorna true para o organizador da liga', () => {
    expect(canOperateTournament('t1', user, league, [])).toBe(true);
  });

  it('retorna true para um delegado do torneio', () => {
    expect(canOperateTournament('t1', otherUser, league, [delegate])).toBe(true);
  });

  it('retorna false para um delegado de outro torneio', () => {
    expect(canOperateTournament('t2', otherUser, league, [delegate])).toBe(false);
  });

  it('retorna false para usuário comum não delegado', () => {
    expect(canOperateTournament('t1', { userId: 'u3', name: 'Carlos', email: 'c@c.com' }, league, [delegate])).toBe(false);
  });

  it('retorna false quando o id do torneio é vazio', () => {
    expect(canOperateTournament('', user, league, [])).toBe(false);
  });

  it('retorna false quando o usuário é nulo', () => {
    expect(canOperateTournament('t1', null, league, [])).toBe(false);
  });

  it('lida com delegates undefined sem quebrar', () => {
    expect(canOperateTournament('t1', user, league, undefined)).toBe(true);
    expect(
      canOperateTournament('t1', { userId: 'u3', name: 'Carlos', email: 'c@c.com' }, league, undefined),
    ).toBe(false);
  });
});
