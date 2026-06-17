/**
 * torneio-lists — seleção PURA das listas da aba Torneio (sem React, sem rede).
 *
 * Separada de index.tsx para ser testável de forma determinística:
 *  - `selectUpcoming`   : agendados, ordem cronológica crescente (o mais próximo primeiro)
 *  - `selectRealizados` : finalizados, mais recentes primeiro
 *
 * Espelha as regras de fronteira da Task 2B: Próximos = Scheduled asc; Realizados = Finished desc.
 * Nenhuma regra de dinheiro vive aqui — os valores (buyIn/prizePool) vêm prontos do backend.
 */
import { TournamentStatus, type TournamentDto } from '@/lib/api/hooks/use-tournaments';

function byScheduledAsc(a: TournamentDto, b: TournamentDto): number {
  return new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime();
}

/** Próximos: torneios agendados, em ordem cronológica crescente. */
export function selectUpcoming(tournaments: readonly TournamentDto[] | undefined): TournamentDto[] {
  return (tournaments ?? [])
    .filter((t) => t.status === TournamentStatus.Scheduled)
    .slice()
    .sort(byScheduledAsc);
}

/** Realizados: torneios finalizados, mais recentes primeiro. */
export function selectRealizados(tournaments: readonly TournamentDto[] | undefined): TournamentDto[] {
  return (tournaments ?? [])
    .filter((t) => t.status === TournamentStatus.Finished)
    .slice()
    .sort((a, b) => byScheduledAsc(b, a));
}
