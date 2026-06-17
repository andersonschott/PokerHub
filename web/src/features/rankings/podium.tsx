/**
 * PodiumHero — 2nd·1st·3rd podium hero block.
 * Port de PodiumHero de Ranking.jsx.
 */
import { Avatar } from '@/components/ui/avatar';
import { MoneyValue } from '@/components/ui/money-value';
import type { RankingEntry } from './ranking-map';

interface PodiumMeta {
  h: number;
  ring: 'gold' | 'silver' | 'bronze';
  tint: string;
  glow: string;
}

const META: Record<number, PodiumMeta> = {
  1: { h: 132, ring: 'gold',   tint: 'var(--gold-500)',            glow: 'var(--glow-gold)' },
  2: { h: 108, ring: 'silver', tint: 'var(--podium-silver)',        glow: 'none' },
  3: { h: 92,  ring: 'bronze', tint: 'var(--podium-bronze)',        glow: 'none' },
};

interface PodiumHeroProps {
  top: RankingEntry[];
  onPick: (p: RankingEntry) => void;
}

export function PodiumHero({ top, onPick }: PodiumHeroProps) {
  // visual order: 2nd, 1st, 3rd
  const order = [top[1], top[0], top[2]].filter((p): p is RankingEntry => Boolean(p));

  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {order.map((p) => {
        const m = META[p.position];
        if (!m) return null;
        return (
          <button
            key={p.position}
            type="button"
            onClick={() => onPick(p)}
            className="animate-ph-fade-in flex flex-col items-center gap-[6px] border-0 bg-transparent cursor-pointer p-0"
          >
            <Avatar
              name={p.name}
              podium={m.ring}
              badge={String(p.position)}
              badgeGold={p.position === 1}
              size={p.position === 1 ? 60 : 48}
            />
            <div
              className="font-sans font-bold text-center leading-[1.1]"
              style={{ fontSize: p.position === 1 ? 14 : 13 }}
            >
              {p.name.split(' ')[0]}
            </div>
            <MoneyValue value={p.profit} signed size={p.position === 1 ? '14px' : '12px'} />
            <div
              className="w-full rounded-t-[12px] mt-[2px] flex items-start justify-center pt-[10px] border border-b-0 border-border"
              style={{
                height: m.h,
                background: `linear-gradient(180deg, color-mix(in oklab, ${m.tint} 22%, var(--card)) 0%, var(--card) 100%)`,
                boxShadow: m.glow !== 'none' ? m.glow : 'none',
              }}
            >
              <span
                className="font-mono font-bold leading-none"
                style={{ fontSize: p.position === 1 ? 34 : 26, color: m.tint }}
              >
                {p.position}º
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
