/**
 * /app/ligas/:leagueId — Home da liga.
 * Port de docs/design-system/ui_kits/pokerhub_app/Home.jsx.
 *
 * Header com nome/switcher REAL (useLeague).
 * Hero: torneio ao vivo mock (mockData.tournament) ou banner vazio → Criar.
 * Tabs: Torneios (lista mock + Caixinha) / Jogadores (REAL: useLeaguePlayers).
 * Variante desktop Step 5: grid 2 colunas no lg:.
 */
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronsUpDown, Settings2, CalendarPlus, Plus, CalendarClock, PiggyBank, ChevronRight, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useLeague, useLeaguePlayers } from '@/lib/api/hooks/use-leagues';
import { useActiveLeague } from '@/features/leagues/league-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/ui/section-title';
import { MoneyValue } from '@/components/ui/money-value';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/ui/icon-button';
import { StatusPill } from '@/components/ui/status-pill';
import { mockData } from '@/mocks/data';

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------
type TabKey = 'torneios' | 'jogadores';

function Segmented({
  value,
  onChange,
}: {
  value: TabKey;
  onChange: (v: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'torneios', label: 'Torneios' },
    { key: 'jogadores', label: 'Jogadores' },
  ];
  return (
    <div className="flex gap-1 bg-secondary p-1 rounded-[var(--radius-md)]">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              'flex-1 h-9 border-0 cursor-pointer rounded-[var(--radius-sm)]',
              'font-sans font-semibold text-[13px]',
              'transition-[background,color,box-shadow] duration-[var(--dur-fast,120ms)]',
              active
                ? 'bg-[var(--felt-700)] text-foreground shadow-sm'
                : 'bg-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton for league header
// ---------------------------------------------------------------------------
function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-4 animate-ph-pulse">
      <div className="w-10 h-10 rounded-[12px] bg-secondary shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 bg-secondary rounded" />
        <div className="h-3 w-1/3 bg-secondary rounded" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton for player list
// ---------------------------------------------------------------------------
function PlayerSkeleton() {
  return (
    <Card pad="md" className="animate-ph-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-secondary shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 bg-secondary rounded" />
          <div className="h-3 w-1/3 bg-secondary rounded" />
        </div>
        <div className="h-4 w-14 bg-secondary rounded" />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
export default function LeagueHomeRoute() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggle: toggleTheme, theme } = useTheme();
  const { setActiveLeagueId } = useActiveLeague();
  const [tab, setTab] = useState<TabKey>('torneios');

  const id = leagueId ?? '';
  const { data: league, isLoading: leagueLoading, isError: leagueError } = useLeague(id);
  const {
    data: players,
    isLoading: playersLoading,
  } = useLeaguePlayers(id);

  // Mock tournament data (will be replaced when the live-tournament endpoint exists)
  const t = mockData.tournament;
  const liveTournament = league ? false : false; // No live tournament endpoint yet — always show empty hero

  // Set the active league when this page loads with a valid id
  if (id) setActiveLeagueId(id);

  const isOrganizer = league?.organizerId === user?.userId;

  // Format seconds as MM:SS
  const mins = String(Math.floor(t.secondsRemaining / 60)).padStart(2, '0');
  const secs = String(t.secondsRemaining % 60).padStart(2, '0');
  const timerLabel = `${mins}:${secs}`;

  return (
    <div className="px-4 pt-[14px] pb-24">
      {/* League header */}
      {leagueLoading ? (
        <HeaderSkeleton />
      ) : leagueError || !league ? (
        <div className="mb-4 text-sm text-destructive">
          Não foi possível carregar a liga.{' '}
          <button type="button" className="underline" onClick={() => navigate('/app/ligas')}>
            Voltar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-4">
          {/* League name / switcher tap area */}
          <Link
            to="/app/ligas"
            className="flex-1 min-w-0 flex items-center gap-[10px] no-underline text-foreground"
          >
            <div
              className="w-10 h-10 rounded-[12px] shrink-0 flex items-center justify-center text-primary-foreground text-[20px]"
              style={{
                background: 'linear-gradient(160deg,var(--gold-400),var(--gold-600))',
              }}
            >
              ♠
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-[5px]">
                <span className="min-w-0 font-sans font-bold text-[17.5px] tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis">
                  {league.name}
                </span>
                <ChevronsUpDown className="w-[15px] h-[15px] text-muted-foreground shrink-0" />
              </div>
              <div className="text-xs text-muted-foreground">
                {league.isActive ? 'Temporada ativa' : 'Inativa'} · {league.playerCount} jogadores
              </div>
            </div>
          </Link>

          {/* Theme toggle */}
          <button
            type="button"
            title="Tema claro/escuro"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full shrink-0 bg-secondary border border-border flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-[var(--felt-700)] transition-colors"
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? (
              // sun icon — inline to avoid an extra import
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>

          {/* Notifications placeholder */}
          <div className="w-10 h-10 rounded-full shrink-0 bg-secondary border border-border flex items-center justify-center text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
        </div>
      )}

      {/* Live tournament hero */}
      {liveTournament ? (
        <Card
          variant="live"
          pad="md"
          interactive
          onClick={() => navigate('/app/torneio')}
          className="mb-[14px]"
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--live,var(--positive))] shrink-0 animate-ph-pulse" />
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-[14.5px] whitespace-nowrap overflow-hidden text-ellipsis">
                {t.name}
              </div>
              <div className="font-mono text-[11.5px] text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                {t.levelLabel} · {t.sb}/{t.bb} · {t.remaining}/{t.players} na mesa
              </div>
            </div>
            <span className="font-mono font-bold text-[20px] tracking-[-0.02em] shrink-0">
              {timerLabel}
            </span>
            <IconButton
              icon={Settings2}
              variant="solid"
              size="sm"
              gold
              aria-label="Operar torneio"
              title="Operar"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/app/torneio/dashboard');
              }}
              className="shrink-0"
            />
          </div>
        </Card>
      ) : (
        /* Empty hero — no live tournament */
        <Card pad="md" className="mb-[14px]">
          <div className="flex items-center gap-3">
            <div className="w-[38px] h-[38px] rounded-[12px] shrink-0 bg-secondary border border-border flex items-center justify-center">
              <CalendarPlus className="text-muted-foreground w-[18px] h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-[14px]">
                Nenhum torneio em andamento
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Crie o próximo e chame a galera.
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/app/torneio/novo')}
              className="shrink-0"
            >
              Criar
            </Button>
          </div>
        </Card>
      )}

      {/* Tab segmented control */}
      <Segmented value={tab} onChange={setTab} />
      <div className="h-[14px]" />

      {/* Tab: Torneios */}
      {tab === 'torneios' && (
        <div className="flex flex-col gap-[10px]">
          {/* Desktop: 2-column layout on lg */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
            {/* Left column: upcoming + caixinha + realizados */}
            <div className="flex flex-col gap-[10px]">
              <SectionTitle icon={CalendarClock}>Próximos</SectionTitle>

              {mockData.upcoming.map((u, i) => (
                <Card key={i} interactive pad="md">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-semibold text-[15px]">{u.name}</span>
                        {u.status === 'live' ? <StatusPill status="live" dot /> : null}
                      </div>
                      <div className="text-[12.5px] text-muted-foreground mt-0.5">
                        {u.when} · {u.confirmed} confirmados
                      </div>
                    </div>
                    <Badge tone="neutral">R$ {u.buyIn}</Badge>
                    <ChevronRight className="text-muted-foreground w-4 h-4" />
                  </div>
                </Card>
              ))}

              {/* Caixinha shortcut */}
              {league ? (
                <Card
                  interactive
                  pad="md"
                  onClick={() => navigate('/app/perfil/caixinha')}
                >
                  <div className="flex items-center gap-3">
                    <PiggyBank className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-sans font-semibold text-[15px]">Caixinha da liga</div>
                      <div className="text-[12.5px] text-muted-foreground mt-0.5">
                        {league.jackpotPercentage}% de cada prize pool · despesas da liga
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[14.5px] text-gold-400 whitespace-nowrap shrink-0">
                      R$ {mockData.caixinha.balance.toLocaleString('pt-BR')}
                    </span>
                    <ChevronRight className="text-muted-foreground w-4 h-4" />
                  </div>
                </Card>
              ) : null}

              <div className="h-[10px]" />

              {/* Realizados (mock) */}
              <SectionTitle icon={CalendarClock}>Realizados</SectionTitle>
              {mockData.history.map((h) => (
                <Card
                  key={h.id}
                  interactive
                  pad="md"
                  onClick={() =>
                    navigate(`/app/torneio/historico/${h.id}`)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-sans font-semibold text-[14px] whitespace-nowrap overflow-hidden text-ellipsis">
                        {h.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {h.date} · {h.players} jogadores · campeão{' '}
                        {h.podium[0]?.name ?? '—'}
                      </div>
                    </div>
                    <MoneyValue value={h.prizePool} cents={false} size="13px" />
                    <ChevronRight className="text-muted-foreground w-4 h-4" />
                  </div>
                </Card>
              ))}
            </div>

            {/* Right column (desktop): next tournament + acerto rápido placeholder */}
            <div className="hidden lg:flex flex-col gap-[10px]">
              <SectionTitle icon={CalendarClock}>Próximo torneio</SectionTitle>
              {mockData.upcoming[0] ? (
                <Card pad="md">
                  <div className="font-sans font-semibold text-[16px]">
                    {mockData.upcoming[0].name}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {mockData.upcoming[0].when} · {mockData.upcoming[0].confirmed}{' '}
                    confirmados
                  </div>
                  <div className="mt-3">
                    <Badge tone="neutral">
                      R$ {mockData.upcoming[0].buyIn}
                    </Badge>
                  </div>
                </Card>
              ) : (
                <Card pad="md">
                  <div className="text-sm text-muted-foreground">
                    Nenhum torneio agendado.
                  </div>
                  {isOrganizer ? (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      className="mt-3"
                      onClick={() => navigate('/app/torneio/novo')}
                    >
                      Criar torneio
                    </Button>
                  ) : null}
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Jogadores (REAL) */}
      {tab === 'jogadores' && (
        <div className="flex flex-col gap-2">
          <SectionTitle icon={Users}>
            {league ? `${league.playerCount} jogadores` : 'Jogadores'}
          </SectionTitle>

          {playersLoading && (
            <>
              <PlayerSkeleton />
              <PlayerSkeleton />
              <PlayerSkeleton />
            </>
          )}

          {!playersLoading && players && players.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Nenhum jogador ainda.
              {isOrganizer ? ' Compartilhe o código de convite.' : ''}
            </div>
          )}

          {!playersLoading &&
            players &&
            players.map((p, idx) => (
              <Card key={p.id} pad="md">
                {/* Desktop: table row on lg */}
                <div className="flex items-center gap-3">
                  <Avatar
                    name={p.name}
                    podium={idx < 3 ? (['gold', 'silver', 'bronze'] as const)[idx] : undefined}
                    badge={idx < 3 ? String(idx + 1) : undefined}
                    badgeGold={idx === 0}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-[15px]">
                      {p.name}
                      {p.nickname ? (
                        <span className="text-muted-foreground font-normal text-sm ml-1">
                          @{p.nickname}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.tournamentsPlayed} torneio{p.tournamentsPlayed !== 1 ? 's' : ''} ·{' '}
                      {p.wins} vitória{p.wins !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <MoneyValue value={p.totalProfit} signed size="15px" />
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
