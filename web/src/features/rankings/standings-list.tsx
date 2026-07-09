/**
 * StandingsList — lista de classificação escaneável com uma mão.
 * Card: coluna de posição (nº + movimento), meio (avatar/nome/subline),
 * direita (métrica ativa + dots de forma recente dos últimos 5 resultados).
 */
import type { CSSProperties } from 'react';
import { Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { MoneyValue } from '@/components/ui/money-value';
import type { FormDot, RankingEntry } from './ranking-map';
import type { SortKey } from './sort-toggle';

const PODIUM_COLORS = [
  'var(--podium-gold)',
  'var(--podium-silver)',
  'var(--podium-bronze)',
];

function RankCol({ rank, delta }: { rank: number; delta: number | null }) {
  const color =
    rank <= 3 ? PODIUM_COLORS[rank - 1] : 'var(--muted-foreground)';
  return (
    <div
      className="flex flex-col items-center justify-center shrink-0"
      style={{ width: 28 }}
    >
      <span className="font-mono font-bold text-[15px]" style={{ color }}>
        {rank}
      </span>
      {delta != null && (
        <span
          className="font-mono text-[10px] leading-tight"
          style={{
            color:
              delta > 0
                ? 'var(--positive)'
                : delta < 0
                  ? 'var(--negative)'
                  : 'var(--muted-foreground)',
          }}
        >
          {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${-delta}` : '–'}
        </span>
      )}
    </div>
  );
}

const DOT_STYLES: Record<FormDot, CSSProperties> = {
  win: { background: 'var(--podium-gold)' },
  itm: { background: 'var(--positive)' },
  out: { background: 'var(--secondary)', border: '1px solid var(--border)' },
};

function Dot({ kind }: { kind: FormDot }) {
  return (
    <span
      className="rounded-full shrink-0"
      style={{ width: 6, height: 6, ...DOT_STYLES[kind] }}
    />
  );
}

/** Forma recente: dots dos últimos 5 resultados, do mais antigo ao mais novo. */
function FormDots({ form }: { form: FormDot[] }) {
  if (form.length === 0) return null;
  return (
    <div className="flex items-center" style={{ gap: 3.5 }}>
      {form.map((kind, i) => (
        <Dot key={i} kind={kind} />
      ))}
    </div>
  );
}

/** Legenda dos dots de forma — rodapé da lista. */
export function FormLegend() {
  return (
    <div className="flex items-center justify-center gap-2 mt-4 font-mono text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Dot kind="win" /> 1º
      </span>
      <span className="flex items-center gap-1">
        <Dot kind="itm" /> premiado
      </span>
      <span className="flex items-center gap-1">
        <Dot kind="out" /> fora
      </span>
      <span>· últimos 5</span>
    </div>
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
              <RankCol rank={rank} delta={p.delta} />
              <Avatar name={p.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-sans font-semibold text-[15px]">{p.name}</div>
                <div className="text-[12px] text-muted-foreground flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{p.tournaments} torneios</span>
                  <span className="flex items-center gap-1 shrink-0 text-gold-400">
                    <Trophy className="w-3 h-3" />
                    {p.wins}
                  </span>
                  {p.part != null ? <span className="shrink-0">· {p.part}%</span> : null}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <MetricValue p={p} sort={sort} />
                <FormDots form={p.form} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
