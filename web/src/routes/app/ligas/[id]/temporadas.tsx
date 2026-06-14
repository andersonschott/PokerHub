import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Power } from 'lucide-react';
import { useSeasons, useCreateSeason, useUpdateSeason } from '@/lib/api/hooks/use-seasons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { toast } from 'sonner';

export default function LeagueSeasonsRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  const id = leagueId ?? '';
  const { data: seasons, isLoading } = useSeasons(id);
  const createSeason = useCreateSeason(id);

  const handleCreate = async () => {
    const name = prompt('Nome da temporada:');
    if (!name) return;
    
    try {
      await createSeason.mutateAsync({ name, startDate: new Date().toISOString() });
      toast.success('Temporada criada!');
    } catch (error) {
      toast.error('Erro ao criar temporada');
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
          <SectionTitle icon={Calendar}>Temporadas</SectionTitle>
        </div>
        <Button size="sm" icon={Plus} onClick={handleCreate}>
          Nova
        </Button>
      </div>

      {isLoading && <div className="animate-ph-pulse text-muted-foreground">Carregando...</div>}

      <div className="flex flex-col gap-2">
        {seasons?.map((s) => (
          <SeasonItem key={s.id} season={s} />
        ))}
        {seasons?.length === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-4">Nenhuma temporada criada.</div>
        )}
      </div>
    </div>
  );
}

function SeasonItem({ season }: { season: any }) {
  const updateSeason = useUpdateSeason(season.id);

  const handleToggleActive = async () => {
    if (!season.isActive && !confirm('Ativar esta temporada? Isso desativará a atual.')) return;
    if (season.isActive && !confirm('Desativar esta temporada?')) return;
    
    try {
      await updateSeason.mutateAsync({ isActive: !season.isActive });
      toast.success(season.isActive ? 'Temporada encerrada' : 'Temporada ativada');
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  return (
    <Card pad="md" className={season.isActive ? 'border-[var(--positive)]' : ''}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{season.name}</div>
          <div className="text-xs text-muted-foreground">
            Início: {new Date(season.startDate).toLocaleDateString()}
          </div>
        </div>
        <Button
          size="sm"
          variant={season.isActive ? 'outline' : 'primary'}
          icon={Power}
          onClick={handleToggleActive}
        >
          {season.isActive ? 'Ativa' : 'Ativar'}
        </Button>
      </div>
    </Card>
  );
}
