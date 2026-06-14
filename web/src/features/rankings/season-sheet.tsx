/**
 * SeasonSheet — seletor de temporada / geral acumulado.
 * Port do sheet de temporada de Ranking.jsx.
 */
import { Check } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface SeasonSheetProps {
  open: boolean;
  onClose: () => void;
  seasons: string[];
  season: string;
  onSelect: (s: string) => void;
}

export function SeasonSheet({ open, onClose, seasons, season, onSelect }: SeasonSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ranking"
      subtitle="Escolha a temporada ou o acumulado geral"
      fixed
    >
      <div className="flex flex-col gap-2">
        {seasons.map((s, idx) => {
          const active = s === season;
          return (
            <button
              key={s}
              type="button"
              onClick={() => { onSelect(s); onClose(); }}
              className="flex items-center gap-3 px-[14px] py-[13px] rounded-[var(--radius-md)] cursor-pointer text-left border transition-colors"
              style={{
                border: `1px solid ${active ? 'color-mix(in oklab, var(--gold-500) 45%, var(--border))' : 'var(--border)'}`,
                background: active ? 'color-mix(in oklab, var(--gold-500) 12%, var(--card))' : 'var(--card)',
              }}
            >
              <span
                className="flex-1 font-sans font-semibold text-[14.5px]"
                style={{ color: active ? 'var(--gold-400)' : 'var(--foreground)' }}
              >
                {s}
              </span>
              {idx === 0 && s !== 'Geral (acumulado)' ? (
                <Badge tone="neutral">atual</Badge>
              ) : null}
              {active ? (
                <Check className="w-4 h-4 shrink-0 text-gold-400" />
              ) : null}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
