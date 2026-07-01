/**
 * use-ticking-rest-clock — fallback REST que TICA localmente, segundo a segundo.
 *
 * O `restFallbackClock` puro é uma foto: exibe o timeRemainingSeconds do DTO e congela até o
 * próximo refetch. Sem SignalR (ex.: hub inacessível em produção), isso aparecia como timer
 * "pulando" a cada poll em vez de contar segundo a segundo. Este hook ancora a foto em
 * Date.now() no momento em que o DTO chega e projeta o restante a cada 250ms, igual à
 * projeção do clock SignalR — o timer anda sozinho entre polls.
 *
 * Só decrementa quando o torneio está InProgress (pausado/agendado ficam congelados, como no
 * restFallbackClock). Clamp em 0: a virada de nível continua vindo do servidor (SignalR ou
 * próximo poll) — o fallback nunca inventa nível.
 */
import { useEffect, useReducer, useRef } from 'react';
import { type MockClockState } from '@/features/timer/use-mock-clock';
import { TournamentStatus } from '@/lib/api/hooks/use-tournaments';
import { restFallbackClock, type RestClockInput } from './tv-projection';

/** Projeta a foto REST `base` após `elapsedSeconds` locais (pura, testável). */
export function tickRestClock(base: MockClockState, elapsedSeconds: number): MockClockState {
  if (base.paused) return base;

  const remaining = Math.max(0, Math.ceil(base.remainingSeconds - elapsedSeconds));
  let elapsedPct =
    base.levelSeconds > 0 ? Math.round((1 - remaining / base.levelSeconds) * 100) : 0;
  if (elapsedPct < 0) elapsedPct = 0;
  if (elapsedPct > 100) elapsedPct = 100;

  return { ...base, remainingSeconds: remaining, elapsedPct };
}

export function useTickingRestClock(rest: RestClockInput | null): MockClockState | null {
  const [, bump] = useReducer((x: number) => x + 1, 0);

  // Âncora local: re-ancora sempre que a "foto" REST muda (status, nível ou restante novos).
  const key = rest ? `${rest.status}|${rest.currentLevel}|${rest.timeRemainingSeconds}` : '';
  const anchorRef = useRef({ key, atMs: Date.now() });
  if (anchorRef.current.key !== key) anchorRef.current = { key, atMs: Date.now() };

  const running = rest?.status === TournamentStatus.InProgress;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(bump, 250);
    return () => clearInterval(id);
  }, [running]);

  if (!rest) return null;
  const elapsed = (Date.now() - anchorRef.current.atMs) / 1000;
  return tickRestClock(restFallbackClock(rest), elapsed);
}
