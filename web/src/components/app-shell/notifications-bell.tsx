/**
 * NotificationsBell — sininho do header mobile (port do header do Home.jsx).
 * Dot aceso quando há notificações; tap abre um bottom-sheet com os itens.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarClock, Receipt, type LucideIcon } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useMyDebts } from '@/lib/api/hooks/use-payments';
import { useTournaments } from '@/lib/api/hooks/use-tournaments';
import { useActiveLeague } from '@/features/leagues/league-context';
import { buildNotifications, type AppNotification } from './notifications';

const KIND_ICONS: Record<AppNotification['kind'], LucideIcon> = {
  debts: Receipt,
  upcoming: CalendarClock,
};

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { activeLeagueId } = useActiveLeague();
  const { data: debts } = useMyDebts();
  const { data: tournaments } = useTournaments(activeLeagueId ?? '');

  const notifications = buildNotifications(debts, tournaments, new Date());

  const openItem = (n: AppNotification) => {
    setOpen(false);
    navigate(n.to);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Notificações"
        title="Notificações"
        onClick={() => setOpen(true)}
        className={cn(
          'relative flex items-center justify-center w-10 h-10 rounded-full border-0',
          'bg-transparent text-muted-foreground cursor-pointer',
          'transition-colors duration-[var(--dur-fast,120ms)]',
          'hover:bg-secondary hover:text-foreground',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-[-2px]',
        )}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {notifications.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              top: 9,
              right: 10,
              width: 7,
              height: 7,
              background: 'var(--live)',
              border: '1.5px solid var(--background)',
            }}
          />
        )}
      </button>

      {open && (
        <Sheet fixed open onClose={() => setOpen(false)} title="Notificações">
          {notifications.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-4">
              Tudo em dia — nenhuma notificação por aqui.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => {
                const Icon = KIND_ICONS[n.kind];
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      'flex gap-3 items-start w-full px-[14px] py-3 text-left cursor-pointer',
                      'rounded-[var(--radius-md)] border border-border bg-card text-foreground',
                      'hover:bg-secondary transition-colors duration-[var(--dur-fast,120ms)]',
                    )}
                  >
                    <Icon className="w-4 h-4 text-gold-400 shrink-0 mt-[2px]" />
                    <span className="flex-1 text-[13.5px] leading-[1.45]">{n.text}</span>
                    {n.when ? (
                      <span className="text-[11.5px] text-muted-foreground shrink-0">{n.when}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
