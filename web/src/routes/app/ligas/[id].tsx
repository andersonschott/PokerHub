/**
 * /app/ligas/:leagueId — Home da liga.
 * Port de docs/design-system/ui_kits/pokerhub_app/Home.jsx.
 *
 * Header com nome/switcher REAL (useLeague).
 * Hero: torneio ao vivo mock (mockData.tournament) ou banner vazio → Criar.
 * Tabs: Torneios (lista mock + Caixinha) / Jogadores (REAL: useLeaguePlayers).
 * Variante desktop Step 5: grid 2 colunas no lg:.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronsUpDown, Settings2, CalendarPlus, Plus, CalendarClock, PiggyBank, ChevronRight, Users, Sun, Moon, Bell, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useLeague, useLeaguePlayers } from '@/lib/api/hooks/use-leagues';
import { useActiveSeason, useSeasonRanking } from '@/lib/api/hooks/use-seasons';
import { useTournaments, TournamentStatus } from '@/lib/api/hooks/use-tournaments';
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
type TabKey = 'torneios' | 'jogadores' | 'ranking';

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
    { key: 'ranking', label: 'Ranking' },
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

  const { data: activeSeason, isLoading: seasonLoading } = useActiveSeason(id);
  const { data: rankingData, isLoading: rankingLoading } = useSeasonRanking(activeSeason?.id ?? '');

  const { data: allTournaments, isLoading: toursLoading } = useTournaments(id);
  const upcoming = allTournaments?.filter(t => t.status === TournamentStatus.Scheduled || t.status === TournamentStatus.InProgress) ?? [];
  const history = allTournaments?.filter(t => t.status === TournamentStatus.Finished || t.status === TournamentStatus.Cancelled) ?? [];

  // Mock tournament data (will be replaced when the live-tournament endpoint exists)
  const t = mockData.tournament;
  const liveTournament = league ? false : false; // No live tournament endpoint yet — always show empty hero

  // Set the active league when this page loads with a valid id
  useEffect(() => {
    if (id) setActiveLeagueId(id);
  }, [id, setActiveLeagueId]);

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
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
          </button>

          {/* Notifications placeholder */}
          <div className="w-10 h-10 rounded-full shrink-0 bg-secondary border border-border flex items-center justify-center text-muted-foreground">
            <Bell className="w-[18px] h-[18px]" />
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

              {toursLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
              {upcoming.length === 0 && !toursLoading && <div className="text-sm text-muted-foreground">Nenhum torneio próximo.</div>}
              {upcoming.map((u) => (
                <Card key={u.id} interactive pad="md">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-semibold text-[15px]">{u.name}</span>
                        {u.status === TournamentStatus.InProgress ? <StatusPill status="live" dot /> : null}
                      </div>
                      <div className="text-[12.5px] text-muted-foreground mt-0.5">
                        {new Date(u.scheduledDateTime).toLocaleString('pt-BR')} · {u.playerCount} confirmados
                      </div>
                    </div>
                    <Badge tone="neutral"><MoneyValue value={u.buyIn} cents={false} color="none" /></Badge>
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
                    <MoneyValue value={mockData.caixinha.balance} cents={false} size="14.5px" />
                    <ChevronRight className="text-muted-foreground w-4 h-4" />
                  </div>
                </Card>
              ) : null}

              <div className="h-[10px]" />

              {/* Realizados (mock) */}
              <SectionTitle icon={CalendarClock}>Realizados</SectionTitle>
              {toursLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
              {history.length === 0 && !toursLoading && <div className="text-sm text-muted-foreground">Nenhum torneio finalizado.</div>}
              {history.map((h) => (
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
                        {new Date(h.scheduledDateTime).toLocaleDateString('pt-BR')} · {h.playerCount} jogadores
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
              {upcoming[0] ? (
                <Card pad="md">
                  <div className="font-sans font-semibold text-[16px]">
                    {upcoming[0].name}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {new Date(upcoming[0].scheduledDateTime).toLocaleString('pt-BR')} · {upcoming[0].playerCount} confirmados
                  </div>
                  <div className="mt-3">
                    <Badge tone="neutral"><MoneyValue value={upcoming[0].buyIn} cents={false} color="none" /></Badge>
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
          <div className="flex items-center justify-between">
            <SectionTitle icon={Users}>
              {league ? `${league.playerCount} jogadores` : 'Jogadores'}
            </SectionTitle>
            {isOrganizer ? (
              <Button
                variant="outline"
                size="sm"
                icon={Settings2}
                onClick={() => navigate(`/app/ligas/${id}/jogadores`)}
              >
                Gerenciar
              </Button>
            ) : null}
          </div>

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

          {/* Mobile cards (hidden on lg) */}
          {!playersLoading && players && (
            <div className="flex flex-col gap-2 lg:hidden">
              {players.map((p, idx) => (
                <Card key={p.id} pad="md">
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

          {/* Desktop table (visible only on lg+) */}
          {!playersLoading && players && players.length > 0 && (
            <div className="hidden lg:block">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-12">#</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jogador</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Torneios</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vitórias</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, idx) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`font-mono font-bold text-[13px] ${idx === 0 ? 'text-gold-400' : 'text-muted-foreground'}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={p.name}
                            podium={idx < 3 ? (['gold', 'silver', 'bronze'] as const)[idx] : undefined}
                            badge={idx < 3 ? String(idx + 1) : undefined}
                            badgeGold={idx === 0}
                          />
                          <div className="min-w-0">
                            <div className="font-sans font-semibold text-[14px] leading-tight">{p.name}</div>
                            {p.nickname ? (
                              <div className="text-xs text-muted-foreground">@{p.nickname}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[13px] text-muted-foreground">{p.tournamentsPlayed}</td>
                      <td className="py-3 px-3 text-right font-mono text-[13px] text-muted-foreground">{p.wins}</td>
                      <td className="py-3 px-3 text-right">
                        <MoneyValue value={p.totalProfit} signed size="14px" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Ranking (REAL via active season) */}
      {tab === 'ranking' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <SectionTitle icon={Trophy}>Ranking da temporada</SectionTitle>
            {isOrganizer ? (
              <Button
                variant="outline"
                size="sm"
                icon={Settings2}
                onClick={() => navigate(`/app/ligas/${id}/temporadas`)}
              >
                Gerenciar
              </Button>
            ) : null}
          </div>

          {seasonLoading || rankingLoading ? (
            <PlayerSkeleton />
          ) : !activeSeason ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma temporada ativa.
              {isOrganizer ? ' Inicie uma nova temporada para contabilizar pontos.' : ''}
            </div>
          ) : rankingData?.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Nenhum torneio finalizado na temporada atual.
            </div>
          ) : (
            rankingData?.map((r, idx) => (
              <Card key={r.playerId} pad="md">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={r.playerName}
                    podium={idx < 3 ? (['gold', 'silver', 'bronze'] as const)[idx] : undefined}
                    badge={idx < 3 ? String(idx + 1) : undefined}
                    badgeGold={idx === 0}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-[15px]">{r.playerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.totalPoints} pts · {r.tournamentsPlayed} torneio{r.tournamentsPlayed !== 1 ? 's' : ''} · ITM {r.itmCount > 0 ? Math.round((r.itmCount / r.tournamentsPlayed) * 100) : 0}%
                    </div>
                  </div>
                  <MoneyValue value={r.totalProfit} signed size="15px" />
                </div>
              </Card>
            ))
          )}

          <Link
            to={`/app/ranking?leagueId=${id}&seasonId=${activeSeason?.id ?? ''}`}
            className="mt-2 flex items-center justify-center gap-2 h-10 rounded-[var(--radius-md)] border border-border text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:border-[var(--ring)] transition-colors no-underline"
          >
            <Trophy className="w-4 h-4" />
            Ver ranking completo
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
