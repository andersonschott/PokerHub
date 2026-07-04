import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trophy, Pencil } from 'lucide-react';
import {
  usePrizeTables, useDeletePrizeTable, type LeaguePrizeTableDto,
} from '@/lib/api/hooks/use-prize-tables';
import { prizeAt } from '@/features/prize-tables/prize-table-form';
import { PrizeTableSheet } from '@/features/prize-tables/prize-table-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { Sheet } from '@/components/ui/sheet';
import { MoneyValue } from '@/components/ui/money-value';
import { toast } from 'sonner';

type SheetState = { mode: 'new' } | { mode: 'edit'; table: LeaguePrizeTableDto } | null;

function PrizeCell({ value }: { value: number | null }) {
  return value === null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <MoneyValue value={value} cents={false} color="none" size="13px" />
  );
}

export default function LeaguePrizeTablesRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const id = leagueId ?? '';

  const { data: tables, isLoading, refetch } = usePrizeTables(id);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toDelete, setToDelete] = useState<LeaguePrizeTableDto | null>(null);
  const del = useDeletePrizeTable(toDelete?.id ?? '');

  const handleDelete = () => {
    if (!toDelete) return;
    del.mutate(undefined, {
      onSuccess: () => { toast.success('Tabela excluída'); setToDelete(null); void refetch(); },
      onError: () => { toast.error('Erro ao excluir (pode estar em uso)'); setToDelete(null); },
    });
  };

  return (
    <div className="px-4 pt-[14px] pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button" aria-label="Voltar" onClick={() => navigate(`/app/ligas/${id}`)}
          className="w-10 h-10 rounded-full shrink-0 bg-secondary flex items-center justify-center text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <SectionTitle icon={Trophy}>Tabelas de premiação</SectionTitle>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setSheet({ mode: 'new' })}>Nova</Button>
      </div>

      <p className="text-[12.5px] text-muted-foreground mb-4">
        Valores fixos por prize pool. Quando o prize pool de um torneio coincidir exatamente, a
        tabela é aplicada automaticamente.
      </p>

      {isLoading && <div className="animate-ph-pulse text-sm text-muted-foreground">Carregando…</div>}

      {!isLoading && tables && tables.length === 0 && (
        <div className="text-center text-sm text-muted-foreground mt-8">
          Nenhuma tabela cadastrada.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {tables?.slice().sort((a, b) => a.prizePoolTotal - b.prizePoolTotal).map((pt) => (
          <Card key={pt.id} pad="md">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-sans font-bold text-[15px]">
                  <MoneyValue value={pt.prizePoolTotal} cents={false} color="none" size="15px" />
                </div>
                <div className="text-[12px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>1º <PrizeCell value={prizeAt(pt.entries, 1)} /></span>
                  <span>2º <PrizeCell value={prizeAt(pt.entries, 2)} /></span>
                  <span>3º <PrizeCell value={prizeAt(pt.entries, 3)} /></span>
                  <span>4º <PrizeCell value={prizeAt(pt.entries, 4)} /></span>
                  {pt.jackpotAmount > 0 && (
                    <span className="text-gold-400">
                      Caixinha <MoneyValue value={pt.jackpotAmount} cents={false} color="none" size="12px" />
                    </span>
                  )}
                  {pt.entries.length > 4 && (
                    <span className="text-muted-foreground">+{pt.entries.length - 4}</span>
                  )}
                </div>
              </div>
              <button
                type="button" aria-label="Editar" onClick={() => setSheet({ mode: 'edit', table: pt })}
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-sm)] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-[18px] h-[18px]" />
              </button>
              <Button size="sm" variant="outline" onClick={() => setToDelete(pt)}>Excluir</Button>
            </div>
          </Card>
        ))}
      </div>

      {sheet && (
        <PrizeTableSheet
          leagueId={id}
          existing={sheet.mode === 'edit' ? sheet.table : null}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); void refetch(); }}
        />
      )}

      {toDelete && (
        <Sheet
          fixed open onClose={() => setToDelete(null)}
          title="Excluir tabela?"
          subtitle="Esta ação não pode ser desfeita."
        >
          <div className="flex flex-col gap-2.5">
            <Button variant="destructive" block disabled={del.isPending} onClick={handleDelete}>
              {del.isPending ? 'Excluindo…' : 'Confirmar exclusão'}
            </Button>
            <Button variant="ghost" block onClick={() => setToDelete(null)}>Cancelar</Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
