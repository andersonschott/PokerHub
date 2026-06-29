/**
 * AppShell — top-level layout for all /app/* routes (Protected).
 *
 * Mobile (< md):
 *   - Sticky header bar with Logo + notifications + sign-out button.
 *   - BottomNav fixed at the bottom.
 *   - Main content padded to clear the bottom nav.
 *
 * Desktop (≥ md):
 *   - Collapsible Sidebar fixed on the left; sidebar sets --sidebar-w
 *     on <html> so main can offset with ml-[var(--sidebar-w)].
 *   - No header bar, no bottom nav.
 *
 * <Outlet /> renders the child route inside <main>.
 */

import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { Logo } from './logo';

export function AppShell() {
  const { clear } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Desktop collapsible sidebar */}
      <Sidebar />

      {/* Mobile-only sticky header */}
      <header
        className={cn(
          'md:hidden sticky top-0 z-30',
          'flex items-center justify-between',
          'px-4 h-14 border-b border-border',
          'safe-top',
        )}
        style={{
          background: 'color-mix(in oklab, var(--felt-850) 92%, transparent)',
          backdropFilter: 'saturate(1.2) blur(8px)',
        }}
      >
        <Logo />

        <div className="flex items-center gap-1">
          {/* Notifications (placeholder) */}
          <button
            type="button"
            aria-label="Notificações"
            title="Notificações"
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full border-0',
              'bg-transparent text-muted-foreground cursor-pointer',
              'transition-colors duration-[var(--dur-fast,120ms)]',
              'hover:bg-secondary hover:text-foreground',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[-2px]',
            )}
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            aria-label="Sair da conta"
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full border-0',
              'bg-transparent text-muted-foreground cursor-pointer',
              'transition-colors duration-[var(--dur-fast,120ms)]',
              'hover:bg-secondary hover:text-foreground',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[-2px]',
            )}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main
        className={cn(
          // Mobile: horizontal + bottom padding to clear the bottom-nav
          'px-4 pt-4',
          'pb-[calc(var(--bottom-nav-h,64px)+24px)]',
          // Desktop: offset left by sidebar width, more horizontal padding,
          // no bottom-nav clearance needed
          'md:ml-[var(--sidebar-w,240px)] md:px-8 md:pb-8',
          'transition-[margin-left] duration-[var(--dur-base,200ms)] ease-out',
        )}
      >
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
