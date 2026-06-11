import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth-context';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AuthProvider', () => {
  it('hidrata sessão válida do localStorage', () => {
    localStorage.setItem('ph.token', 'tok');
    localStorage.setItem('ph.refresh_token', 'ref');
    localStorage.setItem(
      'ph.user',
      JSON.stringify({ userId: 'u1', name: 'Anderson', email: 'a@a.com' }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ userId: 'u1', name: 'Anderson', email: 'a@a.com' });
  });

  it('ignora user corrompido no localStorage', () => {
    localStorage.setItem('ph.token', 'tok');
    localStorage.setItem('ph.user', '{nao-e-json');

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
  });

  it('setSession persiste e autentica', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.setSession('tok', 'ref', {
        userId: 'u1',
        name: 'Anderson',
        email: 'a@a.com',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('ph.token')).toBe('tok');
    expect(localStorage.getItem('ph.refresh_token')).toBe('ref');
    expect(JSON.parse(localStorage.getItem('ph.user')!)).toEqual({
      userId: 'u1',
      name: 'Anderson',
      email: 'a@a.com',
    });
  });

  it('clear limpa a sessão e revoga o refresh token (best-effort)', () => {
    localStorage.setItem('ph.token', 'tok');
    localStorage.setItem('ph.refresh_token', 'ref');
    localStorage.setItem(
      'ph.user',
      JSON.stringify({ userId: 'u1', name: 'A', email: 'a@a.com' }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.clear();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('ph.token')).toBeNull();
    expect(localStorage.getItem('ph.refresh_token')).toBeNull();
    expect(localStorage.getItem('ph.user')).toBeNull();

    const logoutCall = fetchMock.mock.calls.find(([u]) => String(u) === '/api/auth/logout');
    expect(logoutCall).toBeDefined();
    expect(JSON.parse(String(logoutCall![1]!.body))).toEqual({ refreshToken: 'ref' });
  });
});
