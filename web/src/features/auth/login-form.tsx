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

const Schema = z.object({
  email: z.email('E-mail inválido.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
});
type FormData = z.infer<typeof Schema>;

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  name: string;
  email: string;
};

export function LoginForm() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api<AuthResponse>('/auth/login', { method: 'POST', body: data }),
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
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {mutation.error instanceof ApiError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          {mutation.error.status === 401
            ? 'E-mail ou senha inválidos.'
            : `Erro ${mutation.error.status}: ${mutation.error.message}`}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Entrando…' : 'Entrar'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Primeira vez na mesa?{' '}
        <Link to="/cadastro" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
