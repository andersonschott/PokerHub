import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, UserX, UserCheck } from 'lucide-react';
import {
  usePlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeactivatePlayer,
  useActivatePlayer,
  isPlayerInactive,
  type PlayerDto,
} from '@/lib/api/hooks/use-players';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionTitle } from '@/components/ui/section-title';
import { Avatar } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function LeaguePlayersRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  const id = leagueId ?? '';
  // Tela de admin: organizador vê ativos + inativos.
  const { data: players, isLoading } = usePlayers(id, { includeInactive: true });
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

  const active = players?.filter((p) => !isPlayerInactive(p)) ?? [];
  const inactive = players?.filter((p) => isPlayerInactive(p)) ?? [];

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

      {!isLoading && (
        <>
          {active.length > 0 && (
            <div className="flex flex-col gap-2">
              {active.map((p) => (
                <PlayerItem key={p.id} player={p} leagueId={id} />
              ))}
            </div>
          )}

          {inactive.length > 0 && (
            <>
              <div className="mt-6 mb-2">
                <SectionTitle>Inativos · {inactive.length}</SectionTitle>
              </div>
              <div className="flex flex-col gap-2">
                {inactive.map((p) => (
                  <PlayerItem key={p.id} player={p} leagueId={id} />
                ))}
              </div>
            </>
          )}

          {active.length === 0 && inactive.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">
              Nenhum jogador cadastrado.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PlayerItem({ player, leagueId }: { player: PlayerDto; leagueId: string }) {
  const updatePlayer = useUpdatePlayer(player.id);
  const deactivatePlayer = useDeactivatePlayer(leagueId);
  const activatePlayer = useActivatePlayer(leagueId);

  const inactive = isPlayerInactive(player);
  const toggling = deactivatePlayer.isPending || activatePlayer.isPending;

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

  const handleDeactivate = async () => {
    if (!confirm(`Inativar ${player.name}? Some das listas de seleção, mas mantém o histórico.`)) {
      return;
    }
    try {
      await deactivatePlayer.mutateAsync(player.id);
      toast.success(`${player.name} inativado`);
    } catch {
      toast.error('Erro ao inativar');
    }
  };

  const handleActivate = async () => {
    try {
      await activatePlayer.mutateAsync(player.id);
      toast.success(`${player.name} reativado`);
    } catch {
      toast.error('Erro ao reativar');
    }
  };

  return (
    <Card pad="md" className={inactive ? 'opacity-60' : undefined}>
      <div className="flex items-center gap-3">
        <Avatar name={player.name} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{player.name}</div>
          <Badge tone={inactive ? 'neutral' : 'positive'} className="mt-1">
            {inactive ? 'Inativo' : 'Ativo'}
          </Badge>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={handleEdit}
            aria-label={`Editar ${player.name}`}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {inactive ? (
            <button
              type="button"
              onClick={handleActivate}
              disabled={toggling}
              aria-label={`Reativar ${player.name}`}
              className="p-2 text-positive hover:text-positive/80 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={toggling}
              aria-label={`Inativar ${player.name}`}
              className="p-2 text-muted-foreground hover:text-negative disabled:opacity-50"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
