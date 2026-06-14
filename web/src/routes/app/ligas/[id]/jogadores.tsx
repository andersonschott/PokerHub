import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, UserX } from 'lucide-react';
import { usePlayers, useCreatePlayer } from '@/lib/api/hooks/use-players';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { Avatar } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function LeaguePlayersRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  const id = leagueId ?? '';
  const { data: players, isLoading } = usePlayers(id);
  const createPlayer = useCreatePlayer(id);

  const handleCreate = async () => {
    const name = prompt('Nome do jogador:');
    if (!name) return;
    
    try {
      await createPlayer.mutateAsync({ name });
      toast.success('Jogador adicionado!');
    } catch (error) {
      toast.error('Erro ao adicionar jogador');
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
          <SectionTitle icon={UserX}>Gerenciar Jogadores</SectionTitle>
        </div>
        <Button size="sm" icon={Plus} onClick={handleCreate}>
          Adicionar
        </Button>
      </div>

      {isLoading && <div className="animate-ph-pulse text-muted-foreground">Carregando...</div>}

      <div className="flex flex-col gap-2">
        {players?.map((p) => (
          <PlayerItem key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}

// Extract item to use hooks properly
import { useUpdatePlayer, useDeletePlayer } from '@/lib/api/hooks/use-players';

function PlayerItem({ player }: { player: any }) {
  const updatePlayer = useUpdatePlayer(player.id);
  const deletePlayer = useDeletePlayer(player.id);

  const handleEdit = async () => {
    const newName = prompt('Novo nome:', player.name);
    if (!newName) return;
    try {
      await updatePlayer.mutateAsync({ name: newName });
      toast.success('Salvo');
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remover ${player.name}?`)) return;
    try {
      await deletePlayer.mutateAsync();
      toast.success('Removido');
    } catch {
      toast.error('Erro ao remover (pode ter histórico)');
    }
  };

  return (
    <Card pad="md">
      <div className="flex items-center gap-3">
        <Avatar name={player.name} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{player.name}</div>
          <div className="text-xs text-muted-foreground">{player.isActive ? 'Ativo' : 'Inativo'}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleEdit} className="p-2 text-muted-foreground hover:text-foreground">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} className="p-2 text-destructive hover:text-destructive/80">
            <UserX className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
