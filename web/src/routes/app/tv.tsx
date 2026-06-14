/**
 * /app/tv — Timer TV mode (fullscreen, legível a 3m).
 * Port fiel do TimerTV.jsx do kit.
 *
 * - Fullscreen API no mount (com fallback silencioso).
 * - Landscape 3 colunas (prêmios · timer gigante + blinds · jogadores/stats).
 * - ≤900px colapsa painéis laterais (phone propped on the table).
 * - ESC/botão sair → /app/torneio.
 * - useMockClock para manter o mesmo estado que o timer mobile.
 *   Na Fase 4 será trocado por SignalR sem mudar o layout.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minimize2, Loader2 } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { StatusPill } from '@/components/ui/status-pill';
import { MoneyValue } from '@/components/ui/money-value';
import { useMockClock, fmtTime } from '@/features/timer/use-mock-clock';
import { useTournamentByInvite } from '@/lib/api/hooks/use-tournaments';
import { mockData } from '@/mocks/data';

// ---------------------------------------------------------------------------
// Panel helper
// ---------------------------------------------------------------------------

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div
        className="font-sans font-semibold text-[18px] uppercase tracking-[0.18em] text-muted-foreground pb-3"
        style={{ borderBottom: '1px solid var(--border)' } as CSSProperties}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timer TV
// ---------------------------------------------------------------------------

export default function TvRoute() {
  const navigate = useNavigate();
  const { inviteCode } = useParams<{ inviteCode: string }>();

  // Fetch from API using public invite code endpoint
  const { data: tReal, isLoading, error } = useTournamentByInvite(inviteCode ?? '');

  const { state } = useMockClock();
  const { level, remainingSeconds, paused, blinds, nextBlinds } = state;
  
  // TODO: Use real API data when fully connected
  const t = tReal ? {
    ...tReal,
    prizePool: tReal.prizePool ?? 0,
    remaining: tReal.players?.filter(p => !p.position).length ?? 0,
    players: tReal.players?.length ?? 0,
    rebuys: 0,
    addons: 0,
  } : mockData.tournament;

  const prizes = mockData.prizes;
  const table = mockData.table;

  // Responsive — collapse side panels on narrow viewports (≤900px).
  const [compact, setCompact] = useState(
    () => window.matchMedia('(max-width: 900px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fullscreen API — best-effort, silent on error.
  useEffect(() => {
    const el = document.documentElement;
    if (!document.fullscreenEnabled) return;
    void el.requestFullscreen().catch(() => {});
    return () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // ESC keyboard shortcut → exit TV.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        navigate('/app/torneio');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  function handleExit() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    navigate('/app/torneio');
  }

  const eliminated = table
    .filter((p) => p.status === 'out')
    .sort((a, b) => (a.place ?? 99) - (b.place ?? 99));

  const podiumColors = [
    'var(--podium-gold)',
    'var(--podium-silver)',
    'var(--podium-bronze)',
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--tv-bg)] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !tReal) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-[var(--tv-bg)] text-muted-foreground">
        <p>Torneio não encontrado ou acesso inválido.</p>
        <button onClick={handleExit} className="underline hover:text-foreground">Voltar</button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden text-foreground"
      style={{
        background: paused ? 'var(--tv-paused-bg)' : 'var(--tv-bg)',
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '1fr 1.6fr 1fr',
        gridTemplateRows: compact ? 'auto 1fr auto' : 'auto 1fr',
        gap: compact ? '20px' : '40px',
        padding: compact
          ? '20px 20px calc(20px + var(--safe-bottom, 0px))'
          : '36px 48px',
        transition: 'background var(--dur-slow, 320ms)',
      } as CSSProperties}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header — full width                                                */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex items-center justify-between gap-3 pb-3.5 md:pb-[18px]"
        style={{
          gridColumn: '1 / -1',
          borderBottom: '1px solid var(--border)',
        } as CSSProperties}
      >
        {/* Logo + tournament name */}
        <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
          <div
            className="shrink-0 rounded-xl md:rounded-[12px] flex items-center justify-center text-primary-foreground"
            style={{
              width: compact ? 36 : 44,
              height: compact ? 36 : 44,
              background: 'linear-gradient(160deg, var(--gold-400), var(--gold-600))',
              fontSize: compact ? 19 : 24,
            } as CSSProperties}
          >
            ♠
          </div>
          <div
            className="font-sans font-bold tracking-[-0.02em] whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ fontSize: compact ? 19 : 30 } as CSSProperties}
          >
            {t.name}
          </div>
        </div>

        {/* Status + exit */}
        <div className="flex items-center shrink-0" style={{ gap: compact ? 10 : 20 } as CSSProperties}>
          <StatusPill status={paused ? 'paused' : 'live'} />
          <IconButton
            icon={Minimize2}
            aria-label="Sair do modo TV"
            variant="solid"
            onClick={handleExit}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Left panel — prizes (desktop only)                                */}
      {/* ------------------------------------------------------------------ */}
      {!compact && (
        <Panel title="Premiação">
          {/* Prize pool hero */}
          <div
            className="rounded-[20px] p-6 text-center"
            style={{
              background:
                'linear-gradient(150deg, color-mix(in oklab, var(--emerald-500) 12%, transparent), transparent)',
              border:
                '1px solid color-mix(in oklab, var(--emerald-500) 28%, transparent)',
            } as CSSProperties}
          >
            <div className="text-base text-muted-foreground uppercase tracking-[0.1em] mb-1">
              Prize pool
            </div>
            <MoneyValue value={t.prizePool} cents={false} color="none" size="46px" />
          </div>

          {/* Per-position prizes */}
          {prizes.map((p) => {
            const ring = podiumColors[p.position - 1] ?? 'var(--secondary)';
            return (
              <div
                key={p.position}
                className="flex items-center gap-4 px-[18px] py-4 rounded-2xl bg-card"
                style={{ border: '1px solid var(--border)' } as CSSProperties}
              >
                <span
                  className="shrink-0 rounded-xl flex items-center justify-center font-mono font-bold text-[20px]"
                  style={{
                    width: 44,
                    height: 44,
                    background: ring,
                    color: 'var(--felt-950)',
                  } as CSSProperties}
                >
                  {p.position}º
                </span>
                <div className="flex-1">
                  <MoneyValue value={p.amount} cents={false} color="none" size="26px" />
                </div>
                <span className="font-mono text-[17px] text-muted-foreground">
                  {p.pct}%
                </span>
              </div>
            );
          })}
        </Panel>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Center — timer dominante                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex flex-col items-center justify-center gap-2 relative min-w-0"
        style={{ containerType: 'inline-size' } as CSSProperties}
      >
        {/* Suit watermark */}
        <div
          aria-hidden
          className="absolute pointer-events-none select-none font-serif opacity-[0.025]"
          style={{
            fontSize: 'min(110cqi, 520px)',
            color: 'var(--suit-dark)',
          } as CSSProperties}
        >
          ♠
        </div>

        {/* Level label */}
        <div
          className="font-sans font-bold uppercase tracking-[0.3em] text-emerald-400"
          style={{ fontSize: 'clamp(18px, 5cqi, 28px)' } as CSSProperties}
        >
          Nível {level}
        </div>

        {/* Countdown */}
        <div
          className="font-mono font-bold tabular-nums whitespace-nowrap leading-[0.9] tracking-[-0.04em]"
          style={{
            fontSize: 'clamp(72px, 33cqi, 240px)',
            color: paused ? 'var(--warning)' : 'var(--foreground)',
          } as CSSProperties}
        >
          {fmtTime(remainingSeconds)}
        </div>

        {/* Current blinds */}
        <div
          className="font-mono font-bold text-gold-400 whitespace-nowrap tracking-[-0.02em] mt-2"
          style={{ fontSize: 'clamp(32px, 14cqi, 96px)' } as CSSProperties}
        >
          {blinds.sb} / {blinds.bb}
        </div>

        {/* Ante + next level */}
        <div
          className="font-mono whitespace-nowrap text-muted-foreground"
          style={{ fontSize: 'clamp(15px, 3.6cqi, 26px)' } as CSSProperties}
        >
          ante {blinds.ante} · próximo {nextBlinds.sb}/{nextBlinds.bb}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right panel — players + stats (desktop only)                      */}
      {/* ------------------------------------------------------------------ */}
      {!compact && (
        <Panel title="Mesa">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { v: `${t.remaining}/${t.players}`, l: 'Jogadores' },
              { v: t.rebuys, l: 'Rebuys' },
              { v: t.addons, l: 'Add-ons' },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 text-center bg-card"
                style={{ border: '1px solid var(--border)' } as CSSProperties}
              >
                <div className="font-mono font-bold tracking-[-0.02em] text-[38px] leading-none">
                  {s.v}
                </div>
                <div className="text-[14px] text-muted-foreground uppercase tracking-[0.06em] mt-1">
                  {s.l}
                </div>
              </div>
            ))}
            <div
              className="rounded-2xl p-5 text-center bg-card"
              style={{ border: '1px solid var(--border)' } as CSSProperties}
            >
              <div className="font-mono font-bold tracking-[-0.02em] text-[38px] leading-none">
                <MoneyValue value={t.buyIn} cents={false} size="38px" />
              </div>
              <div className="text-[14px] text-muted-foreground uppercase tracking-[0.06em] mt-1">
                Buy-in
              </div>
            </div>
          </div>

          {/* Eliminations list */}
          <div
            className="rounded-2xl p-5 flex-1 bg-card"
            style={{ border: '1px solid var(--border)' } as CSSProperties}
          >
            <div className="text-[14px] text-muted-foreground uppercase tracking-[0.06em] mb-3">
              Eliminações
            </div>
            <div className="flex flex-col gap-2.5">
              {eliminated.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[18px] text-muted-foreground w-[34px]">
                    {p.place}º
                  </span>
                  <span className="font-sans font-semibold text-[19px]">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Compact footer — essentials under timer (phone/narrow)            */}
      {/* ------------------------------------------------------------------ */}
      {compact && (
        <div
          className="flex items-center justify-center gap-6 pb-2 font-mono text-[15px] text-muted-foreground whitespace-nowrap"
        >
          <span>
            {t.remaining}/{t.players} na mesa
          </span>
          <span className="text-emerald-400">
            <MoneyValue value={t.prizePool} cents={false} color="none" className="text-emerald-400" />{' '}pool
          </span>
        </div>
      )}
    </div>
  );
}
