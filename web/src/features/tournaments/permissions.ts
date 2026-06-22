import type { LeagueDto } from '@/lib/api/hooks/use-leagues';
import type { AuthUser } from '@/lib/auth-context';
import type { TournamentDelegateDto } from '@/lib/api/hooks/use-tournaments';

export function isLeagueOrganizer(
  league: LeagueDto | null | undefined,
  user: AuthUser | null | undefined,
): boolean {
  return !!league && !!user && league.organizerId === user.userId;
}

export function canOperateTournament(
  tournamentId: string | null | undefined,
  user: AuthUser | null | undefined,
  league: LeagueDto | null | undefined,
  delegates: readonly TournamentDelegateDto[] | null | undefined,
): boolean {
  if (!tournamentId || !user) return false;
  if (isLeagueOrganizer(league, user)) return true;
  return (delegates ?? []).some((d) => d.tournamentId === tournamentId && d.userId === user.userId);
}
