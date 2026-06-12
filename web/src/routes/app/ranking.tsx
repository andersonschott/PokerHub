/**
 * /app/ranking — Ranking + estatísticas do jogador.
 * Port de Ranking.jsx + PHPlayerStats.
 * README item 6 + nota do seletor de temporada.
 *
 * Mobile: pódio hero, toggle sort, lista escaneável, seletor de temporada (sheet).
 * Desktop lg:: tabela completa + modal de stats ao clicar na linha.
 * Navegação: toque na linha → stats mobile (state interno); volta → ranking.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { PodiumHero } from '@/features/rankings/podium';
import { RkSort, type SortKey } from '@/features/rankings/sort-toggle';
import { StandingsList } from '@/features/rankings/standings-list';
import { SeasonSheet } from '@/features/rankings/season-sheet';
import { PlayerStats } from '@/features/rankings/player-stats';
import { PlayerStatsModal } from '@/features/rankings/player-stats-modal';
import { DesktopStandings } from '@/features/rankings/desktop-standings';
import { mockData, type MockRankingEntry } from '@/mocks/data';

export default function RankingRoute() {
  const D = mockData;
  const S = D.season;

  const [sort, setSort] = useState<SortKey>('profit');
  const [sel, setSel] = useState<MockRankingEntry | null>(null);
  const [season, setSeason] = useState<string>(D.seasons[0]);
  const [seasonSheet, setSeasonSheet] = useState(false);
  // Desktop modal
  const [desktopSel, setDesktopSel] = useState<MockRankingEntry | null>(null);

  const isGeral = season === 'Geral (acumulado)';
  const data = isGeral ? D.rankingGeral : D.ranking;

  // In "Geral" mode, merge richly-detailed season entry for the clicked player
  const pick = (p: MockRankingEntry) => {
    if (!isGeral) {
      setSel(p);
      return;
    }
    const base = D.ranking.find((x) => x.nick === p.nick);
    setSel({ ...(base ?? {}), ...p } as MockRankingEntry);
  };

  const sorted = [...data].sort((a, b) => {
    if (sort === 'profit') return b.profit - a.profit;
    if (sort === 'roi') return b.roi - a.roi;
    return b.itm - a.itm;
  });

  const top3 = data.slice(0, 3);
  const seasonPct = Math.round((S.played / S.total) * 100);

  // Mobile PlayerStats — full-screen sub-view
  if (sel) {
    const rank = data.findIndex((x) => x.nick === sel.nick) + 1;
    return <PlayerStats player={sel} rank={rank} onBack={() => setSel(null)} />;
  }

  return (
    <div className="px-4 pb-24 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-[14px] pt-1">
        <div className="flex-1 min-w-0">
          <div className="font-sans font-bold text-[20px] tracking-[-0.01em]">Ranking</div>
          <div className="text-[12.5px] text-muted-foreground">{D.league.name}</div>
        </div>

        {/* Season selector button */}
        <button
          type="button"
          onClick={() => setSeasonSheet(true)}
          className="flex items-center gap-[6px] px-3 py-2 rounded-[var(--radius-md)] bg-secondary border border-border cursor-pointer text-foreground font-sans font-semibold text-[13px] whitespace-nowrap shrink-0"
        >
          {isGeral ? 'Geral' : season}
          <ChevronDown className="w-[15px] h-[15px] text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Season progress card */}
      {isGeral ? (
        <Card pad="md" className="mb-4">
          <div className="flex justify-between items-baseline">
            <span className="text-[12.5px] text-muted-foreground">Todas as temporadas</span>
            <span className="font-mono font-bold text-[14px]">
              3{' '}
              <span className="font-sans font-medium text-[12px] text-muted-foreground">
                temporadas ·
              </span>{' '}
              43{' '}
              <span className="font-sans font-medium text-[12px] text-muted-foreground">
                torneios
              </span>
            </span>
          </div>
        </Card>
      ) : (
        <Card pad="md" className="mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[12.5px] text-muted-foreground">{S.range}</span>
            <span className="font-mono font-bold text-[14px]">
              {S.played}
              <span className="text-muted-foreground">/{S.total}</span>{' '}
              <span className="font-sans font-medium text-[12px] text-muted-foreground">torneios</span>
            </span>
          </div>
          <ProgressBar value={seasonPct} max={100} tone="gold" />
        </Card>
      )}

      {/* Mobile layout: podium + sort + list */}
      <div className="lg:hidden">
        {/* Podium hero */}
        <PodiumHero top={top3} onPick={pick} />

        {/* Sort toggle */}
        <div className="my-[18px]">
          <RkSort value={sort} onChange={setSort} />
        </div>

        {/* Standings list */}
        <StandingsList data={data} sorted={sorted} sort={sort} onPick={pick} />

        <div className="text-center mt-4 text-[11.5px] text-muted-foreground font-mono">
          Toque em um jogador para ver as estatísticas completas
        </div>
      </div>

      {/* Desktop layout: podium + table side-by-side */}
      <div className="hidden lg:block">
        {/* Podium (narrow, centered) */}
        <div className="max-w-sm mb-6">
          <PodiumHero
            top={top3}
            onPick={(p) => {
              const base = isGeral ? D.ranking.find((x) => x.nick === p.nick) : undefined;
              setDesktopSel({ ...(base ?? {}), ...p } as MockRankingEntry);
            }}
          />
        </div>

        {/* Sort toggle above table */}
        <div className="mb-4 max-w-xs">
          <RkSort value={sort} onChange={setSort} />
        </div>

        {/* Full standings table */}
        <DesktopStandings
          data={sorted}
          onRow={(p) => {
            const base = isGeral ? D.ranking.find((x) => x.nick === p.nick) : undefined;
            setDesktopSel({ ...(base ?? {}), ...p } as MockRankingEntry);
          }}
        />
      </div>

      {/* Season sheet */}
      <SeasonSheet
        open={seasonSheet}
        onClose={() => setSeasonSheet(false)}
        seasons={D.seasons}
        season={season}
        onSelect={setSeason}
      />

      {/* Desktop modal */}
      {desktopSel ? (
        <PlayerStatsModal
          player={desktopSel}
          rank={data.findIndex((x) => x.nick === desktopSel.nick) + 1}
          onClose={() => setDesktopSel(null)}
        />
      ) : null}
    </div>
  );
}
