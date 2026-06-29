import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForgotPassword, useResetPassword } from './use-auth';

const fetchMock = vi.fn<typeof fetch>();

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('useForgotPassword', () => {
  it('POSTs /api/auth/forgot-password with the email', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() });

    act(() => result.current.mutate({ email: 'a@b.com' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/auth/forgot-password');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({ email: 'a@b.com' });
  });
});

describe('useResetPassword', () => {
  it('POSTs /api/auth/reset-password with email, code and newPassword', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() });

    act(() => result.current.mutate({ email: 'a@b.com', code: 'XYZ', newPassword: 'Nova123!' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/auth/reset-password');
    expect(JSON.parse(String(options?.body))).toEqual({
      email: 'a@b.com', code: 'XYZ', newPassword: 'Nova123!',
    });
  });
});
