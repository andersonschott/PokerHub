import type { LeagueDto } from '@/lib/api/hooks/use-leagues';
import type { AuthUser } from '@/lib/auth-context';
import type { TournamentDelegateDto } from '@/lib/api/hooks/use-tournaments';

export function isLeagueOrganizer(
  league: LeagueDto | null | undefined,
  user: AuthUser | null | undefined,
): boolean {
  return !!league && !!user && league.organizerId === user.userId;
}

/**
 * Dedução no cliente de quem opera a mesa. PREFIRA `detail.canOperate` quando a tela já
 * carrega o TournamentDetailDto: lá a resposta vem do servidor, com a mesma regra dos
 * guards de endpoint. Esta função depende de dois GETs (liga + delegados) e, se qualquer
 * um falhar, rebaixa silenciosamente o organizador a membro — os botões somem sem erro.
 * Use só nas telas que não têm o detalhe em mãos (hero da liga, pagamentos).
 */
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
