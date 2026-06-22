# PWA Login Persistence (fix de roteamento) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o PWA usar a sessão persistida no cold-start — em vez de cair sempre em `/login`, o usuário logado entra direto no app.

**Architecture:** Correção de roteamento só no frontend. Extrai os guards de rota para um módulo testável (`route-guards.tsx`), adiciona um guard `PublicOnly` (login/cadastro → `/app` quando há sessão), adiciona rota raiz `/ → /app` (para o `start_url: '/'` do PWA) e muda o catch-all `* → /app`. Sem backend, sem mudança de JWT.

**Tech Stack:** React 19, react-router-dom, Vitest + @testing-library/react (happy-dom).

## Global Constraints

- Apenas frontend; arquivos tocados: `web/src/App.tsx`, novo `web/src/lib/route-guards.tsx` (+ testes). Sem backend, sem migration.
- `isAuthenticated` vem de `useAuth()` (`web/src/lib/auth-context.tsx`) e é `!!token` (access token presente). NÃO mudar o `AuthProvider`.
- Lifetimes de JWT inalterados (refresh 30 dias). Sem refresh proativo no boot (fora de escopo).
- Testes seguem o padrão de `web/src/lib/auth-context.test.tsx`; o `localStorage` mock está em `web/src/test/setup.ts` (seedar com `localStorage.setItem('ph.token', ...)`).

---

### Task 1: Módulo `route-guards.tsx` (Protected + PublicOnly) + testes

**Files:**
- Create: `web/src/lib/route-guards.tsx`
- Test: `web/src/lib/route-guards.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` de `@/lib/auth-context` (`isAuthenticated: boolean`).
- Produces:
  - `Protected({ children }: { children: ReactNode })` — `isAuthenticated ? children : <Navigate to="/login" replace />`.
  - `PublicOnly({ children }: { children: ReactNode })` — `isAuthenticated ? <Navigate to="/app" replace /> : children`.

- [ ] **Step 1: Write the failing test**

Criar `web/src/lib/route-guards.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/route-guards.test.tsx`
Expected: FAIL — módulo `./route-guards` não existe.

- [ ] **Step 3: Write the implementation**

Criar `web/src/lib/route-guards.tsx`:

```tsx
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

/** Rotas protegidas: exige sessão; sem sessão → /login. */
export function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Rotas públicas-apenas (login/cadastro): com sessão → /app. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/app" replace /> : <>{children}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/route-guards.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/route-guards.tsx web/src/lib/route-guards.test.tsx
git commit -m "feat(web): guards de rota Protected/PublicOnly em modulo testavel"
```

---

### Task 2: Wire `App.tsx` (rota raiz, PublicOnly, catch-all)

**Files:**
- Modify: `web/src/App.tsx`

**Interfaces:**
- Consumes: `Protected`, `PublicOnly` de `@/lib/route-guards` (Task 1).

- [ ] **Step 1: Importar os guards e remover o `Protected` inline**

Em `web/src/App.tsx`:
- Adicionar o import (junto aos demais imports de `@/`):
  ```tsx
  import { Protected, PublicOnly } from '@/lib/route-guards';
  ```
- **Remover** a função `Protected` inline (o bloco):
  ```tsx
  function Protected({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
  }
  ```
- Como `ReactNode` e `useAuth` deixam de ser usados em `App.tsx` após remover o `Protected` inline:
  - Trocar `import { lazy, Suspense, useState, type ReactNode } from 'react';` por
    `import { lazy, Suspense, useState } from 'react';`
  - Remover `useAuth` do import `import { AuthProvider, useAuth } from '@/lib/auth-context';` →
    `import { AuthProvider } from '@/lib/auth-context';`

- [ ] **Step 2: Ajustar as rotas**

No bloco `<Routes>`:
- Envolver `/login` e `/cadastro` com `PublicOnly`. Substituir:
  ```tsx
  <Route path="/login" element={<LoginRoute />} />
  <Route path="/cadastro" element={<CadastroRoute />} />
  ```
  por:
  ```tsx
  <Route path="/" element={<Navigate to="/app" replace />} />
  <Route path="/login" element={<PublicOnly><LoginRoute /></PublicOnly>} />
  <Route path="/cadastro" element={<PublicOnly><CadastroRoute /></PublicOnly>} />
  ```
- Mudar o catch-all de topo. Substituir:
  ```tsx
  <Route path="*" element={<Navigate to="/login" replace />} />
  ```
  por:
  ```tsx
  <Route path="*" element={<Navigate to="/app" replace />} />
  ```
- O `<Route path="/app" element={<Protected><AppShell /></Protected>}>` permanece igual (agora usando o `Protected` importado).

- [ ] **Step 3: Verificar build + testes + checagem manual**

Run: `cd web && npx tsc -b --noEmit && npx vitest run && npm run build`
Expected: tsc sem erros (sem variáveis não usadas), vitest verde (incl. `route-guards.test.tsx`), build OK.

Checagem manual (`npm run dev`):
- Logado, recarregar em `/` → entra direto em `/app/ligas` (não vê login).
- Logado, navegar para `/login` → redireciona para `/app`.
- Deslogado, abrir `/` → vai para `/login`.

- [ ] **Step 4: Commit**

```bash
git add web/src/App.tsx
git commit -m "fix(web): PWA cold-start usa a sessao persistida (/ -> /app, PublicOnly em login/cadastro)"
```

---

## Pós-implementação (operacional — supervisor)

Após as duas tasks: **redeploy do Azure Static Web App** (React). Como a mudança é só
frontend, NÃO é necessário tocar o Container App (API). Procedimento de redeploy do SWA
conforme a memória `azure-deploy-state` (build do `web/` + publish do `dist/` no SWA;
atenção ao gotcha do `node_modules` — buildar por caminho explícito se necessário).

---

## Self-Review

**Spec coverage (spec 2026-06-22-pwa-login-persistence):**
- Guard `PublicOnly` em /login e /cadastro → Task 1 (guard) + Task 2 (wiring). ✔
- Rota raiz `/` → `/app` → Task 2 Step 2. ✔
- Catch-all `*` → `/app` → Task 2 Step 2. ✔
- `Protected` inalterado em comportamento (extraído para módulo) → Task 1. ✔
- Testes (guards + contrato de roteamento com folhas-stub) → Task 1 test. ✔
- Sem backend/JWT/migration → respeitado. ✔
- Redeploy SWA ao final → seção Pós-implementação. ✔

**Placeholder scan:** sem TBD/TODO; todo passo mostra o código/comando. ✔

**Type consistency:** `Protected`/`PublicOnly` com assinatura `{ children: ReactNode }`
idêntica entre `route-guards.tsx`, o teste e o uso em `App.tsx`. Remoção de `ReactNode`/`useAuth`
de `App.tsx` evita erro de variável não usada. ✔
