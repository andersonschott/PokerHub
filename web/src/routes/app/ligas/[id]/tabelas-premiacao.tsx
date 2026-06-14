import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, DollarSign } from 'lucide-react';
import { usePrizeTables, useCreatePrizeTable, useDeletePrizeTable } from '@/lib/api/hooks/use-prize-tables';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { toast } from 'sonner';

export default function LeaguePrizeTablesRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  const id = leagueId ?? '';
  const { data: tables, isLoading } = usePrizeTables(id);
  const createTable = useCreatePrizeTable(id);

  const handleCreate = async () => {
    const name = prompt('Nome da tabela de premiação:');
    if (!name) return;
    
    try {
      await createTable.mutateAsync({
        name,
        tiers: [
          { position: 1, percentage: 50 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 20 },
        ]
      });
      toast.success('Tabela criada! (Exemplo padrão)');
    } catch (error) {
      toast.error('Erro ao criar tabela');
    }
  };

  return (
    <div className="px-4 pt-[14px] pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(`/app/ligas/${id}`)}
          className="w-10 h-10 rounded-full shrink-0 bg-secondary flex items-center justify-center text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <SectionTitle icon={DollarSign}>Tabelas de Premiação</SectionTitle>
        </div>
        <Button size="sm" icon={Plus} onClick={handleCreate}>
          Nova
        </Button>
      </div>

      {isLoading && <div className="animate-ph-pulse text-muted-foreground">Carregando...</div>}

      <div className="flex flex-col gap-2">
        {tables?.map((pt) => (
          <PrizeTableItem key={pt.id} pt={pt} />
        ))}
        {tables?.length === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-4">Nenhuma tabela cadastrada.</div>
        )}
      </div>
    </div>
  );
}

function PrizeTableItem({ pt }: { pt: any }) {
  const deleteTable = useDeletePrizeTable(pt.id);

  const handleDelete = async () => {
    if (!confirm(`Remover tabela ${pt.name}?`)) return;
    try {
      await deleteTable.mutateAsync();
      toast.success('Removida');
    } catch {
      toast.error('Erro ao remover (pode estar em uso)');
    }
  };

  return (
    <Card pad="md">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{pt.name}</div>
          <div className="text-xs text-muted-foreground">
            {pt.tiers.length} faixas de premiação
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleDelete}>Excluir</Button>
      </div>
    </Card>
  );
}
