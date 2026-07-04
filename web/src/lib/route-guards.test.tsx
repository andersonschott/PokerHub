import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth-context';
import { Protected, PublicOnly } from './route-guards';

// Espelha a estrutura de roteamento de auth do App.tsx, com folhas-stub
// (sem rotas lazy / sem rede) para testar APENAS as decisões de redirect.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/login" element={<PublicOnly><div>LOGIN</div></PublicOnly>} />
          <Route path="/app" element={<Protected><div>APP</div></Protected>} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('route guards + cold-start routing', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it('sem sessão: "/" cai em /login (via /app → Protected)', () => {
    renderAt('/');
    expect(screen.getByText('LOGIN')).toBeTruthy();
  });

  it('sem sessão: /app redireciona para /login', () => {
    renderAt('/app');
    expect(screen.getByText('LOGIN')).toBeTruthy();
  });

  it('sem sessão: rota desconhecida cai em /login (via /app)', () => {
    renderAt('/qualquer-coisa');
    expect(screen.getByText('LOGIN')).toBeTruthy();
  });

  it('com sessão: "/" entra direto no /app', () => {
    localStorage.setItem('ph.token', 'tok-valido');
    renderAt('/');
    expect(screen.getByText('APP')).toBeTruthy();
    expect(screen.queryByText('LOGIN')).toBeNull();
  });

  it('com sessão: /login redireciona para /app (PublicOnly)', () => {
    localStorage.setItem('ph.token', 'tok-valido');
    renderAt('/login');
    expect(screen.getByText('APP')).toBeTruthy();
    expect(screen.queryByText('LOGIN')).toBeNull();
  });
});
