import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Schema = z
  .object({
    name: z.string().min(2, 'Nome é obrigatório.'),
    email: z.email('E-mail inválido.'),
    password: z.string().min(6, 'Mínimo de 6 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof Schema>;

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
};

/** Extrai as mensagens do ValidationProblem do Identity ({errors: {register: [...]}}). */
function identityErrors(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const details = err.details as { errors?: { register?: string[] } } | undefined;
  return details?.errors?.register?.join(' ') ?? null;
}

export function RegisterForm() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { name: data.name, email: data.email, password: data.password },
      }),
    onSuccess: (resp) => {
      setSession(resp.accessToken, resp.refreshToken, {
        userId: resp.userId,
        name: resp.name,
        email: resp.email,
      });
      navigate('/app', { replace: true });
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
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
        {mutation.isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem cadeira na mesa?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
