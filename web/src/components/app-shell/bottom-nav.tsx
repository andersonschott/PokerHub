/**
 * BottomNav — mobile fixed bottom navigation.
 * Port of docs/design-system/components/navigation/BottomNav.jsx.
 *
 * - Fixed to bottom, height var(--bottom-nav-h) + safe-bottom env padding.
 * - 5 NavLink destinations; active item text + icon in gold-400.
 * - Notification dot (--negative) supported per item.
 * - Hidden on md+ (sidebar takes over).
 * - Touch targets ≥44px.
 */

import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed left-0 right-0 bottom-0 z-50 flex items-stretch border-t border-border backdrop-blur-[8px] backdrop-saturate-[1.2]"
      style={{
        background: 'color-mix(in oklab, var(--felt-850) 92%, transparent)',
        paddingBottom: 'calc(6px + var(--safe-bottom, 0px))',
        paddingLeft: 6,
        paddingRight: 6,
        paddingTop: 6,
        height: 'var(--bottom-nav-h)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-[3px]',
                'min-h-[44px] px-0.5 py-[6px] rounded-[var(--radius-md)]',
                'border-0 bg-transparent cursor-pointer no-underline',
                'transition-colors duration-[var(--dur-fast,120ms)]',
                'active:bg-secondary',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[-2px]',
                isActive ? 'text-gold-400' : 'text-muted-foreground',
              )
            }
            aria-label={item.label}
          >
            {({ isActive }) => (
              <>
                {/* Icon wrapper — position: relative for dot */}
                <span className="relative flex">
                  <Icon
                    className={cn(
                      'w-[22px] h-[22px] shrink-0',
                      isActive ? 'stroke-[var(--gold-400)]' : '',
                    )}
                  />
                  {item.dot && (
                    <span
                      className="absolute -top-[2px] -right-[3px] w-2 h-2 rounded-full border-[1.5px] border-[var(--felt-850)]"
                      style={{ background: 'var(--negative)' }}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span
                  className="font-sans font-semibold tracking-[0.01em]"
                  style={{ fontSize: 10.5 }}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
