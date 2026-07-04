import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTransferOwnership } from './use-leagues';

const fetchMock = vi.fn<typeof fetch>();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useTransferOwnership', () => {
  it('calls POST /api/leagues/{id}/transfer-ownership with the target user id', async () => {
    localStorage.setItem('ph.token', 'tok-123');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Propriedade transferida.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTransferOwnership('league-1'), { wrapper });

    act(() => {
      result.current.mutate('user-target-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/leagues/league-1/transfer-ownership');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok-123',
    });
    expect(JSON.parse(String(options?.body))).toEqual({ newOrganizerUserId: 'user-target-1' });
    expect(result.current.data).toEqual({ message: 'Propriedade transferida.' });
  });

  it('surfaces conflict responses as mutation errors', async () => {
    localStorage.setItem('ph.token', 'tok-123');
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'O novo dono precisa ser um membro ativo da liga.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTransferOwnership('league-1'), { wrapper });

    act(() => {
      result.current.mutate('user-outsider');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});
