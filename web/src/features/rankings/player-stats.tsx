/**
 * PlayerStats — detalhe de estatísticas do jogador.
 * Port de PHPlayerStats de Ranking.jsx.
 */
import { ArrowLeft, Target, Trophy, TrendingUp } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat-tile';
import { MoneyValue } from '@/components/ui/money-value';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { MockRankingEntry } from '@/mocks/data';

const PODIUM_COLORS: Record<number, string> = {
  1: 'var(--podium-gold)',
  2: 'var(--podium-silver)',
  3: 'var(--podium-bronze)',
};

function PosChip({ pos }: { pos: number }) {
  const color = PODIUM_COLORS[pos] ?? 'var(--muted-foreground)';
  return (
    <span className="font-mono font-bold text-[13px]" style={{ color }}>
      {pos}º
    </span>
  );
}

function roiMsg(roi: number): string {
  if (roi >= 100) return 'Muito acima da média.';
  if (roi >= 50)  return 'Acima da média.';
  if (roi >= 0)   return 'No positivo — continue assim.';
  if (roi >= -25) return 'No vermelho, mas recuperável.';
  return 'Momento difícil. Paciência!';
}

interface PlayerStatsProps {
  player: MockRankingEntry;
  rank: number;
  onBack: () => void;
}

export function PlayerStats({ player: p, rank, onBack }: PlayerStatsProps) {
  const roiPos = p.roi >= 0;

  return (
    <div className="px-4 pb-24 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <IconButton icon={ArrowLeft} aria-label="Voltar" onClick={onBack} />
        <Avatar
          name={p.name}
          podium={rank <= 3 ? (['gold', 'silver', 'bronze'] as const)[rank - 1] : undefined}
          size={48}
        />
        <div className="flex-1 min-w-0">
          <div className="font-sans font-bold text-[18px] tracking-[-0.01em]">{p.name}</div>
          <div className="text-[12.5px] text-muted-foreground">
            @{p.nick} · {p.tournaments} torneios
          </div>
        </div>
        <div
          className="text-center px-3 py-[6px] rounded-[var(--radius-md)] bg-secondary border border-border"
        >
          <div className="font-mono font-bold text-[18px] text-gold-400">#{rank}</div>
          <div className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Ranking</div>
        </div>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-[10px]">
        <StatTile
          icon={Target}
          value={p.tournaments}
          label="Torneios"
          center
          valueSize="20px"
        />
        <StatTile
          icon={Trophy}
          value={p.wins}
          label="Vitórias"
          tone="gold"
          center
          valueSize="20px"
        />
        <StatTile
          icon={TrendingUp}
          value={<MoneyValue value={p.profit} signed cents={false} size="20px" />}
          label="Lucro"
          tone={p.profit >= 0 ? 'positive' : 'negative'}
          center
          valueSize="20px"
        />
      </div>

      {/* Pódios + ROI */}
      <div className="grid grid-cols-2 gap-[10px] mt-3">
        <Card pad="md">
          <div
            className="text-[11px] uppercase tracking-[0.07em] text-muted-foreground mb-[10px]"
          >
            Pódios
          </div>
          <div className="flex justify-between">
            {(
              [
                ['var(--podium-gold)',   p.wins,   '1º'],
                ['var(--podium-silver)', p.second, '2º'],
                ['var(--podium-bronze)', p.third,  '3º'],
              ] as [string, number, string][]
            ).map(([color, n, label]) => (
              <div key={label} className="text-center">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-[6px]"
                  style={{ background: color }}
                />
                <div className="font-mono font-bold text-[22px]">{n}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card variant={roiPos ? 'gold' : 'default'} pad="md">
          <div
            className="text-[11px] uppercase tracking-[0.07em] text-muted-foreground"
          >
            ROI
          </div>
          <div
            className="font-mono font-bold text-[30px] tracking-[-0.02em] mt-[2px]"
            style={{ color: roiPos ? 'var(--positive)' : 'var(--negative)' }}
          >
            {roiPos ? '+' : ''}
            {p.roi.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-1 leading-[1.35]">
            {roiMsg(p.roi)}
          </div>
        </Card>
      </div>

      {/* Performance */}
      <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-[18px] mb-2">
        Performance
      </div>
      <Card pad="md">
        {(
          [
            { label: 'Taxa de vitória',    val: p.winRate, tone: 'gold' as const },
            { label: 'ITM · in the money', val: p.itm,     tone: 'emerald' as const },
            { label: 'Posição média',      val: null,       tone: null },
          ]
        ).map(({ label, val, tone }, i, arr) => (
          <div
            key={label}
            className="flex flex-col gap-[7px]"
            style={{ marginBottom: i < arr.length - 1 ? 14 : 0 }}
          >
            <div className="flex justify-between items-baseline gap-3">
              <span className="text-[13px] text-muted-foreground whitespace-nowrap">{label}</span>
              <span className="font-mono font-bold text-[15px] shrink-0">
                {val != null
                  ? `${val}%`
                  : `${p.avgPos.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}º`}
              </span>
            </div>
            {val != null && tone != null ? (
              <ProgressBar value={val} tone={tone} />
            ) : null}
          </div>
        ))}
      </Card>

      {/* Financeiro */}
      <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-[18px] mb-2">
        Financeiro
      </div>
      <Card pad="none">
        {(
          [
            { label: 'Total investido',    node: <MoneyValue value={p.buyIns}  color="none" size="14px" /> },
            { label: 'Total em prêmios',   node: <MoneyValue value={p.prizes}  color="none" size="14px" /> },
            { label: 'Lucro / prejuízo',   node: <MoneyValue value={p.profit}  signed       size="14px" /> },
            { label: 'Melhor resultado',   node: <MoneyValue value={p.best  ?? 0} signed   size="14px" /> },
            { label: 'Pior resultado',     node: <MoneyValue value={p.worst ?? 0} signed   size="14px" /> },
          ]
        ).map(({ label, node }, i, arr) => (
          <div
            key={label}
            className="flex justify-between items-center px-[14px] py-[13px]"
            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <span className="text-[13.5px] text-muted-foreground">{label}</span>
            {node}
          </div>
        ))}
      </Card>

      {/* Histórico */}
      {p.recent && p.recent.length > 0 ? (
        <>
          <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-[18px] mb-2">
            Últimos torneios
          </div>
          <div className="flex flex-col gap-2">
            {p.recent.map((r, i) => (
              <Card key={i} pad="md">
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-[10px] bg-secondary border border-border flex flex-col items-center justify-center shrink-0"
                  >
                    <PosChip pos={r.pos} />
                    <span className="text-[9px] text-muted-foreground mt-[1px]">/{r.total}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-[14px]">{r.name}</div>
                    <div className="text-[11.5px] text-muted-foreground font-mono">
                      {r.date} · invest {r.invest > 0 ? `R$ ${r.invest}` : '—'}
                    </div>
                  </div>
                  <MoneyValue value={r.profit} signed size="15px" />
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
