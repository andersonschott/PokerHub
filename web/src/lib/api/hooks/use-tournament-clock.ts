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

    const url = import.meta.env.VITE_API_URL + '/hub/tournaments';
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.on('TimerStateSync', (dto: TimerStateSyncDto) => {
      // Descarta seq fora de ordem; recalcula offset apenas para o DTO aceito.
      syncRef.current = reduceSync(syncRef.current, dto, Date.now());
    });

    connection.start().then(() => {
      connection.invoke('JoinTorneio', tournamentId).catch(err => {
        console.error('Error joining tournament group:', err);
      });
    }).catch(err => console.error('SignalR start error', err));

    return () => {
      connection.stop();
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
