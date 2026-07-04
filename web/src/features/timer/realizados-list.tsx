/**
 * RealizadosList — Seção "Realizados" reutilizável.
 * Port de PHHistoricoList de Historico.jsx, agora alimentada por dados reais via prop `items`.
 *
 * O TournamentDto não traz pódio/vencedor, então o pódio é omitido (sem N+1 de detalhe).
 */
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { MoneyValue } from '@/components/ui/money-value';

export interface RealizadoItem {
  id: string;
  name: string;
  /** ISO string; formatada para exibição aqui. */
  scheduledDateTime: string;
  players: number;
  prizePool: number;
}

interface RealizadosListProps {
  items: readonly RealizadoItem[];
  limit?: number;
  onSelect?: (item: RealizadoItem) => void;
}

export function RealizadosList({ items, limit, onSelect }: RealizadosListProps) {
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <div className="flex flex-col gap-2.5">
      <SectionTitle>Realizados</SectionTitle>
      {shown.length === 0 ? (
        <div className="text-[13px] text-muted-foreground px-0.5">Nenhum torneio finalizado.</div>
      ) : (
        shown.map((h) => (
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
                  <span className="font-mono">{new Date(h.scheduledDateTime).toLocaleDateString('pt-BR')}</span>
                  {' · '}
                  {h.players} jogadores
                </div>
              </div>
              <MoneyValue value={h.prizePool} cents={false} color="none" size="14px" />
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
