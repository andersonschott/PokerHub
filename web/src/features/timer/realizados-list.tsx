/**
 * RealizadosList — Seção "Realizados" reutilizável.
 * Port de PHHistoricoList de Historico.jsx.
 * Usada na aba Torneio vazio (limit=3) e em outras telas.
 */
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { MoneyValue } from '@/components/ui/money-value';
import { mockData, type MockHistoricoItem } from '@/mocks/data';

interface RealizadosListProps {
  limit?: number;
  onSelect?: (item: MockHistoricoItem) => void;
}

export function RealizadosList({ limit, onSelect }: RealizadosListProps) {
  const items = limit ? mockData.history.slice(0, limit) : mockData.history;

  return (
    <div className="flex flex-col gap-2.5">
      <SectionTitle>Realizados</SectionTitle>
      {items.map((h) => (
        <Card
          key={h.id}
          interactive
          pad="md"
          onClick={() => onSelect?.(h)}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">
                {h.name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="font-mono">{h.date}</span>
                {' · '}
                {h.players} jogadores
                {' · '}
                <span className="text-[var(--podium-gold)]">♠ {h.podium[0]?.name}</span>
              </div>
            </div>
            <MoneyValue value={h.prizePool} cents={false} color="none" size="14px" />
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}
