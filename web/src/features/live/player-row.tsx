/**
 * PlayerRow — linha de jogador no painel ao vivo.
 * Mostra avatar, nome/@nick, contadores de rebuy/add-on e dispara onSelect ao toque.
 */
import { Repeat, Plus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import type { MockTablePlayer } from '@/mocks/data';

interface DbCountProps {
  kind: 'rebuy' | 'addon';
  n: number;
}

function DbCount({ kind, n }: DbCountProps) {
  const on = n > 0;
  return (
    <span
      title={kind === 'rebuy' ? 'Rebuys' : 'Add-ons'}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] border shrink-0"
      style={{
        background: on ? 'var(--secondary)' : 'transparent',
        borderColor: 'var(--border)',
        color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
        opacity: on ? 1 : 0.6,
      }}
    >
      {kind === 'rebuy' ? (
        <Repeat className="w-3 h-3 shrink-0" />
      ) : (
        <Plus className="w-3 h-3 shrink-0" />
      )}
      <span className="font-mono font-bold text-[12.5px] leading-none">{n}</span>
    </span>
  );
}

interface PlayerRowProps {
  player: MockTablePlayer;
  onSelect: (p: MockTablePlayer) => void;
}

export function PlayerRow({ player, onSelect }: PlayerRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      className="w-full flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border border-border bg-card cursor-pointer text-left transition-[border-color,box-shadow] duration-[var(--dur-fast,120ms)] hover:border-[var(--felt-600)] hover:shadow-md active:scale-[.99]"
    >
      <Avatar name={player.name} />
      <div className="flex-1 min-w-0">
        <div className="font-sans font-semibold text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">
          {player.name}
        </div>
        <div className="text-[12px] text-muted-foreground">@{player.nick}</div>
      </div>
      <DbCount kind="rebuy" n={player.rebuys} />
      <DbCount kind="addon" n={player.addons} />
    </button>
  );
}
