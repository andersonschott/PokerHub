import { lazy, Suspense, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { Toaster } from '@/components/ui/sonner';
import { Splash } from '@/components/splash';
import LoginRoute from '@/routes/login';
import CadastroRoute from '@/routes/cadastro';
import { AppShell } from '@/components/app-shell/app-shell';
import EmBreveRoute from '@/routes/app/em-breve';
import { ActiveLeagueProvider } from '@/features/leagues/league-context';

// Task 9: leagues screens (API real)
const LigasRoute = lazy(() => import('@/routes/app/ligas/index'));
const NovaLigaRoute = lazy(() => import('@/routes/app/ligas/nova'));
const LeagueHomeRoute = lazy(() => import('@/routes/app/ligas/[id]'));

// Task 10: timer screens (mock clock)
const TorneioRoute = lazy(() => import('@/routes/app/torneio/index'));
const TvRoute = lazy(() => import('@/routes/app/tv'));

// Task 11: live organizer dashboard
const DashboardRoute = lazy(() => import('@/routes/app/torneio/dashboard'));

// Task 12: débitos — settlement + pagamentos
const DebitosRoute = lazy(() => import('@/routes/app/debitos/index'));
const PagamentosRoute = lazy(() => import('@/routes/app/debitos/pagamentos'));

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
                  {/* TV mode: protegido mas FORA do AppShell (fullscreen, sem nav) */}
                  <Route
                    path="/app/tv"
                    element={
                      <Protected>
                        <TvRoute />
                      </Protected>
                    }
                  />
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
                    <Route path="torneio" element={<TorneioRoute />} />
                    <Route path="torneio/dashboard" element={<DashboardRoute />} />
                    <Route path="torneio/novo" element={<EmBreveRoute title="Criar torneio" />} />
                    <Route path="torneio/historico/:tournamentId" element={<EmBreveRoute title="Torneio realizado" />} />
                    <Route path="debitos" element={<DebitosRoute />} />
                    <Route path="debitos/pagamentos" element={<PagamentosRoute />} />
                    <Route path="ranking" element={<EmBreveRoute title="Ranking" />} />
                    <Route path="perfil" element={<EmBreveRoute title="Perfil" />} />
                    <Route path="perfil/caixinha" element={<EmBreveRoute title="Caixinha" />} />
                    <Route path="perfil/admin" element={<EmBreveRoute title="Administração da liga" />} />
                    <Route path="*" element={<Navigate to="/app" replace />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            <Toaster position="top-center" richColors />
            {splash && <Splash onDone={() => setSplash(false)} />}
          </ActiveLeagueProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
