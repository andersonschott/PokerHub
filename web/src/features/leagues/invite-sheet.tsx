/**
 * Bottom sheet de convite da liga.
 * Compartilha o LINK público (/liga/entrar/{code}) — quem abrir entra na liga
 * (ou cria conta) — e também o código cru, para quem prefere digitar.
 */
import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { LeagueDto } from '@/lib/api/hooks/use-leagues';

export interface InviteSheetProps {
  league: LeagueDto;
  onClose: () => void;
}

export function InviteSheet({ league, onClose }: InviteSheetProps) {
  const [copied, setCopied] = useState<null | 'code' | 'link'>(null);
  const link = `${window.location.origin}/liga/entrar/${league.inviteCode}`;

  const copyText = (text: string, which: 'code' | 'link') => {
    try {
      void navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable — silent fallback
    }
    setCopied(which);
    setTimeout(() => {
      setCopied(null);
      onClose();
    }, 1400);
  };

  return (
    <Sheet
      open
      fixed
      onClose={onClose}
      title={`Convite · ${league.name}`}
      subtitle="Compartilhe o link — quem abrir entra na liga (ou cria conta)"
    >
      <div className="flex items-center justify-center p-[18px] rounded-[var(--radius-md)] bg-secondary border border-border mb-3">
        <span className="font-mono font-bold text-[26px] tracking-[0.14em] text-gold-400">
          {league.inviteCode}
        </span>
      </div>
      <Button
        variant="primary"
        block
        icon={copied === 'link' ? Check : Link2}
        onClick={() => copyText(link, 'link')}
      >
        {copied === 'link' ? 'Link copiado!' : 'Copiar link de convite'}
      </Button>
      <Button
        variant="secondary"
        block
        className="mt-2"
        icon={copied === 'code' ? Check : Copy}
        onClick={() => copyText(league.inviteCode, 'code')}
      >
        {copied === 'code' ? 'Código copiado!' : 'Copiar só o código'}
      </Button>
    </Sheet>
  );
}
