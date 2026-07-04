/**
 * Administração da liga — hub do organizador.
 *
 * Seções: Liga (editar / convite / caixinha), Temporada, Premiação, Jogadores.
 * Tudo consome a API real:
 *  - Código de convite: useActiveLeague() → useLeague(id) → inviteCode; regenerar via useRegenerateInvite.
 *  - Editar liga: PUT /leagues/{id} + caixinha % via useUpdateJackpotSettings.
 *  - Caixinha: % real (league.jackpotPercentage) + saldo (jackpotBalance de contribuições/usos).
 *  - Temporada: useActiveSeason + useSeasonSummaries; encerrar via useUpdateSeason({ isActive: false }).
 *  - Premiação: usePrizeTables (fallback estático 50/30/20 quando não há tabela configurada).
 *  - Jogadores: usePlayers + useDeletePlayer (DELETE /api/players/{id}).
 */
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Pencil,
  Ticket,
  PiggyBank,
  CalendarRange,
  Trophy,
  Users,
  UserPlus,
  ChevronRight,
  Copy,
  Check,
  Settings2,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { SearchField } from '@/components/ui/search-field';
import { SectionTitle } from '@/components/ui/section-title';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Chips } from '@/components/ui/chips';
import { MoneyValue } from '@/components/ui/money-value';
import { useActiveLeague } from '@/features/leagues/league-context';
import {
  useLeague,
  useRegenerateInvite,
  useTransferOwnership,
  leagueKeys,
  type PlayerDto,
} from '@/lib/api/hooks/use-leagues';
import { useActiveSeason, useSeasonSummaries, useUpdateSeason } from '@/lib/api/hooks/use-seasons';
import {
  useJackpotContributions,
  useJackpotUsages,
  useJackpotStatus,
  useUpdateJackpotSettings,
} from '@/lib/api/hooks/use-jackpot';
import { jackpotBalance } from '@/features/jackpot/jackpot-balance';
import { usePlayers, useDeletePlayer, isPlayerInactive } from '@/lib/api/hooks/use-players';
import { usePrizeTables } from '@/lib/api/hooks/use-prize-tables';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';

// ---------------------------------------------------------------------------
// Edit-liga form schema (RHF + Zod)
// ---------------------------------------------------------------------------

const EditSchema = z.object({
  name: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres.')
    .max(200, 'O nome deve ter no máximo 200 caracteres.'),
  blockCheckInWithDebt: z.boolean(),
  jackpotPercentage: z.number().min(0).max(100),
  jackpotPixKey: z.string().max(140, 'A chave deve ter no máximo 140 caracteres.'),
});

type EditFormData = z.infer<typeof EditSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SheetKind = 'edit' | 'invite' | 'transfer' | null;

interface AdminRowProps {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  last?: boolean;
}

// ---------------------------------------------------------------------------
// Sub-component: list row
// ---------------------------------------------------------------------------

