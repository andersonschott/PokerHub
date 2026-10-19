import { useState, useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { type MockClockState } from '@/features/timer/use-mock-clock';
import { type TimerStateSyncDto, type ClockSyncState, EMPTY_SYNC_STATE, LOADING_CLOCK_STATE, projectClock, reduceSync } from './clock-projection';
export type { TimerStateSyncDto } from './clock-projection';
export type ClockConnectionStatus = 'connecting' | 'synced' | 'offline';

export function useTournamentClock(tournamentId: string) {
  const [state, setState] = useState<MockClockState>(LOADING_CLOCK_STATE);
  const [connectionStatus, setConnectionStatus] = useState<ClockConnectionStatus>('connecting');
  const syncRef = useRef<ClockSyncState>(EMPTY_SYNC_STATE);

  useEffect(() => {
    syncRef.current = EMPTY_SYNC_STATE;
    setState(LOADING_CLOCK_STATE);
    setConnectionStatus('connecting');
    if (!tournamentId) return;
    let disposed = false;
    let lastSync = 0;
    let attempts = 0;
    const pending = new Set<ReturnType<typeof setTimeout>>();
    const later = (action: () => void, ms: number) => {
      const id = setTimeout(() => { pending.delete(id); if (!disposed) action(); }, ms);
      pending.add(id);
    };
    const connection = new signalR.HubConnectionBuilder()
      .withUrl((import.meta.env.VITE_API_BASE_URL ?? '') + '/hub/tournaments')
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: ctx => Math.min(1000 * 2 ** Math.min(ctx.previousRetryCount, 4), 10000) })
      .build();
    connection.on('TimerStateSync', (dto: TimerStateSyncDto) => {
      if (disposed || dto.tournamentId !== tournamentId) return;
      const next = reduceSync(syncRef.current, dto, Date.now());
      if (next === syncRef.current) return;
      syncRef.current = next;
      lastSync = Date.now();
      setConnectionStatus('synced');
      setState(projectClock(dto, lastSync, next.offsetMs));
    });
    const join = async (): Promise<void> => {
      if (disposed || connection.state !== signalR.HubConnectionState.Connected) return;
      try { await connection.invoke('JoinTorneio', tournamentId); }
      catch {
        if (!disposed) { setConnectionStatus('offline'); later(() => void join(), 2000); }
      }
    };
    const start = async (): Promise<void> => {
      if (disposed || connection.state !== signalR.HubConnectionState.Disconnected) return;
      setConnectionStatus(attempts ? 'offline' : 'connecting');
      try {
        await connection.start();
        if (disposed) { await connection.stop(); return; }
        attempts = 0;
        await join();
      } catch {
        if (!disposed) {
          setConnectionStatus('offline');
          later(() => void start(), Math.min(1000 * 2 ** Math.min(attempts++, 4), 10000));
        }
      }
    };
    connection.onreconnecting(() => { if (!disposed) setConnectionStatus('offline'); });
    connection.onreconnected(() => { if (!disposed) void join(); });
    connection.onclose(() => { if (!disposed) { setConnectionStatus('offline'); later(() => void start(), 2000); } });
    void start();
    const requestSync = () => {
      if (connection.state === signalR.HubConnectionState.Connected) void join();
      else if (connection.state === signalR.HubConnectionState.Disconnected) void start();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') requestSync(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', requestSync);
    const heartbeat = setInterval(() => {
      if (lastSync && Date.now() - lastSync > 15000) { setConnectionStatus('offline'); requestSync(); }
    }, 5000);
    return () => {
      disposed = true;
      clearInterval(heartbeat);
      pending.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', requestSync);
      void connection.stop();
    };
  }, [tournamentId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const sync = syncRef.current;
      if (sync.dto) setState(projectClock(sync.dto, Date.now(), sync.offsetMs));
    }, 250);
    return () => clearInterval(interval);
  }, []);
  // The dashboard invokes its authenticated REST mutations for these controls.
  const togglePause = useCallback(() => {}, []);
  const nextLevel = useCallback(() => {}, []);
  const prevLevel = useCallback(() => {}, []);
  return { state, connectionStatus, togglePause, nextLevel, prevLevel };
}
