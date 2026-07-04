/**
 * Lógica pura do comparativo de jogadores (Fase 6, F16b).
 *
 * Porta o contrato funcional de `Compare.razor` (GetComparisonStats +
 * CompareValues) para uma função testável, sem dependência de React.
 *
 * Recebe os stats reais (`/players/{id}/ranking-stats`) e a entrada de ranking
 * (`/leagues/{id}/rankings`) de cada jogador e devolve as 9 linhas comparadas,
 * cada uma já com os textos formatados e o vencedor da linha.
 *
 * Derivados (espelham o Blazor):
 *  - ROI = totalBuyIns > 0 ? profit / totalBuyIns * 100 : 0
 *  - ITM = ranking.itmRate (se houver) senão top3Finishes / tournamentsPlayed * 100
 *  - Pos. Média: menor vence (LowerIsBetter).
 *
 * O backend já escala ROI/ITMRate para 0–100, então vão direto para a UI.
 */
import type { PlayerStatsDto } from '@/lib/api/hooks/use-player-stats';
import type { PlayerRankingDto } from '@/lib/api/hooks/use-rankings';

/** 'left'/'right' = jogador 1/2 vence; 'tie' = empate; 'none' = falta dado. */
export type CompareWinner = 'left' | 'right' | 'tie' | 'none';

export interface CompareRow {
  label: string;
  display1: string;
  display2: string;
  winner: CompareWinner;
}

type Stats = PlayerStatsDto | null | undefined;
type Ranking = PlayerRankingDto | null | undefined;

const DASH = '--';

/** "1.640" — inteiro em pt-BR (sem centavos, tabela compacta). */
function brl(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/** Lucro com sinal explícito: "+R$ 1.840" / "-R$ 320". */
function signedBrl(n: number): string {
  return `${n >= 0 ? '+' : '-'}R$ ${Math.abs(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/** Percentual 1 casa em pt-BR. `signed` força o "+" no não-negativo (ROI). */
function pct(n: number, signed = false): string {
  const body = n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${signed && n >= 0 ? '+' : ''}${body}%`;
}

/** Número 1 casa em pt-BR (posição média). */
function dec1(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** ROI escalado 0–100; 0 quando não há buy-ins (valor real, não ausência). */
export function roiOf(stats: PlayerStatsDto): number {
  return stats.totalBuyIns > 0 ? (stats.profit / stats.totalBuyIns) * 100 : 0;
}

/** ITM: usa ranking.itmRate quando há; senão deriva de top3/torneios. */
export function itmOf(stats: PlayerStatsDto, ranking: Ranking): number {
  return (
    ranking?.itmRate ??
    (stats.tournamentsPlayed > 0 ? (stats.top3Finishes / stats.tournamentsPlayed) * 100 : 0)
  );
}

/** Decide o vencedor da linha. Ausência de qualquer lado => 'none'. */
function compare(v1: number | null, v2: number | null, lowerIsBetter: boolean): CompareWinner {
  if (v1 == null || v2 == null) return 'none';
  if (v1 === v2) return 'tie';
  if (lowerIsBetter) return v1 < v2 ? 'left' : 'right';
  return v1 > v2 ? 'left' : 'right';
}

/**
 * Monta as 9 linhas comparativas na ordem fixa do Blazor:
 * Torneios, Vitórias, Top 3, Lucro, ROI, ITM, Pos. Média, Investido, Prêmios.
 */
export function buildComparison(
  stats1: Stats,
  ranking1: Ranking,
  stats2: Stats,
  ranking2: Ranking,
): CompareRow[] {
  const roi1 = stats1 ? roiOf(stats1) : null;
  const roi2 = stats2 ? roiOf(stats2) : null;
  const itm1 = stats1 ? itmOf(stats1, ranking1) : null;
  const itm2 = stats2 ? itmOf(stats2, ranking2) : null;

  const rows: CompareRow[] = [];

  const push = (
    label: string,
    v1: number | null,
    v2: number | null,
    d1: string,
    d2: string,
    lowerIsBetter = false,
  ) =>
    rows.push({
      label,
      display1: v1 == null ? DASH : d1,
      display2: v2 == null ? DASH : d2,
      winner: compare(v1, v2, lowerIsBetter),
    });

  push(
    'Torneios',
    stats1?.tournamentsPlayed ?? null,
    stats2?.tournamentsPlayed ?? null,
    String(stats1?.tournamentsPlayed),
    String(stats2?.tournamentsPlayed),
  );

  push(
    'Vitórias',
    stats1?.wins ?? null,
    stats2?.wins ?? null,
    String(stats1?.wins),
    String(stats2?.wins),
  );

  push(
    'Top 3',
    stats1?.top3Finishes ?? null,
    stats2?.top3Finishes ?? null,
    String(stats1?.top3Finishes),
    String(stats2?.top3Finishes),
  );

  push(
    'Lucro',
    stats1?.profit ?? null,
    stats2?.profit ?? null,
    stats1 ? signedBrl(stats1.profit) : DASH,
    stats2 ? signedBrl(stats2.profit) : DASH,
  );

  push(
    'ROI',
    roi1,
    roi2,
    roi1 != null ? pct(roi1, true) : DASH,
    roi2 != null ? pct(roi2, true) : DASH,
  );

  push(
    'ITM',
    itm1,
    itm2,
    itm1 != null ? pct(itm1) : DASH,
    itm2 != null ? pct(itm2) : DASH,
  );

  push(
    'Pos. Média',
    stats1?.averagePosition ?? null,
    stats2?.averagePosition ?? null,
    stats1 ? dec1(stats1.averagePosition) : DASH,
    stats2 ? dec1(stats2.averagePosition) : DASH,
    true, // menor vence
  );

  push(
    'Investido',
    stats1?.totalBuyIns ?? null,
    stats2?.totalBuyIns ?? null,
    stats1 ? brl(stats1.totalBuyIns) : DASH,
    stats2 ? brl(stats2.totalBuyIns) : DASH,
  );

  push(
    'Prêmios',
    stats1?.totalPrizes ?? null,
    stats2?.totalPrizes ?? null,
    stats1 ? brl(stats1.totalPrizes) : DASH,
    stats2 ? brl(stats2.totalPrizes) : DASH,
  );

  return rows;
}
