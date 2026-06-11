/**
 * Bottom sheet that shows the invite code for a league.
 * Port of the invite sheet inside Lobby.jsx.
 */
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { LeagueDto } from '@/lib/api/hooks/use-leagues';

export interface InviteSheetProps {
  league: LeagueDto;
  onClose: () => void;
}

export function InviteSheet({ league, onClose }: InviteSheetProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    try {
      void navigator.clipboard.writeText(league.inviteCode);
    } catch {
      // clipboard unavailable — silent fallback
    }
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1400);
  };

  return (
    <Sheet
      open
      fixed
      onClose={onClose}
      title={`Convite · ${league.name}`}
      subtitle="Compartilhe este código para convidar jogadores"
    >
      <div className="flex items-center justify-center p-[18px] rounded-[var(--radius-md)] bg-secondary border border-border mb-3">
        <span className="font-mono font-bold text-[26px] tracking-[0.14em] text-gold-400">
          {league.inviteCode}
        </span>
      </div>
      <Button
        variant="primary"
        block
        icon={copied ? Check : Copy}
        onClick={copy}
      >
        {copied ? 'Copiado!' : 'Copiar código'}
      </Button>
    </Sheet>
  );
}
