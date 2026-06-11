import { Layers, Timer, Wallet, TrendingUp, User, type LucideIcon } from 'lucide-react';

export interface NavItem {
  /** Route path for NavLink */
  to: string;
  label: string;
  icon: LucideIcon;
  /** Show notification dot (e.g. pending debts) */
  dot?: boolean;
}

/**
 * Canonical navigation items — single source of truth for both
 * the mobile BottomNav and the desktop Sidebar.
 *
 * Route map (from plan header):
 *   Ligas    → /app/ligas
 *   Torneio  → /app/torneio
 *   Débitos  → /app/debitos
 *   Ranking  → /app/ranking
 *   Perfil   → /app/perfil
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/app/ligas',   label: 'Ligas',   icon: Layers },
  { to: '/app/torneio', label: 'Torneio', icon: Timer },
  { to: '/app/debitos', label: 'Débitos', icon: Wallet, dot: true },
  { to: '/app/ranking', label: 'Ranking', icon: TrendingUp },
  { to: '/app/perfil',  label: 'Perfil',  icon: User },
];