function AdminRow({ icon, label, sub, trailing, onClick, last }: AdminRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={
        'flex items-center gap-3 w-full min-h-[52px] py-3 px-[14px] ' +
        'bg-transparent border-0 text-foreground text-left cursor-pointer ' +
        'hover:bg-secondary/40 transition-colors ' +
        'disabled:cursor-default ' +
        (last ? '' : 'border-b border-border')
      }
    >
      <span className="text-muted-foreground shrink-0 [&_svg]:w-[18px] [&_svg]:h-[18px]">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-sans font-medium text-[14.5px]">{label}</span>
        {sub ? (
          <span className="block text-[12px] text-muted-foreground mt-0.5">{sub}</span>
        ) : null}
      </span>
      {trailing}
      {onClick ? (
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Range de datas da temporada formatado (dd/mm – dd/mm | em andamento). */
function formatSeasonRange(startDate?: string, endDate?: string | null): string {
  if (!startDate) return '';
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const start = fmt(startDate);
  return endDate ? `${start} – ${fmt(endDate)}` : `${start} – em andamento`;
}

// ---------------------------------------------------------------------------
// Sub-component: player row (delete isolado por jogador — hook fora de .map)
// ---------------------------------------------------------------------------

interface PlayerRowProps {
  player: PlayerDto;
  last: boolean;
  onRemoved: (name: string) => void;
  onError: () => void;
}

function PlayerRow({ player, last, onRemoved, onError }: PlayerRowProps) {
  const deletePlayer = useDeletePlayer(player.id);
  const [confirm, setConfirm] = useState(false);
  const inactive = isPlayerInactive(player);

  const handleConfirm = () => {
    deletePlayer.mutate(undefined, {
      onSuccess: () => {
        setConfirm(false);
        onRemoved(player.name);
      },
      onError: () => {
        setConfirm(false);
        onError();
      },
    });
  };

  return (
    <>
      <div
        className={
          'flex items-center gap-3 px-[14px] py-2.5 ' +
          (last ? '' : 'border-b border-border') +
          (inactive ? ' opacity-60' : '')
        }
      >
        <Avatar name={player.name} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-sans font-semibold text-[14px] truncate">{player.name}</span>
            {inactive ? (
              <Badge tone="neutral" className="shrink-0">
                Inativo
              </Badge>
            ) : null}
          </div>
          {player.nickname ? (
            <div className="text-[11.5px] text-muted-foreground">@{player.nickname}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          aria-label={`Remover ${player.name} da liga`}
          className="inline-flex items-center h-[30px] px-2.5 rounded-[var(--radius-sm)] border border-border bg-transparent text-muted-foreground font-sans font-semibold text-[12px] cursor-pointer hover:border-negative hover:text-negative transition-colors shrink-0"
        >
          Remover
        </button>
      </div>

      {confirm && (
        <Sheet
          fixed
          open
          onClose={() => setConfirm(false)}
          title={`Remover ${player.name}?`}
          subtitle="O jogador perderá acesso à liga e ao histórico."
        >
          <div className="flex flex-col gap-2.5">
            <Button
              variant="destructive"
              block
              disabled={deletePlayer.isPending}
              onClick={handleConfirm}
            >
              {deletePlayer.isPending ? 'Removendo…' : 'Confirmar remoção'}
            </Button>
            <Button variant="ghost" block onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
          </div>
        </Sheet>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminRoute() {
  const navigate = useNavigate();
  const { activeLeagueId } = useActiveLeague();
  const qc = useQueryClient();
  const { user } = useAuth();

  // Real data
  const { data: league, isLoading: isLoadingLeague } = useLeague(activeLeagueId ?? '');
  const { data: activeSeason, isLoading: isLoadingSeason } = useActiveSeason(activeLeagueId ?? '');
  const { data: summaries } = useSeasonSummaries(activeLeagueId ?? '');
  const { data: players, isLoading: isLoadingPlayers } = usePlayers(activeLeagueId ?? '', {
    includeInactive: true,
  });
  const { data: prizeTables } = usePrizeTables(activeLeagueId ?? '');
  const { data: contributions } = useJackpotContributions(activeLeagueId);
  const { data: usages } = useJackpotUsages(activeLeagueId);
  const { data: jackpotStatus } = useJackpotStatus(activeLeagueId);

  const balance = jackpotBalance(contributions, usages);
  const seasonSummary =
    summaries?.find((s) => s.id === activeSeason?.id) ?? summaries?.find((s) => s.isActive);
  const isOrganizer = league?.organizerId === user?.userId;

  // Mutations
  const regenerateInvite = useRegenerateInvite(activeLeagueId ?? '');
  const updateSeason = useUpdateSeason(activeSeason?.id ?? '');
  const updateJackpot = useUpdateJackpotSettings(activeLeagueId);
  const transferOwnership = useTransferOwnership(activeLeagueId ?? '');

  // Local UI state
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = league?.name ?? '';
  const inviteCode = league?.inviteCode ?? '';

  // RHF form for edit-liga sheet
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      name: league?.name ?? '',
      blockCheckInWithDebt: league?.blockCheckInWithDebt ?? true,
      jackpotPercentage: league?.jackpotPercentage ?? 0,
      jackpotPixKey: jackpotStatus?.jackpotPixKey ?? '',
    },
  });

  const fire = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const openEditSheet = () => {
    reset({
      name: league?.name ?? '',
      blockCheckInWithDebt: league?.blockCheckInWithDebt ?? true,
      jackpotPercentage: league?.jackpotPercentage ?? 0,
      jackpotPixKey: jackpotStatus?.jackpotPixKey ?? '',
    });
    setSheet('edit');
  };

  // Copy invite code
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
    } catch {
      // clipboard not available — visual feedback still shown
    }
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setSheet(null);
    }, 1400);
  };

  // Regenerate invite
  const handleRegenerate = () => {
    if (!activeLeagueId) return;
    regenerateInvite.mutate(undefined, {
      onSuccess: () => fire('Código de convite regenerado'),
      onError: () => fire('Erro ao regenerar código'),
    });
  };

  // Encerrar temporada (REAL — PUT /seasons/{id} { isActive: false })
  const handleCloseSeason = () => {
    if (!activeSeason) return;
    updateSeason.mutate(
      { isActive: false },
      {
        onSuccess: () => fire('Temporada encerrada'),
        onError: () => fire('Erro ao encerrar temporada'),
      },
    );
  };

  // Update league (PUT /leagues/{id}) + persistir % da caixinha (PUT /leagues/{id}/jackpot/settings)
  const updateMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      if (!activeLeagueId) return;
      await api(`/leagues/${activeLeagueId}`, {
        method: 'PUT',
        body: {
          name: data.name,
          description: league?.description ?? null,
          blockCheckInWithDebt: data.blockCheckInWithDebt,
        },
      });
      // null/omitido = "não alterar" no backend; '' = limpar explicitamente. Enquanto o
      // status da caixinha não carregou, o form foi semeado vazio — não enviar a chave
      // nesse caso evita apagar a chave salva num save que só mexeu em outros campos.
      const pixKey = data.jackpotPixKey.trim();
      await updateJackpot.mutateAsync({
        jackpotPercentage: data.jackpotPercentage,
        jackpotPixKey: jackpotStatus === undefined && !pixKey ? null : pixKey,
      });
      void qc.invalidateQueries({ queryKey: leagueKeys.detail(activeLeagueId) });
      void qc.invalidateQueries({ queryKey: leagueKeys.list() });
    },
    onSuccess: () => {
      setSheet(null);
      fire('Liga atualizada');
    },
    onError: () => {
      setSheet(null);
      fire('Erro ao atualizar liga');
    },
  });

  const onEditSubmit = handleSubmit((data) => updateMutation.mutate(data));

  // --- Guards ---
  if (!activeLeagueId) {
    return (
      <div className="p-4 text-center mt-10">
        <p className="text-muted-foreground">Nenhuma liga selecionada.</p>
        <Button className="mt-4" onClick={() => navigate('/app/ligas')}>
          Voltar
        </Button>
      </div>
    );
  }

  if (isLoadingLeague || isLoadingSeason || isLoadingPlayers) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (league && !isOrganizer) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="pb-24 px-4 pt-3 relative min-h-full">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center size-9 rounded-[var(--radius-md)] text-muted-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-sans font-bold text-[19px] tracking-[-0.01em] leading-tight">
            Administração
          </h1>
          <p className="text-[12.5px] text-muted-foreground">{displayName}</p>
        </div>
      </div>

      {/* --- Liga --- */}
      <SectionTitle icon={Settings2} className="mt-2">
        Liga
      </SectionTitle>
      <Card pad="none" className="mb-[18px]">
        <AdminRow
          icon={<Pencil />}
          label="Editar dados da liga"
          sub="Nome, descrição, regras de check-in"
          onClick={openEditSheet}
        />
        <AdminRow
          icon={<Ticket />}
          label="Código de convite"
          sub="Convide jogadores para a liga"
          onClick={() => setSheet('invite')}
        />
        <AdminRow
          icon={<PiggyBank />}
          label="Caixinha"
          sub={`${league?.jackpotPercentage ?? 0}% de cada prize pool`}
          trailing={
            <span className="font-mono font-bold text-[14px] text-gold-400 shrink-0 whitespace-nowrap">
              <MoneyValue value={balance} cents={false} color="none" size="14px" />
            </span>
          }
          onClick={() => navigate('/app/perfil/caixinha')}
          last
        />
      </Card>

      {/* --- Temporada --- */}
      <SectionTitle icon={CalendarRange}>Temporada</SectionTitle>
      <Card pad="md" className="mb-[18px]">
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-sans font-semibold text-[14.5px]">
            {activeSeason?.name ?? 'Temporada'}
          </span>
          <span className="font-mono text-[12.5px] text-muted-foreground whitespace-nowrap shrink-0">
            {activeSeason ? formatSeasonRange(activeSeason.startDate, activeSeason.endDate) : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[12px] text-muted-foreground">
            <span className="font-mono font-bold text-foreground">
              {seasonSummary?.tournamentsCount ?? 0}
            </span>{' '}
            torneios realizados
          </span>
          {isOrganizer && (
            <button
              type="button"
              onClick={handleCloseSeason}
              disabled={!activeSeason || updateSeason.isPending}
              className="border-0 bg-transparent cursor-pointer font-sans font-semibold text-[12.5px] text-negative py-1.5 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-default"
            >
              {updateSeason.isPending ? 'Encerrando…' : 'Encerrar temporada'}
            </button>
          )}
        </div>
      </Card>

      {/* --- Premiação --- */}
      <SectionTitle icon={Trophy}>Tabelas de premiação</SectionTitle>
      <Card pad="none" className="mb-[18px]">
        <button
          type="button"
          onClick={() => navigate(`/app/ligas/${activeLeagueId}/tabelas-premiacao`)}
          className="flex items-center gap-3 w-full min-h-[52px] py-3 px-[14px] bg-transparent border-0 text-foreground text-left cursor-pointer hover:bg-secondary/40 transition-colors"
        >
          <Trophy className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-sans font-medium text-[14.5px]">Gerenciar tabelas</span>
            <span className="block text-[12px] text-muted-foreground mt-0.5">
              {(prizeTables?.length ?? 0) === 0
                ? 'Nenhuma tabela configurada'
                : `${prizeTables!.length} tabela${prizeTables!.length !== 1 ? 's' : ''} por prize pool`}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </Card>

      {/* --- Jogadores --- */}
      <SectionTitle icon={Users}>Jogadores · {players?.length ?? 0}</SectionTitle>
      <Card pad="none" className="mt-2">
        {players && players.length > 0 ? (
          players.map((p, i) => (
            <PlayerRow
              key={p.id}
              player={p}
              last={i === players.length - 1}
              onRemoved={(name) => fire(`${name} removido da liga`)}
              onError={() => fire('Erro ao remover (pode ter histórico)')}
            />
          ))
        ) : (
          <p className="px-[14px] py-4 text-[12.5px] text-muted-foreground text-center">
            Nenhum jogador cadastrado.
          </p>
        )}
      </Card>
      <div className="mt-2.5">
        <Button variant="secondary" icon={UserPlus} block onClick={() => setSheet('invite')}>
          Convidar jogador
        </Button>
      </div>

      {/* --- Zona de risco --- */}
      <SectionTitle icon={AlertTriangle} className="mt-6 text-negative">
        Zona de risco
      </SectionTitle>
      <Card pad="none" className="mb-[18px] border-negative/30">
        <AdminRow
          icon={<AlertTriangle className="text-negative" />}
          label="Transferir propriedade"
          sub="Você deixará de ser o dono da liga"
          onClick={() => {
            setSelectedUserId(null);
            setSearchQuery('');
            setSheet('transfer');
          }}
          last
        />
      </Card>

      {/* --- Edit league sheet (RHF form) --- */}
      {sheet === 'edit' && (
        <Sheet
          fixed
          open
          onClose={() => setSheet(null)}
          title="Editar dados da liga"
          subtitle="As mudanças valem para os próximos torneios"
        >
          <form onSubmit={onEditSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Nome da liga
              </label>
              <Input
                {...register('name')}
                autoFocus
              />
              {errors.name ? (
                <p className="text-[12px] text-negative">{errors.name.message}</p>
              ) : null}
            </div>
            <Controller
              name="blockCheckInWithDebt"
              control={control}
              render={({ field }) => (
                <Switch
                  label="Bloquear check-in com débitos"
                  sub="Jogador com pagamento pendente não entra"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name="jackpotPercentage"
              control={control}
              render={({ field }) => (
                <Chips
                  label="Caixinha — % do prize pool"
                  options={[0, 5, 10, 15]}
                  value={field.value}
                  onChange={field.onChange}
                  render={(o) => `${o}%`}
                />
              )}
            />
            <div className="flex flex-col gap-1.5">
              <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                Chave PIX da caixinha
              </label>
              <Input
                {...register('jackpotPixKey')}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
              />
              <p className="text-[11.5px] text-muted-foreground">
                Exibida para quem tem contribuição pendente com a caixinha.
              </p>
              {errors.jackpotPixKey ? (
                <p className="text-[12px] text-negative">{errors.jackpotPixKey.message}</p>
              ) : null}
            </div>
            <Button
              type="submit"
              variant="primary"
              icon={Check}
              block
              disabled={isSubmitting || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </Sheet>
      )}

      {/* --- Invite sheet --- */}
      {sheet === 'invite' && (
        <Sheet
          fixed
          open
          onClose={() => setSheet(null)}
          title={`Convite · ${displayName}`}
          subtitle="Compartilhe este código para convidar jogadores"
        >
          <div className="flex items-center justify-center px-[18px] py-[18px] rounded-[var(--radius-md)] bg-secondary border border-border mb-3">
            <span className="font-mono font-bold text-[26px] tracking-[0.14em] text-gold-400">
              {inviteCode}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              icon={copied ? Check : Copy}
              block
              onClick={() => void copyInvite()}
            >
              {copied ? 'Copiado!' : 'Copiar código'}
            </Button>
            {activeLeagueId && (
              <Button
                variant="secondary"
                icon={RefreshCw}
                aria-label="Regenerar código"
                disabled={regenerateInvite.isPending}
                onClick={handleRegenerate}
              />
            )}
          </div>
        </Sheet>
      )}

      {/* --- Transfer ownership sheet --- */}
      {sheet === 'transfer' && (
        <Sheet
          fixed
          open
          onClose={() => setSheet(null)}
          title="Transferir propriedade"
          subtitle="Escolha um membro ativo da liga para ser o novo dono"
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--radius-md)] border border-negative/30 bg-negative/10 px-[14px] py-3">
              <p className="text-[13px] text-negative leading-relaxed">
                Ao confirmar, <strong>você deixará de ser o dono</strong> da liga e passará a ser um membro comum. Essa ação não pode ser desfeita.
              </p>
            </div>

            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar membro…"
              autoFocus
            />

            <div className="flex flex-col gap-1 max-h-[260px] overflow-y-auto">
              {players
                ?.filter(
                  (p) =>
                    p.userId != null &&
                    p.userId !== user?.userId &&
                    p.isActive &&
                    p.membershipStatus === 0,
                )
                .filter((p) => {
                  const q = searchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    p.name.toLowerCase().includes(q) ||
                    (p.nickname?.toLowerCase().includes(q) ?? false)
                  );
                })
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedUserId(p.userId)}
                    className={
                      'flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-[var(--radius-md)] border transition-colors ' +
                      (selectedUserId === p.userId
                        ? 'border-negative bg-negative/10'
                        : 'border-border bg-transparent hover:bg-secondary/40')
                    }
                  >
                    <Avatar name={p.name} size={34} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-sans font-medium text-[14px] truncate">
                        {p.name}
                      </span>
                      {p.nickname ? (
                        <span className="block text-[11.5px] text-muted-foreground truncate">
                          @{p.nickname}
                        </span>
                      ) : null}
                    </span>
                    {selectedUserId === p.userId && (
                      <Check className="w-4 h-4 text-negative shrink-0" />
                    )}
                  </button>
                ))}
              {players?.filter(
                (p) =>
                  p.userId != null &&
                  p.userId !== user?.userId &&
                  p.isActive &&
                  p.membershipStatus === 0,
              ).length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-4">
                  Nenhum membro elegível encontrado.
                </p>
              ) : null}
            </div>

            <Button
              variant="destructive"
              block
              disabled={!selectedUserId || transferOwnership.isPending}
              onClick={() => {
                if (!selectedUserId) return;
                transferOwnership.mutate(selectedUserId, {
                  onSuccess: () => {
                    setSheet(null);
                    fire('Propriedade transferida');
                  },
                  onError: () => {
                    fire('Erro ao transferir propriedade');
                  },
                });
              }}
            >
              {transferOwnership.isPending ? 'Transferindo…' : 'Transferir propriedade'}
            </Button>
            <Button variant="ghost" block onClick={() => setSheet(null)}>
              Cancelar
            </Button>
          </div>
        </Sheet>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute left-4 right-4 bottom-20 z-[70] bg-[var(--felt-700)] border border-border rounded-[var(--radius-md)] px-[14px] py-3 flex items-center gap-2.5 shadow-lg">
          <Check className="w-[18px] h-[18px] text-positive shrink-0" />
          <span className="text-[14px] font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}
