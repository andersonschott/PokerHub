/**
 * StandingsList — lista de classificação escaneável com uma mão.
 * Port do standings list de Ranking.jsx.
 */
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { MoneyValue } from '@/components/ui/money-value';
import type { RankingEntry } from './ranking-map';
import type { SortKey } from './sort-toggle';

const PODIUM_COLORS = [
  'var(--podium-gold)',
  'var(--podium-silver)',
  'var(--podium-bronze)',
];

function RankNum({ rank }: { rank: number }) {
  const color =
    rank <= 3 ? PODIUM_COLORS[rank - 1] : 'var(--muted-foreground)';
  return (
    <span
      className="font-mono font-bold text-[15px] shrink-0"
      style={{ width: 28, textAlign: 'center', color }}
    >
      {rank}
    </span>
  );
}

function MetricValue({ p, sort }: { p: RankingEntry; sort: SortKey }) {
  if (sort === 'profit') {
    return <MoneyValue value={p.profit} signed size="15px" />;
  }
  const v = sort === 'roi' ? p.roi : (p.part ?? 0);
  const color =
    sort === 'roi'
      ? v >= 0
        ? 'var(--positive)'
        : 'var(--negative)'
      : 'var(--foreground)';
  const label =
    sort === 'roi'
      ? `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`
      : `${v}%`;
  return (
    <span
      className="font-mono font-bold text-[15px] shrink-0"
      style={{ color }}
    >
      {label}
    </span>
  );
}

interface StandingsListProps {
  data: RankingEntry[];
  sorted: RankingEntry[];
  sort: SortKey;
  onPick: (p: RankingEntry) => void;
}

export function StandingsList({ data, sorted, sort, onPick }: StandingsListProps) {
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((p) => {
        const rank = data.findIndex((x) => x.nick === p.nick) + 1;
        return (
          <Card key={p.nick} interactive pad="md" onClick={() => onPick(p)}>
            <div className="flex items-center gap-3">
              <RankNum rank={rank} />
              <Avatar name={p.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-sans font-semibold text-[15px]">{p.name}</div>
                <div className="text-[12px] text-muted-foreground">
                  {p.tournaments} torneios · {p.wins}×1º
                </div>
                {p.part != null ? (
                  <div className="text-[12px] text-muted-foreground">
                    {p.part}% de participação
                  </div>
                ) : null}
              </div>
              <MetricValue p={p} sort={sort} />
              <ChevronRight className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
