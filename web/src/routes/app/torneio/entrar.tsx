import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentByInvite, useSelfRegister } from '@/lib/api/hooks/use-tournaments';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Calendar, DollarSign, MapPin } from 'lucide-react';
import { MoneyValue } from '@/components/ui/money-value';

export default function EntrarTorneioRoute() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const { data: tournament, isLoading, error } = useTournamentByInvite(code || '');
  const { mutate: selfRegister, isPending } = useSelfRegister(tournament?.id || '');

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <p className="text-muted-foreground">Convite inválido ou torneio não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/app')}>Voltar para início</Button>
      </div>
    );
  }

  const handleRegister = () => {
    selfRegister(undefined, {
      onSuccess: () => {
        toast.success('Você entrou no torneio com sucesso!');
        navigate(tournament.leagueId ? `/app/ligas/${tournament.leagueId}` : '/app/torneio');
      },
      onError: (err) => {
        toast.error('Erro ao entrar no torneio.');
        console.error(err);
      }
    });
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card pad="lg" className="w-full max-w-md shadow-lg border-primary/20 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">
            Convite para Torneio
          </h1>
          <p className="text-lg font-medium text-foreground">
            {tournament.name}
          </p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center text-sm">
            <Calendar className="mr-3 h-5 w-5 text-gold-400" />
            <span className="text-foreground/90 font-medium">
              {new Date(tournament.scheduledDateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
          {tournament.location ? (
            <div className="flex items-center text-sm">
              <MapPin className="mr-3 h-5 w-5 text-gold-400" />
              <span className="text-foreground/90 font-medium">{tournament.location}</span>
            </div>
          ) : null}
          <div className="flex items-center text-sm">
            <DollarSign className="mr-3 h-5 w-5 text-positive" />
            <span className="text-foreground/90 font-medium">
              Buy-in: <MoneyValue value={tournament.buyIn} cents={false} color="none" />
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button 
            variant="primary"
            className="w-full h-12 text-[15px] font-semibold transition-transform hover:scale-[1.02]" 
            onClick={handleRegister}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Entrar no Torneio
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate('/app')}>
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
}
