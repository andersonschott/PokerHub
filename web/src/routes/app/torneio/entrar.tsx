/**
 * /torneio/entrar/:code — Landing PÚBLICA de convite de torneio (sem menus/AppShell).
 *
 * - Mostra dados do torneio (GET público por convite).
 * - Logado  → "Entrar no torneio" (self-register) → vai para a liga/torneio.
 * - Deslogado → "Entrar" / "Criar conta" com returnUrl de volta a esta página.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentByInvite, useSelfRegister } from '@/lib/api/hooks/use-tournaments';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MoneyValue } from '@/components/ui/money-value';
import { toast } from 'sonner';
import { Loader2, Calendar, DollarSign, MapPin } from 'lucide-react';

export default function EntrarTorneioRoute() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: tournament, isLoading, error } = useTournamentByInvite(code || '');
  const { mutate: selfRegister, isPending } = useSelfRegister(tournament?.id || '');

  const returnUrl = `/torneio/entrar/${code}`;

  const handleRegister = () => {
    selfRegister(undefined, {
      onSuccess: () => {
        toast.success('Você entrou no torneio!');
        navigate(tournament?.leagueId ? `/app/ligas/${tournament.leagueId}` : '/app/torneio', {
          replace: true,
        });
      },
      onError: (err) => {
        toast.error(
          err instanceof ApiError && err.message ? err.message : 'Não foi possível entrar no torneio.',
        );
      },
    });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-primary-foreground text-[18px]"
            style={{ background: 'linear-gradient(160deg,var(--gold-400),var(--gold-600))' }}
          >
            ♠
          </div>
          <span className="font-sans font-bold text-[18px]">PokerHub</span>
        </div>

        {isLoading ? (
          <Card pad="lg">
            <div className="flex justify-center py-6">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          </Card>
        ) : error || !tournament ? (
          <Card pad="lg">
            <div className="text-center space-y-3">
              <p className="text-[14px] text-muted-foreground">Convite inválido ou torneio não encontrado.</p>
              <Button variant="secondary" onClick={() => navigate('/login')}>
                Ir para o login
              </Button>
            </div>
          </Card>
        ) : (
          <Card pad="lg">
            <div className="text-center mb-4">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
                Convite para torneio
              </div>
              <h1 className="font-sans font-bold text-[22px] tracking-[-0.01em]">{tournament.name}</h1>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 space-y-3 mb-5">
              <div className="flex items-center text-sm">
                <Calendar className="mr-3 h-5 w-5 text-gold-400 shrink-0" />
                <span className="text-foreground/90 font-medium">
                  {new Date(tournament.scheduledDateTime).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              {tournament.location ? (
                <div className="flex items-center text-sm">
                  <MapPin className="mr-3 h-5 w-5 text-gold-400 shrink-0" />
                  <span className="text-foreground/90 font-medium">{tournament.location}</span>
                </div>
              ) : null}
              <div className="flex items-center text-sm">
                <DollarSign className="mr-3 h-5 w-5 text-positive shrink-0" />
                <span className="text-foreground/90 font-medium">
                  Buy-in: <MoneyValue value={tournament.buyIn} cents={false} color="none" />
                </span>
              </div>
            </div>

            {user ? (
              <div className="space-y-2">
                <Button variant="primary" block onClick={handleRegister} disabled={isPending}>
                  {isPending ? 'Entrando…' : 'Entrar no torneio'}
                </Button>
                <Button variant="ghost" block onClick={() => navigate('/app/torneio')}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[13px] text-muted-foreground text-center mb-1">
                  Entre ou crie sua conta para participar.
                </p>
                <Button
                  variant="primary"
                  block
                  onClick={() => navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)}
                >
                  Entrar
                </Button>
                <Button
                  variant="secondary"
                  block
                  onClick={() => navigate(`/cadastro?returnUrl=${encodeURIComponent(returnUrl)}`)}
                >
                  Criar conta
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
