/**
 * Sidebar — collapsible desktop navigation.
 * Port of docs/design-system/ui_kits/pokerhub_app/DesktopParts.jsx (DkSidebar).
 *
 * - hidden md:flex — only visible on md+ breakpoints.
 * - Collapsed state (w-[68px]) persisted in local useState only (per plan).
 * - Logo (spade mark + wordmark), NavLinks with icon+label (active: accent
 *   bg + gold text), user footer with theme toggle + sign out.
 * - Sidebar width is communicated to the main content area via a CSS custom
 *   property on <html>: --sidebar-w (set on mount/toggle).
 */

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronsLeft,
  ChevronsRight,
  Sun,
  MoonStar,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Avatar } from '@/components/ui/avatar';
import { Logo } from './logo';
import { NAV_ITEMS } from './nav-items';

const W_EXPANDED = 240;   // 60 * 4 = 240px (w-60)
const W_COLLAPSED = 68;   // narrow icon-only rail

function setSidebarCssVar(w: number) {
  document.documentElement.style.setProperty('--sidebar-w', `${w}px`);
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, clear } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Sync CSS var on mount and on toggle so main content can offset itself.
  useEffect(() => {
    setSidebarCssVar(collapsed ? W_COLLAPSED : W_EXPANDED);
  }, [collapsed]);

  function handleSignOut() {
    clear();
    navigate('/login', { replace: true });
  }

  const w = collapsed ? W_COLLAPSED : W_EXPANDED;

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-border overflow-hidden"
      style={{
        width: w,
        padding: collapsed ? '20px 12px' : '20px 16px',
        background: 'color-mix(in oklab, var(--felt-850) 80%, transparent)',
        transition: `width var(--dur-base, 200ms) var(--ease-out, ease-out)`,
        gap: 6,
      }}
    >
      {/* Wordmark */}
      <div
        className="flex items-center gap-2.5 min-h-[40px]"
        style={{ padding: '4px 6px 16px' }}
      >
        <Logo collapsed={collapsed} />
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-[3px] flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[var(--radius-md)] border-0 cursor-pointer no-underline',
                  'transition-[background,color] duration-[var(--dur-fast,120ms)]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[-2px]',
                  collapsed ? 'justify-center p-[11px]' : 'px-3 py-2.5',
                  isActive
                    ? 'text-gold-400 bg-[color-mix(in_oklab,var(--gold-500)_14%,transparent)]'
                    : 'text-muted-foreground bg-transparent hover:bg-secondary hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative flex shrink-0">
                    <Icon
                      className={cn(
                        'w-5 h-5 shrink-0',
                        isActive ? 'stroke-[var(--gold-400)]' : '',
                      )}
                    />
                    {item.dot && (
                      <span
                        className="absolute -top-[2px] -right-[3px] w-[7px] h-[7px] rounded-full border-[1.5px] border-[var(--felt-850)]"
                        style={{ background: 'var(--negative)' }}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  {!collapsed && (
                    <span className="font-sans font-semibold text-[14px] whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        className={cn(
          'flex items-center gap-3 rounded-[var(--radius-md)] border-0 cursor-pointer',
          'bg-transparent text-muted-foreground',
          'transition-[background,color] duration-[var(--dur-fast,120ms)]',
          'hover:bg-secondary hover:text-foreground',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[-2px]',
          collapsed ? 'justify-center p-[11px]' : 'px-3 py-2.5',
        )}
      >
        {collapsed ? (
          <ChevronsRight className="w-5 h-5 shrink-0" />
        ) : (
          <>
            <ChevronsLeft className="w-5 h-5 shrink-0" />
            <span className="font-sans font-semibold text-[13.5px] whitespace-nowrap">
              Recolher
            </span>
          </>
        )}
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        className={cn(
          'flex items-center gap-3 rounded-[var(--radius-md)] border-0 cursor-pointer',
          'bg-transparent text-muted-foreground',
          'transition-[background,color] duration-[var(--dur-fast,120ms)]',
          'hover:bg-secondary hover:text-foreground',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[-2px]',
          collapsed ? 'justify-center p-[11px]' : 'px-3 py-2.5',
        )}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 shrink-0" />
        ) : (
          <MoonStar className="w-5 h-5 shrink-0" />
        )}
        {!collapsed && (
          <span className="font-sans font-semibold text-[13.5px] whitespace-nowrap">
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </span>
        )}
      </button>

      {/* User footer: name/email + sign out */}
      <div
        className={cn(
          'flex items-center rounded-[var(--radius-md)] border border-border bg-card',
          'transition-[background] duration-[var(--dur-fast,120ms)]',
          collapsed ? 'justify-center p-1.5' : 'gap-2.5 px-2.5 py-2',
        )}
      >
        <Avatar
          name={user?.name ?? 'Usuário'}
          size={collapsed ? 30 : 32}
        />
        {!collapsed && user && (
          <div className="flex-1 min-w-0 text-left">
            <div className="font-sans font-semibold text-[13px] truncate text-foreground">
              {user.name}
            </div>
            <div className="font-sans text-[10.5px] text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={handleSignOut}
            title="Sair"
            aria-label="Sair da conta"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] border-0',
              'bg-transparent text-muted-foreground cursor-pointer shrink-0',
              'transition-colors duration-[var(--dur-fast,120ms)]',
              'hover:bg-secondary hover:text-foreground',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[-2px]',
            )}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
