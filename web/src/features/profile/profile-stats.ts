import type { PlayerDto } from '@/lib/api/hooks/use-leagues';
import type { PlayerRankingDto } from '@/lib/api/hooks/use-rankings';

export interface ProfileStats {
  /** Lucro na temporada ativa; null quando indisponível. */
  profit: number | null;
  /** ITM em % (0–100); null quando indisponível. */
  itmRate: number | null;
}

/**
 * Resolve os stats do perfil para o usuário logado a partir do ranking da
 * temporada ativa. Retorna nulls (nunca número falso) quando qualquer dado falta.
 */
export function resolveProfileStats(
  players: PlayerDto[] | undefined,
  ranking: PlayerRankingDto[] | undefined,
  userId: string | undefined,
): ProfileStats {
  if (!players || !ranking || !userId) return { profit: null, itmRate: null };
  const me = players.find((p) => p.userId === userId);
  if (!me) return { profit: null, itmRate: null };
  const entry = ranking.find((r) => r.playerId === me.id);
  if (!entry) return { profit: null, itmRate: null };
  return { profit: entry.profit, itmRate: entry.itmRate };
}
