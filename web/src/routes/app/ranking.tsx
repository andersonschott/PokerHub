/**
 * /app/ranking — Ranking da liga / temporada (dados reais — Fase 6, F15).
 *
 * leagueId vem do contexto de liga ativa. O seletor lista as temporadas reais
 * da liga + a opção "Geral (acumulado)". Default: temporada ativa se houver,
 * senão Geral.
 *
 * Mobile: pódio hero, toggle sort (Lucro · ROI · ITM), lista escaneável.
 * Desktop lg:: tabela completa + modal de stats ao clicar na linha.
 *
 * Clicar numa linha abre PlayerStats com a entrada mapeada do ranking. As
 * estatísticas detalhadas (posição média, melhor/pior, últimos torneios,
 * gráficos) chegam na F16 via /players/{id}/ranking-stats.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, ChevronDown, Loader2, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PodiumHero } from '@/features/rankings/podium';
import { RkSort, type SortKey } from '@/features/rankings/sort-toggle';
import { StandingsList } from '@/features/rankings/standings-list';
import { SeasonSheet } from '@/features/rankings/season-sheet';
import { PlayerStats } from '@/features/rankings/player-stats';
import { PlayerStatsModal } from '@/features/rankings/player-stats-modal';
import { DesktopStandings } from '@/features/rankings/desktop-standings';
import { mapRanking, type RankingEntry } from '@/features/rankings/ranking-map';
import { useActiveLeague } from '@/features/leagues/league-context';
import { useLeague } from '@/lib/api/hooks/use-leagues';
import { useSeasons, useActiveSeason } from '@/lib/api/hooks/use-seasons';
import { useLeagueRanking, useSeasonRanking } from '@/lib/api/hooks/use-rankings';

const GERAL = '__geral__';
const GERAL_LABEL = 'Geral (acumulado)';

export default function RankingRoute() {
  const { activeLeagueId } = useActiveLeague();
  const leagueId = activeLeagueId ?? '';

  const leagueQ = useLeague(leagueId);
  const seasonsQ = useSeasons(leagueId);
  const activeSeasonQ = useActiveSeason(leagueId);

  const [sort, setSort] = useState<SortKey>('profit');
  const [sel, setSel] = useState<RankingEntry | null>(null);
  const [desktopSel, setDesktopSel] = useState<RankingEntry | null>(null);
  const [seasonSheet, setSeasonSheet] = useState(false);
  // null = ainda não escolhido (segue o default = temporada ativa, senão Geral).
  const [picked, setPicked] = useState<string | null>(null);

  const activeSeason = activeSeasonQ.data;

  // Temporada ativa primeiro (recebe o badge "atual"); demais por data desc.
  const orderedSeasons = useMemo(() => {
    const list = seasonsQ.data ?? [];
    const rest = list
      .filter((s) => s.id !== activeSeason?.id)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
    return activeSeason ? [activeSeason, ...rest] : rest;
  }, [seasonsQ.data, activeSeason]);

  const effectiveId = picked ?? activeSeason?.id ?? GERAL;
  const isGeral = effectiveId === GERAL;

  const seasonLabels = useMemo(
    () => [...orderedSeasons.map((s) => s.name), GERAL_LABEL],
    [orderedSeasons],
  );
  const currentLabel = isGeral
    ? GERAL_LABEL
    : orderedSeasons.find((s) => s.id === effectiveId)?.name ?? GERAL_LABEL;

  const selectSeasonLabel = (label: string) => {
    if (label === GERAL_LABEL) {
      setPicked(GERAL);
      return;
    }
    const found = orderedSeasons.find((s) => s.name === label);
    setPicked(found ? found.id : GERAL);
  };

  // Só uma das duas queries fica habilitada por vez (gate via string vazia).
  const leagueRankQ = useLeagueRanking(isGeral ? leagueId : '');
  const seasonRankQ = useSeasonRanking(isGeral ? '' : effectiveId);
  const activeQ = isGeral ? leagueRankQ : seasonRankQ;

  const entries = useMemo(() => mapRanking(activeQ.data), [activeQ.data]);

  const sorted = useMemo(() => {
    const arr = [...entries];
    arr.sort((a, b) => {
      if (sort === 'profit') return b.profit - a.profit;
      if (sort === 'roi') return b.roi - a.roi;
      return b.itm - a.itm;
    });
    return arr;
  }, [entries, sort]);

  const top3 = entries.slice(0, 3);
  const totalTournaments = activeQ.data?.[0]?.totalSeasonTournaments ?? 0;

  // Default ainda resolvendo: esperamos a temporada ativa antes de decidir.
  const resolvingDefault = picked === null && activeSeasonQ.isLoading;
  const isLoading = !!leagueId && (resolvingDefault || activeQ.isLoading);
  const isEmpty = !isLoading && !activeQ.isError && entries.length === 0;

  // Sem liga ativa — orienta o usuário a escolher uma.
  if (!leagueId) {
    return (
      <div className="px-4 pb-24 min-h-full">
        <div className="font-sans font-bold text-[20px] tracking-[-0.01em] mb-4 pt-1">Ranking</div>
        <Card pad="lg" className="text-center">
          <Trophy className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <div className="font-sans font-semibold text-[15px] mb-1">Nenhuma liga selecionada</div>
          <div className="text-[13px] text-muted-foreground mb-4">
            Escolha uma liga para ver o ranking dos jogadores.
          </div>
          <Link
            to="/app/ligas"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-md)] bg-secondary border border-border text-[13px] font-semibold text-foreground no-underline"
          >
            Ver minhas ligas
          </Link>
        </Card>
      </div>
    );
  }

  // PlayerStats mobile — sub-view em tela cheia.
  if (sel) {
    return <PlayerStats player={sel} rank={sel.position} onBack={() => setSel(null)} />;
  }

  return (
    <div className="px-4 pb-24 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-[14px] pt-1">
        <div className="flex-1 min-w-0">
          <div className="font-sans font-bold text-[20px] tracking-[-0.01em]">Ranking</div>
          <div className="text-[12.5px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            {leagueQ.data?.name ?? ' '}
          </div>
        </div>

        {/* Comparar jogadores */}
        <Link
          to="/app/comparar"
          aria-label="Comparar jogadores"
          className="flex items-center gap-[6px] px-3 py-2 rounded-[var(--radius-md)] bg-secondary border border-border text-foreground no-underline font-sans font-semibold text-[13px] whitespace-nowrap shrink-0"
        >
          <ArrowLeftRight className="w-[15px] h-[15px] text-muted-foreground shrink-0" />
          <span className="hidden sm:inline">Comparar</span>
        </Link>

        {/* Season selector button */}
        <button
          type="button"
          onClick={() => setSeasonSheet(true)}
          className="flex items-center gap-[6px] px-3 py-2 rounded-[var(--radius-md)] bg-secondary border border-border cursor-pointer text-foreground font-sans font-semibold text-[13px] whitespace-nowrap shrink-0"
        >
          {isGeral ? 'Geral' : currentLabel}
          <ChevronDown className="w-[15px] h-[15px] text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Resumo da seleção */}
      <Card pad="md" className="mb-4">
        <div className="flex justify-between items-baseline">
          <span className="text-[12.5px] text-muted-foreground">
            {isGeral ? 'Todas as temporadas' : currentLabel}
          </span>
          <span className="font-mono font-bold text-[14px]">
            {isGeral ? (
              <>
                {orderedSeasons.length}{' '}
                <span className="font-sans font-medium text-[12px] text-muted-foreground">
                  temporada{orderedSeasons.length === 1 ? '' : 's'} ·
                </span>{' '}
              </>
            ) : null}
            {totalTournaments}{' '}
            <span className="font-sans font-medium text-[12px] text-muted-foreground">
              torneio{totalTournaments === 1 ? '' : 's'}
            </span>
          </span>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : activeQ.isError ? (
        <Card pad="lg" className="text-center text-[13px] text-muted-foreground">
          Não foi possível carregar o ranking.
        </Card>
      ) : isEmpty ? (
        <Card pad="lg" className="text-center">
          <Trophy className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <div className="font-sans font-semibold text-[15px] mb-1">Ranking ainda vazio</div>
          <div className="text-[13px] text-muted-foreground">
            {isGeral
              ? 'Nenhum torneio finalizado nesta liga ainda.'
              : 'Nenhum torneio finalizado nesta temporada ainda.'}
          </div>
        </Card>
      ) : (
        <>
          {/* Mobile layout: podium + sort + list */}
          <div className="lg:hidden">
            <PodiumHero top={top3} onPick={setSel} />

            <div className="my-[18px]">
              <RkSort value={sort} onChange={setSort} />
            </div>

            <StandingsList data={entries} sorted={sorted} sort={sort} onPick={setSel} />

            <div className="text-center mt-4 text-[11.5px] text-muted-foreground font-mono">
              Toque em um jogador para ver as estatísticas completas
            </div>
          </div>

          {/* Desktop layout: podium + table side-by-side */}
          <div className="hidden lg:block">
            <div className="max-w-sm mb-6">
              <PodiumHero top={top3} onPick={setDesktopSel} />
            </div>

            <div className="mb-4 max-w-xs">
              <RkSort value={sort} onChange={setSort} />
            </div>

            <DesktopStandings data={sorted} onRow={setDesktopSel} />
          </div>
        </>
      )}

      {/* Season sheet */}
      <SeasonSheet
        open={seasonSheet}
        onClose={() => setSeasonSheet(false)}
        seasons={seasonLabels}
        season={currentLabel}
        onSelect={selectSeasonLabel}
      />

      {/* Desktop modal */}
      {desktopSel ? (
        <PlayerStatsModal
          player={desktopSel}
          rank={desktopSel.position}
          onClose={() => setDesktopSel(null)}
        />
      ) : null}
    </div>
  );
}
