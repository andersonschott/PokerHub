import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { useResetPassword } from '@/lib/api/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Schema = z
  .object({
    password: z.string().min(6, 'Mínimo de 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof Schema>;

/** Extrai as mensagens do ValidationProblem do reset ({errors: {resetPassword: [...]}}). */
function identityErrors(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const details = err.details as { errors?: { resetPassword?: string[] } } | undefined;
  return details?.errors?.resetPassword?.join(' ') ?? null;
}

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const code = params.get('code') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const mutation = useResetPassword();

  if (!email || !code) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Link inválido ou incompleto. Solicite um novo link de redefinição.
        </p>
        <Link to="/recuperar-senha" className="font-medium text-primary hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((d) =>
        mutation.mutate(
          { email, code, newPassword: d.password },
          {
            onSuccess: () => {
              toast.success('Senha redefinida! Faça login com a nova senha.');
              navigate('/login', { replace: true });
            },
          },
        ),
      )}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {mutation.error instanceof ApiError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {identityErrors(mutation.error) ??
            `Erro ${mutation.error.status}: ${mutation.error.message}`}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Redefinindo…' : 'Redefinir senha'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
