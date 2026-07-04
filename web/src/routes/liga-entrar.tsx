/**
 * /liga/entrar/:inviteCode — Landing PÚBLICA de convite de liga (sem menus/AppShell).
 *
 * Espelha o Blazor Liga/Join.razor:
 *  - Mostra dados básicos da liga (GET público por convite).
 *  - Logado  → "Entrar na liga" (POST join) → vai para a liga.
 *  - Deslogado → "Entrar" / "Criar conta" levando de volta a esta página (returnUrl).
 */
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Trophy, UserRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useLeagueByInvite, useJoinLeague } from '@/lib/api/hooks/use-leagues';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LigaEntrarRoute() {
  const { inviteCode = '' } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: league, isLoading, isError } = useLeagueByInvite(inviteCode);
  const joinMut = useJoinLeague();

  const returnUrl = `/liga/entrar/${inviteCode}`;

  const join = () => {
    if (!league) return;
    joinMut.mutate(inviteCode, {
      onSuccess: (resp) => {
        toast.success(resp.message || 'Você entrou na liga!');
        navigate(`/app/ligas/${resp.id}`, { replace: true });
      },
      onError: (err) => {
        // 409 = já é membro → leva direto para a liga.
        if (err instanceof ApiError && err.status === 409) {
          toast.info('Você já participa desta liga.');
          navigate(`/app/ligas/${league.id}`, { replace: true });
          return;
        }
        toast.error('Não foi possível entrar na liga.');
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
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            </div>
          </Card>
        ) : isError || !league ? (
          <Card pad="lg">
            <div className="text-center space-y-3">
              <p className="text-[14px] text-muted-foreground">Convite inválido ou liga não encontrada.</p>
              <Button variant="secondary" onClick={() => navigate('/login')}>
                Ir para o login
              </Button>
            </div>
          </Card>
        ) : (
          <Card pad="lg">
            <div className="text-center mb-4">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
                Convite para liga
              </div>
              <h1 className="font-sans font-bold text-[22px] tracking-[-0.01em]">{league.name}</h1>
              {league.description ? (
                <p className="text-[13px] text-muted-foreground mt-1">{league.description}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-5 text-[13px] text-muted-foreground mb-5">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <UserRound className="w-4 h-4 shrink-0" />
                <span className="truncate">{league.organizerName}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {league.playerCount}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                {league.tournamentCount}
              </span>
            </div>

            {user ? (
              <Button variant="primary" block onClick={join} disabled={joinMut.isPending}>
                {joinMut.isPending ? 'Entrando…' : 'Entrar na liga'}
              </Button>
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
