import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { type MockClockState } from '@/features/timer/use-mock-clock';
import {
  type TimerStateSyncDto,
  type ClockSyncState,
  EMPTY_SYNC_STATE,
  LOADING_CLOCK_STATE,
  projectClock,
  reduceSync,
} from './clock-projection';

export type { TimerStateSyncDto } from './clock-projection';

/**
 * useTournamentClock — relógio fiel do torneio alimentado por SignalR.
 *
 * Blinds e duração vêm REAIS do DTO (dto.currentBlind / dto.nextBlind); não há mais
 * extrapolação mock. O estado inicial é "carregando" (LOADING_CLOCK_STATE) até o 1º sync.
 * Mensagens fora de ordem (seq <= último aceito) são descartadas — ver reduceSync.
 * A projeção por âncora (offset + clamp) roda a cada 250ms — ver projectClock.
 */
export function useTournamentClock(tournamentId: string) {
  const [state, setState] = useState<MockClockState>(LOADING_CLOCK_STATE);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const syncRef = useRef<ClockSyncState>(EMPTY_SYNC_STATE);

  useEffect(() => {
    if (!tournamentId) return;

    // Ao (re)conectar ou trocar de torneio, volta para "carregando" para não exibir o
    // relógio do torneio anterior até o 1º sync chegar.
    setState(LOADING_CLOCK_STATE);

    // Mesma base do cliente HTTP (base.ts): vazio em dev → '/hub/tournaments' (proxy Vite, ws),
    // origem da API em prod. (Antes usava VITE_API_URL, que não existe → 'undefined/hub...'.)
    const url = (import.meta.env.VITE_API_BASE_URL ?? '') + '/hub/tournaments';
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url)
      // Reconexão PERSISTENTE (nunca desiste). O padrão do SignalR só tenta ~42s e para — um
      // celular que perde a rede por minutos ficaria offline pra sempre. Backoff: 0, 2s, 5s, 10s fixo.
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) =>
          ctx.previousRetryCount === 0
            ? 0
            : ctx.previousRetryCount < 3
              ? 2000
              : ctx.previousRetryCount < 6
                ? 5000
                : 10000,
      })
      .build();

    connectionRef.current = connection;

    connection.on('TimerStateSync', (dto: TimerStateSyncDto) => {
      // Descarta seq fora de ordem; recalcula offset apenas para o DTO aceito.
      syncRef.current = reduceSync(syncRef.current, dto, Date.now());
    });

    // Rejunta o grupo e puxa o estado atual. O JoinTorneio do hub adiciona ao grupo E reenvia
    // um TimerStateSync com seq novo (NextSeq) → o reduceSync aceita e RE-ANCORA o relógio.
    // RETRY: se o invoke falhar (transiente pós-connect), sem retentar o cliente ficaria
    // conectado porém NUNCA sincronizado (preso no fallback REST — drift dashboard×TV).
    const join = async (attempt = 0): Promise<void> => {
      try {
        await connection.invoke('JoinTorneio', tournamentId);
      } catch (err) {
        console.error('Error joining tournament group:', err);
        if (attempt < 5 && connection.state === signalR.HubConnectionState.Connected) {
          setTimeout(() => void join(attempt + 1), 2000 * (attempt + 1));
        }
      }
    };

    // ZERO-DRIFT: ao reconectar o connectionId é novo e saiu do grupo no servidor → sem rejuntar,
    // o cliente nunca mais recebe sync e fica preso na âncora velha (o bug do drift de 5s que só
    // o refresh corrigia). Rejuntar aqui reenvia o estado e corrige o relógio automaticamente.
    connection.onreconnected(() => {
      void join();
    });

    connection
      .start()
      .then(() => join())
      .catch((err) => console.error('SignalR start error', err));

    // Aba volta ao foco (celular destravado / app reaberto): força um sync fresco para corrigir
    // qualquer defasagem causada por throttling de aba em background.
    const onVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        connection.state === signalR.HubConnectionState.Connected
      ) {
        void join();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void connection.stop();
      connectionRef.current = null;
      syncRef.current = EMPTY_SYNC_STATE;
    };
  }, [tournamentId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const sync = syncRef.current;
      if (!sync.dto) return;
      setState(projectClock(sync.dto, Date.now(), sync.offsetMs));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Controles manuais são acionados via mutations REST no dashboard (useNextLevel/usePrevLevel/
  // usePause/useStart). Mantidos como no-op aqui para preservar o contrato de retorno do hook.
  const togglePause = useCallback(() => {
    console.warn('togglePause not handled by useTournamentClock; use REST mutations');
  }, []);

  const nextLevel = useCallback(() => {
    console.warn('nextLevel not handled by useTournamentClock; use REST mutations');
  }, []);

  const prevLevel = useCallback(() => {
    console.warn('prevLevel not handled by useTournamentClock; use REST mutations');
  }, []);

  return {
    state,
    togglePause,
    nextLevel,
    prevLevel,
  };
}
