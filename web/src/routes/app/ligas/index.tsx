/**
 * /app/ligas — Lobby de ligas (API real).
 * Port fiel de docs/design-system/ui_kits/pokerhub_app/Lobby.jsx.
 * Seções "Organizo" / "Participo" separadas pelo organizerId === user.userId.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, LogIn, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useLeagues } from '@/lib/api/hooks/use-leagues';
import { useActiveLeague } from '@/features/leagues/league-context';
import { LeagueCard } from '@/features/leagues/league-card';
import { InviteSheet } from '@/features/leagues/invite-sheet';
import { JoinSheet } from '@/features/leagues/join-sheet';
import type { LeagueDto } from '@/lib/api/hooks/use-leagues';

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function LeagueSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 animate-ph-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[13px] bg-secondary shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 bg-secondary rounded" />
          <div className="h-3 w-1/2 bg-secondary rounded" />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <div className="h-6 w-16 bg-secondary rounded" />
        <div className="h-6 w-16 bg-secondary rounded" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route component
// ---------------------------------------------------------------------------
export default function LigasRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: leagues, isLoading, isError } = useLeagues();
  const { activeLeagueId, setActiveLeagueId } = useActiveLeague();

  const [inviteLeague, setInviteLeague] = useState<LeagueDto | null>(null);
  const [showJoin, setShowJoin] = useState(false);

  const currentUserId = user?.userId ?? '';

  const organizo = leagues?.filter((l) => l.organizerId === currentUserId) ?? [];
  const participo = leagues?.filter((l) => l.organizerId !== currentUserId) ?? [];
  const total = leagues?.length ?? 0;

  const handlePick = (league: LeagueDto) => {
    setActiveLeagueId(league.id);
    navigate(`/app/ligas/${league.id}`);
  };

  const handleAdmin = (league: LeagueDto) => {
    setActiveLeagueId(league.id);
    navigate(`/app/perfil/admin`);
  };

  const handleJoined = (leagueId: string) => {
    setActiveLeagueId(leagueId);
    navigate(`/app/ligas/${leagueId}`);
  };

  return (
    <div className="px-4 pt-[14px] pb-24 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="font-sans font-bold text-[20px] tracking-[-0.01em]">Minhas ligas</div>
          <div className="text-[12.5px] text-muted-foreground">
            {isLoading ? 'Carregando…' : `${total} liga${total !== 1 ? 's' : ''} · toque para entrar`}
          </div>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          size="sm"
          onClick={() => navigate('/app/ligas/nova')}
        >
          Criar
        </Button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-[10px]">
          <LeagueSkeleton />
          <LeagueSkeleton />
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="rounded-[var(--radius-lg)] border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          Não foi possível carregar as ligas. Verifique a conexão.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && total === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary border border-border text-[28px]">
            ♠
          </div>
          <div>
            <div className="font-sans font-semibold text-[17px] tracking-[-0.01em]">
              Nenhuma liga ainda
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Crie sua liga ou entre com um código de convite.
            </div>
          </div>
          <div className="flex flex-col w-full max-w-xs gap-2">
            <Button
              variant="primary"
              icon={Plus}
              block
              onClick={() => navigate('/app/ligas/nova')}
            >
              Criar liga
            </Button>
            <Button
              variant="outline"
              icon={LogIn}
              block
              onClick={() => setShowJoin(true)}
            >
              Entrar com código
            </Button>
          </div>
        </div>
      )}

      {/* Organizo */}
      {!isLoading && organizo.length > 0 && (
        <>
          <div className="flex items-center gap-[7px] font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-[10px]">
            <Crown className="w-[14px] h-[14px] text-gold-400" />
            Organizo
          </div>
          <div className="flex flex-col gap-[10px] mb-[22px]">
            {organizo.map((lg) => (
              <LeagueCard
                key={lg.id}
                league={lg}
                isActive={lg.id === activeLeagueId}
                currentUserId={currentUserId}
                onPick={handlePick}
                onInvite={setInviteLeague}
                onAdmin={handleAdmin}
              />
            ))}
          </div>
        </>
      )}

      {/* Participo */}
      {!isLoading && participo.length > 0 && (
        <>
          <div className="flex items-center gap-[7px] font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-[10px]">
            <Users className="w-[14px] h-[14px]" />
            Participo
          </div>
          <div className="flex flex-col gap-[10px]">
            {participo.map((lg) => (
              <LeagueCard
                key={lg.id}
                league={lg}
                isActive={lg.id === activeLeagueId}
                currentUserId={currentUserId}
                onPick={handlePick}
                onInvite={setInviteLeague}
                onAdmin={handleAdmin}
              />
            ))}
          </div>
        </>
      )}

      {/* Entrar com código — always shown when there are leagues */}
      {!isLoading && !isError && total > 0 && (
        <button
          type="button"
          onClick={() => setShowJoin(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 p-[13px] rounded-[var(--radius-md)] bg-transparent border border-dashed border-border cursor-pointer text-muted-foreground font-sans font-semibold text-[13.5px] hover:bg-secondary transition-colors"
        >
          <LogIn className="size-4" />
          Entrar em uma liga com código
        </button>
      )}

      {/* Invite sheet */}
      {inviteLeague ? (
        <InviteSheet league={inviteLeague} onClose={() => setInviteLeague(null)} />
      ) : null}

      {/* Join sheet */}
      {showJoin ? (
        <JoinSheet onClose={() => setShowJoin(false)} onJoined={handleJoined} />
      ) : null}
    </div>
  );
}
