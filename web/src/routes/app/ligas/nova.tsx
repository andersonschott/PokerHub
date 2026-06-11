/**
 * /app/ligas/nova — Criar liga (API real).
 * Port de docs/design-system/ui_kits/pokerhub_app/Forms.jsx#PHLigaForm
 * com RHF + Zod conforme o plano.
 */
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Chips } from '@/components/ui/chips';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/client';
import { useCreateLeague } from '@/lib/api/hooks/use-leagues';
import { useActiveLeague } from '@/features/leagues/league-context';

const JACKPOT_OPTIONS = [0, 5, 10, 15] as const;

const Schema = z.object({
  name: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres.')
    .max(200, 'O nome deve ter no máximo 200 caracteres.'),
  description: z.string().max(1000, 'A descrição deve ter no máximo 1000 caracteres.').optional(),
  blockCheckInWithDebt: z.boolean(),
  jackpotPercentage: z.number().min(0).max(100),
});

type FormData = z.infer<typeof Schema>;

export default function NovaLigaRoute() {
  const navigate = useNavigate();
  const { setActiveLeagueId } = useActiveLeague();
  const createLeague = useCreateLeague();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: '',
      description: '',
      blockCheckInWithDebt: true,
      jackpotPercentage: 10,
    },
  });

  const nameValue = watch('name');

  const onSubmit = (data: FormData) => {
    createLeague.mutate(
      {
        name: data.name,
        description: data.description || null,
        blockCheckInWithDebt: data.blockCheckInWithDebt,
      },
      {
        onSuccess: (league) => {
          setActiveLeagueId(league.id);
          toast.success(`Liga "${league.name}" criada com sucesso!`);
          navigate(`/app/ligas/${league.id}`, { replace: true });
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.message : 'Erro ao criar liga. Tente novamente.';
          toast.error(msg);
        },
      },
    );
  };

  return (
    <div className="px-4 pt-[14px] pb-24 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-[10px] mb-[18px]">
        <IconButton
          icon={ArrowLeft}
          aria-label="Voltar"
          onClick={() => navigate(-1)}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="font-sans font-bold text-[18px] tracking-[-0.01em]">Criar liga</div>
          <div className="text-xs text-muted-foreground">Sua liga, suas regras</div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Nome */}
        <div>
          <Label htmlFor="name">Nome da liga</Label>
          <Input
            id="name"
            placeholder="Ex.: Liga dos Amigos"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name ? (
            <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
          ) : null}
        </div>

        {/* Descrição */}
        <div>
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea
            id="description"
            placeholder="Torneio toda sexta, buy-in leve, vale o churrasco."
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          {errors.description ? (
            <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
          ) : null}
        </div>

        {/* Bloquear check-in com débitos */}
        <Card pad="md">
          <Controller
            name="blockCheckInWithDebt"
            control={control}
            render={({ field }) => (
              <Switch
                label="Bloquear check-in com débitos"
                sub="Jogador com pagamento pendente não entra no próximo torneio"
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Card>

        {/* Caixinha % */}
        <Controller
          name="jackpotPercentage"
          control={control}
          render={({ field }) => (
            <Chips
              label="Caixinha — % do prize pool"
              options={[...JACKPOT_OPTIONS]}
              value={field.value}
              onChange={field.onChange}
              render={(o) => `${o}%`}
            />
          )}
        />
        <p className="text-xs text-muted-foreground leading-[1.45] -mt-2">
          A caixinha acumula essa fatia de cada prize pool para torneios especiais e despesas da
          liga.
        </p>

        {/* API error */}
        {createLeague.error instanceof ApiError ? (
          <p className="rounded-[var(--radius-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {createLeague.error.message}
          </p>
        ) : null}

        <div className="h-1" />

        <Button
          type="submit"
          variant="primary"
          block
          icon={Check}
          disabled={!nameValue.trim() || createLeague.isPending}
        >
          {createLeague.isPending ? 'Criando liga…' : 'Criar liga'}
        </Button>
        <Button variant="ghost" block type="button" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
      </form>
    </div>
  );
}
