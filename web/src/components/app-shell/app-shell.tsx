/**
 * AppShell — top-level layout for all /app/* routes (Protected).
 *
 * Mobile (< md):
 *   - Sticky header bar with Logo + theme toggle + sign-out button.
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
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { Logo } from './logo';

function ThemeToggleIcon({ theme }: { theme: 'dark' | 'light' }) {
  // Inline SVG for sun/moon to avoid extra lucide bundle for tiny use
  if (theme === 'dark') {
    // Sun icon
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      </svg>
    );
  }
  // Moon-star icon
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M20 3v4"/><path d="M22 5h-4"/>
    </svg>
  );
}

export function AppShell() {
  const { clear } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
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
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full border-0',
              'bg-transparent text-muted-foreground cursor-pointer',
              'transition-colors duration-[var(--dur-fast,120ms)]',
              'hover:bg-secondary hover:text-foreground',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[-2px]',
            )}
          >
            <ThemeToggleIcon theme={theme} />
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
