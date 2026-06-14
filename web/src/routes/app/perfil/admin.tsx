/**
 * Administração da liga — hub do organizador.
 * Port fiel de Admin.jsx do kit.
 *
 * Seções: Liga (editar / convite / caixinha), Temporada, Premiação, Jogadores.
 * Código de convite REAL: useActiveLeague() → useLeague(id) → inviteCode.
 * Regenerar convite REAL: useRegenerateInvite(id).
 * Editar liga REAL: PUT /leagues/{id} via useUpdateLeague (mock fallback).
 * Gestão de jogadores: mock local com confirm sheet para remoção.
 * Encerrar temporada: mock com toast.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { SectionTitle } from '@/components/ui/section-title';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Chips } from '@/components/ui/chips';
import { MoneyValue } from '@/components/ui/money-value';
import { useActiveLeague } from '@/features/leagues/league-context';
import { useLeague, useRegenerateInvite, leagueKeys } from '@/lib/api/hooks/use-leagues';
import { api } from '@/lib/api/client';
import { mockData } from '@/mocks/data';

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
});

type EditFormData = z.infer<typeof EditSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SheetKind = 'edit' | 'invite' | null;

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
// Main component
// ---------------------------------------------------------------------------

export default function AdminRoute() {
  const navigate = useNavigate();
  const { activeLeagueId } = useActiveLeague();
  const qc = useQueryClient();
  const S = mockData.season;

  // Real league data (if active league is from API)
  const { data: league } = useLeague(activeLeagueId ?? '');
  const regenerateInvite = useRegenerateInvite(activeLeagueId ?? '');

  // Local state
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [players, setPlayers] = useState(() =>
    mockData.ranking.map((p) => ({ name: p.name, nick: p.nick })),
  );
  const [pct, setPct] = useState(mockData.caixinha.percent);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ name: string; nick: string } | null>(null);

  const displayName = league?.name ?? mockData.league.name;
  const inviteCode = league?.inviteCode ?? 'AMIGOS-2K6';
  const caixinhaBalance = mockData.caixinha.balance;

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
      name: displayName,
      blockCheckInWithDebt: league?.blockCheckInWithDebt ?? true,
      jackpotPercentage: mockData.caixinha.percent,
    },
  });

  const fire = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const openEditSheet = () => {
    reset({
      name: league?.name ?? mockData.league.name,
      blockCheckInWithDebt: league?.blockCheckInWithDebt ?? true,
      jackpotPercentage: pct,
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

  // Update league (REAL if active league is API league, mock fallback)
  const updateMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      if (activeLeagueId) {
        await api(`/leagues/${activeLeagueId}`, {
          method: 'PUT',
          body: {
            name: data.name,
            description: null,
            blockCheckInWithDebt: data.blockCheckInWithDebt,
          },
        });
        void qc.invalidateQueries({ queryKey: leagueKeys.detail(activeLeagueId) });
        void qc.invalidateQueries({ queryKey: leagueKeys.list() });
      }
      setPct(data.jackpotPercentage);
    },
    onSuccess: () => {
      setSheet(null);
      fire('Liga atualizada');
    },
    onError: () => {
      // fallback: apply locally anyway
      setSheet(null);
      fire('Liga atualizada (local)');
    },
  });

  const onEditSubmit = handleSubmit((data) => updateMutation.mutate(data));

  const removePlayer = (p: { name: string; nick: string }) => {
    setPlayers((prev) => prev.filter((x) => x.nick !== p.nick));
    setConfirmRemove(null);
    fire(`${p.name} removido da liga`);
  };

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
          sub={`${pct}% de cada prize pool`}
          trailing={
            <span className="font-mono font-bold text-[14px] text-gold-400 shrink-0 whitespace-nowrap">
              <MoneyValue value={caixinhaBalance} cents={false} color="none" size="14px" />
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
          <span className="font-sans font-semibold text-[14.5px]">{S.name}</span>
          <span className="font-mono text-[12.5px] text-muted-foreground whitespace-nowrap shrink-0">
            {S.range}
          </span>
        </div>
        <ProgressBar value={(S.played / S.total) * 100} tone="gold" />
        <div className="flex justify-between items-center mt-2">
          <span className="text-[12px] text-muted-foreground">
            <span className="font-mono font-bold text-foreground">{S.played}</span>/{S.total}{' '}
            torneios realizados
          </span>
          <button
            type="button"
            onClick={() => fire('Temporada encerrada (exemplo)')}
            className="border-0 bg-transparent cursor-pointer font-sans font-semibold text-[12.5px] text-negative py-1.5 hover:opacity-80 transition-opacity"
          >
            Encerrar temporada
          </button>
        </div>
      </Card>

      {/* --- Premiação --- */}
      <SectionTitle icon={Trophy}>Tabela de premiação</SectionTitle>
      <Card pad="none" className="mb-[18px]">
        {(
          [
            ['1º lugar', 50, 'var(--podium-gold)'],
            ['2º lugar', 30, 'var(--podium-silver)'],
            ['3º lugar', 20, 'var(--podium-bronze)'],
          ] as const
        ).map(([label, pctVal, color], i, arr) => (
          <div
            key={label}
            className={
              'flex items-center gap-3 px-[14px] py-3 ' +
              (i < arr.length - 1 ? 'border-b border-border' : '')
            }
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: color }}
            />
            <span className="flex-1 font-sans font-medium text-[14.5px]">{label}</span>
            <span className="font-mono font-bold text-[15px]">{pctVal}%</span>
          </div>
        ))}
      </Card>

      {/* --- Jogadores --- */}
      <SectionTitle icon={Users}>Jogadores · {players.length}</SectionTitle>
      <Card pad="none" className="mt-2">
        {players.map((p, i) => (
          <div
            key={p.nick}
            className={
              'flex items-center gap-3 px-[14px] py-2.5 ' +
              (i < players.length - 1 ? 'border-b border-border' : '')
            }
          >
            <Avatar name={p.name} size={36} />
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-[14px] truncate">{p.name}</div>
              <div className="text-[11.5px] text-muted-foreground">@{p.nick}</div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmRemove(p)}
              aria-label={`Remover ${p.name} da liga`}
              className="inline-flex items-center h-[30px] px-2.5 rounded-[var(--radius-sm)] border border-border bg-transparent text-muted-foreground font-sans font-semibold text-[12px] cursor-pointer hover:border-negative hover:text-negative transition-colors shrink-0"
            >
              Remover
            </button>
          </div>
        ))}
      </Card>
      <div className="mt-2.5">
        <Button variant="secondary" icon={UserPlus} block onClick={() => setSheet('invite')}>
          Convidar jogador
        </Button>
      </div>

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

      {/* --- Confirm remove sheet --- */}
      {confirmRemove && (
        <Sheet
          fixed
          open
          onClose={() => setConfirmRemove(null)}
          title={`Remover ${confirmRemove.name}?`}
          subtitle="O jogador perderá acesso à liga e ao histórico."
        >
          <div className="flex flex-col gap-2.5">
            <Button
              variant="destructive"
              block
              onClick={() => removePlayer(confirmRemove)}
            >
              Confirmar remoção
            </Button>
            <Button
              variant="ghost"
              block
              onClick={() => setConfirmRemove(null)}
            >
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
