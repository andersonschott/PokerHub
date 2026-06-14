/**
 * ActionSheet — bottom-sheet de ações por jogador.
 * Steppers para rebuy (+/−) e add-on (+/−), check-in e eliminar.
 * Port fiel de Dashboard.jsx: DbStepper + ações.
 */
import { Repeat, Plus, Minus, UserCheck, Skull } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import type { MockTablePlayer } from '@/mocks/data';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/components/ui/money-value';

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

interface DbStepperProps {
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}

function DbStepper({ icon, label, sub, value, onMinus, onPlus }: DbStepperProps) {
  const stepBtn = (Icon: React.ElementType, onClick: () => void, disabled: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={Icon === Minus ? 'Diminuir' : 'Aumentar'}
      className={cn(
        'w-10 h-10 rounded-[var(--radius-sm)] border border-border bg-secondary text-foreground',
        'inline-flex items-center justify-center shrink-0 cursor-pointer',
        'transition-opacity duration-[var(--dur-fast,120ms)]',
        disabled && 'opacity-35 pointer-events-none',
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex items-center gap-3 px-3 py-[10px] rounded-[var(--radius-md)] border border-border bg-card">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-sans font-semibold text-[14px]">{label}</div>
        <div className="text-[11.5px] text-muted-foreground">{sub}</div>
      </div>
      {stepBtn(Minus, onMinus, value <= 0)}
      <span className="w-[26px] text-center font-mono font-bold text-[17px]">{value}</span>
      {stepBtn(Plus, onPlus, false)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionSheet
// ---------------------------------------------------------------------------

interface ActionSheetProps {
  player: MockTablePlayer;
  buyIn: number;
  onClose: () => void;
  onAdjust: (id: string, key: 'rebuys' | 'addons', delta: number) => void;
  onEliminate: () => void;
  onCheckIn: () => void;
}

export function ActionSheet({
  player,
  buyIn,
  onClose,
  onAdjust,
  onEliminate,
  onCheckIn,
}: ActionSheetProps) {
  const rebuysSub = `R$ ${formatBRL(buyIn)} cada · toque − para desfazer`;
  const addonsSub = `R$ ${formatBRL(buyIn)} cada · toque − para desfazer`;
  const rebuysCount = player.rebuys;
  const addonsCount = player.addons;

  const subtitle = `${rebuysCount} ${rebuysCount === 1 ? 'rebuy' : 'rebuys'} · ${addonsCount} ${addonsCount === 1 ? 'add-on' : 'add-ons'}`;

  return (
    <Sheet
      open
      onClose={onClose}
      leading={<Avatar name={player.name} />}
      title={player.name}
      subtitle={subtitle}
      fixed
    >
      <div className="grid gap-2">
        <DbStepper
          icon={<Repeat className="w-4 h-4" />}
          label="Rebuys"
          sub={rebuysSub}
          value={rebuysCount}
          onMinus={() => onAdjust(player.id, 'rebuys', -1)}
          onPlus={() => onAdjust(player.id, 'rebuys', +1)}
        />
        <DbStepper
          icon={<Plus className="w-4 h-4" />}
          label="Add-ons"
          sub={addonsSub}
          value={addonsCount}
          onMinus={() => onAdjust(player.id, 'addons', -1)}
          onPlus={() => onAdjust(player.id, 'addons', +1)}
        />
        <Button variant="outline" icon={UserCheck} block onClick={onCheckIn}>
          Check-in
        </Button>
        <Button variant="destructive" icon={Skull} block onClick={onEliminate}>
          Eliminar
        </Button>
      </div>
    </Sheet>
  );
}
