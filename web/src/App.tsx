import { lazy, Suspense, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { Toaster } from '@/components/ui/sonner';
import { Splash } from '@/components/splash';
import { InstallPrompt } from '@/components/install-prompt';
import LoginRoute from '@/routes/login';
import CadastroRoute from '@/routes/cadastro';
import { AppShell } from '@/components/app-shell/app-shell';

import { ActiveLeagueProvider } from '@/features/leagues/league-context';

// Task 9: leagues screens (API real)
const LigasRoute = lazy(() => import('@/routes/app/ligas/index'));
const NovaLigaRoute = lazy(() => import('@/routes/app/ligas/nova'));
const LeagueHomeRoute = lazy(() => import('@/routes/app/ligas/[id]'));

// Task Phase 3: League Management Routes
const LeaguePlayersRoute = lazy(() => import('@/routes/app/ligas/[id]/jogadores'));
const LeagueSeasonsRoute = lazy(() => import('@/routes/app/ligas/[id]/temporadas'));
const LeaguePrizeTablesRoute = lazy(() => import('@/routes/app/ligas/[id]/tabelas-premiacao'));

// Task 10: timer screens (mock clock)
const TorneioRoute = lazy(() => import('@/routes/app/torneio/index'));
const TvRoute = lazy(() => import('@/routes/app/tv'));

// Task 11: live organizer dashboard
const DashboardRoute = lazy(() => import('@/routes/app/torneio/dashboard'));

// Task 12: débitos — settlement + pagamentos
const DebitosRoute = lazy(() => import('@/routes/app/debitos/index'));
const PagamentosRoute = lazy(() => import('@/routes/app/debitos/pagamentos'));

// Task 13: ranking + player stats
const RankingRoute = lazy(() => import('@/routes/app/ranking'));

// F16b: comparativo de jogadores
const CompararRoute = lazy(() => import('@/routes/app/comparar'));

// Task 14: perfil + caixinha + admin
const PerfilRoute = lazy(() => import('@/routes/app/perfil/index'));
const CaixinhaRoute = lazy(() => import('@/routes/app/perfil/caixinha'));
const AdminRoute = lazy(() => import('@/routes/app/perfil/admin'));

// Task 15: wizard de torneio + histórico
const NovoTorneioRoute = lazy(() => import('@/routes/app/torneio/novo'));
const HistoricoDetalheRoute = lazy(() => import('@/routes/app/torneio/historico/[id]'));
const EntrarTorneioRoute = lazy(() => import('@/routes/app/torneio/entrar'));

// Detalhe de torneio agendado/próximo (somente leitura)
const TorneioDetalheRoute = lazy(() => import('@/routes/app/torneio/[id]'));

// Landing pública de convite de liga (sem menus)
const LigaEntrarRoute = lazy(() => import('@/routes/liga-entrar'));

const RouteFallback = () => (
  <div className="flex min-h-dvh items-center justify-center">
    <div className="animate-ph-pulse text-sm text-muted-foreground">Carregando…</div>
  </div>
);

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  // Splash uma vez por load (padrão do kit), por cima de tudo.
  const [splash, setSplash] = useState(true);

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
          <ActiveLeagueProvider>
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<LoginRoute />} />
                  <Route path="/cadastro" element={<CadastroRoute />} />
                  {/* TV mode: público via invite code */}
                  <Route path="/tv/:inviteCode" element={<TvRoute />} />
                  {/* Convite de liga: landing pública (sem menus) */}
                  <Route path="/liga/entrar/:inviteCode" element={<LigaEntrarRoute />} />
                  {/* Convite de torneio: landing pública (sem menus) */}
                  <Route path="/torneio/entrar/:code" element={<EntrarTorneioRoute />} />
                  <Route
                    path="/app"
                    element={
                      <Protected>
                        <AppShell />
                      </Protected>
                    }
                  >
                    <Route index element={<Navigate to="/app/ligas" replace />} />
                    {/* Task 9: Ligas — API real */}
                    <Route path="ligas" element={<LigasRoute />} />
                    <Route path="ligas/nova" element={<NovaLigaRoute />} />
                    <Route path="ligas/:leagueId" element={<LeagueHomeRoute />} />
                    <Route path="ligas/:leagueId/jogadores" element={<LeaguePlayersRoute />} />
                    <Route path="ligas/:leagueId/temporadas" element={<LeagueSeasonsRoute />} />
                    <Route path="ligas/:leagueId/tabelas-premiacao" element={<LeaguePrizeTablesRoute />} />
                    <Route path="torneio" element={<TorneioRoute />} />
                    <Route path="torneio/dashboard" element={<DashboardRoute />} />
                    <Route path="torneio/novo" element={<NovoTorneioRoute />} />
                    <Route path="torneio/historico/:tournamentId" element={<HistoricoDetalheRoute />} />
                    {/* :tournamentId depois das estáticas (dashboard/novo) para não capturá-las */}
                    <Route path="torneio/:tournamentId" element={<TorneioDetalheRoute />} />
                    <Route path="debitos" element={<DebitosRoute />} />
                    <Route path="debitos/pagamentos" element={<PagamentosRoute />} />
                    <Route path="ranking" element={<RankingRoute />} />
                    <Route path="comparar" element={<CompararRoute />} />
                    <Route path="perfil" element={<PerfilRoute />} />
                    <Route path="perfil/caixinha" element={<CaixinhaRoute />} />
                    <Route path="perfil/admin" element={<AdminRoute />} />
                    <Route path="*" element={<Navigate to="/app" replace />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            <Toaster position="top-center" richColors />
            <InstallPrompt />
            {splash && <Splash onDone={() => setSplash(false)} />}
          </ActiveLeagueProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
