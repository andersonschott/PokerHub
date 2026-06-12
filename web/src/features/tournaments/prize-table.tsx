/**
 * PrizeTable — editor de percentuais de premiação.
 * Port da Etapa 4 do wizard (TorneioWizard.jsx + DesktopWizard.jsx).
 */
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PrizeTableProps {
  positions: number[];
  onChange: (positions: number[]) => void;
  /** 'pct' shows progress bars; 'fixo' shows currency rows */
  mode?: 'pct' | 'fixo';
  /** Render as desktop layout with progress bars next to rows */
  variant?: 'mobile' | 'desktop';
}

const podiumColors = ['text-[var(--podium-gold)]', 'text-[var(--podium-silver)]', 'text-[var(--podium-bronze)]'];
const barColors = ['bg-gold-500', 'bg-[var(--felt-600)]'];

export function PrizeTable({ positions, onChange, mode = 'pct', variant = 'mobile' }: PrizeTableProps) {
  const total = positions.reduce((s, p) => s + (p || 0), 0);

  const setPosition = (i: number, v: string) => {
    const num = parseInt(v.replace(/\D/g, ''), 10) || 0;
    onChange(positions.map((x, j) => (j === i ? num : x)));
  };

  return (
    <div className="flex flex-col gap-3">
      {positions.map((p, i) => {
        const colorClass = podiumColors[i] ?? 'text-muted-foreground';
        const barColor = barColors[Math.min(i, barColors.length - 1)];
        return (
          <div key={i} className="flex items-center gap-3">
            <span
              className={cn(
                'w-[64px] font-mono font-bold text-[14px] whitespace-nowrap shrink-0',
                colorClass,
              )}
            >
              {i + 1}º lugar
            </span>
            <div className="flex-1">
              <Input
                mono
                prefix={mode === 'fixo' ? 'R$' : undefined}
                inputMode="numeric"
                value={String(p)}
                onChange={(e) => setPosition(i, e.target.value)}
                className="h-10"
              />
            </div>
            {mode === 'pct' ? (
              <span className="font-mono text-muted-foreground text-[14px] shrink-0">%</span>
            ) : null}
            {variant === 'desktop' && mode === 'pct' ? (
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn('h-full rounded-full', barColor)}
                  style={{ width: `${Math.min(100, p || 0)}%` }}
                />
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Add / remove buttons */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          disabled={positions.length >= 5}
          onClick={() => onChange([...positions, 0])}
        >
          Posição
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={Minus}
          disabled={positions.length <= 1}
          onClick={() => onChange(positions.slice(0, -1))}
        >
          Remover
        </Button>
        {variant === 'desktop' ? <span className="flex-1" /> : null}
        {variant === 'desktop' && mode === 'pct' ? (
          <Badge tone={total === 100 ? 'positive' : 'warning'}>
            Soma {total}%
          </Badge>
        ) : null}
      </div>

      {/* Mobile sum indicator */}
      {variant === 'mobile' && mode === 'pct' ? (
        <div
          className={cn(
            'flex items-center gap-2 px-[14px] py-[10px] rounded-[var(--radius-md)] border',
            total === 100
              ? 'bg-[color-mix(in_oklab,var(--positive)_8%,transparent)] border-[color-mix(in_oklab,var(--positive)_28%,transparent)]'
              : 'bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] border-[color-mix(in_oklab,var(--warning)_28%,transparent)]',
          )}
        >
          <span
            className={cn(
              'font-mono font-bold text-[14px]',
              total === 100 ? 'text-positive' : 'text-warning',
            )}
          >
            {total}%
          </span>
          <span className="text-[12.5px] text-muted-foreground">
            {total === 100 ? 'Tudo certo — soma 100%.' : 'A soma precisa fechar em 100%.'}
          </span>
        </div>
      ) : null}

      {mode === 'fixo' ? (
        <p className="text-[12px] text-muted-foreground px-0.5">
          Total fixo: R$ {total.toLocaleString('pt-BR')} — o restante do prize pool segue para o 1º lugar.
        </p>
      ) : null}
    </div>
  );
}
