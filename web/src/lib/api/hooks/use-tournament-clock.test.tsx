import { act, renderHook, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const hub = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), invoke: vi.fn(), on: vi.fn(), onreconnecting: vi.fn(), onreconnected: vi.fn(), onclose: vi.fn(), state: 'Disconnected' }));
vi.mock('@microsoft/signalr', () => ({
  HubConnectionState: { Connected: 'Connected', Disconnected: 'Disconnected' },
  HubConnectionBuilder: class { withUrl() { return this; } withAutomaticReconnect() { return this; } build() { return hub; } },
}));
import { useTournamentClock } from './use-tournament-clock';
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); hub.state = 'Disconnected'; hub.stop.mockResolvedValue(undefined); hub.invoke.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('retenta a conexão inicial após falha e sincroniza quando recebe dados', async () => {
  hub.start.mockRejectedValueOnce(new Error('offline')).mockImplementation(async () => { hub.state = 'Connected'; });
  const { result } = renderHook(() => useTournamentClock('t1'));
  await act(async () => {});
  expect(result.current.connectionStatus).toBe('offline');
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(hub.start).toHaveBeenCalledTimes(2);
  expect(hub.invoke).toHaveBeenCalledWith('JoinTorneio','t1');
  act(() => hub.on.mock.calls[0][1]({ tournamentId:'t1', seq:1, serverInstanceId:'s1', currentLevel:2, status:'InProgress', serverNowUtc:new Date().toISOString() }));
  expect(result.current.connectionStatus).toBe('synced');
  expect(result.current.state.level).toBe(2);
});
it('cancela tentativas pendentes quando o componente sai da tela', async () => {
  hub.start.mockRejectedValue(new Error('offline'));
  const { unmount } = renderHook(() => useTournamentClock('t1'));
  await act(async () => {});
  unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(hub.start).toHaveBeenCalledTimes(1);
  expect(hub.stop).toHaveBeenCalledOnce();
});
