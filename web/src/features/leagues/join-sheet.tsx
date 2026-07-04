/**
 * Bottom sheet that lets a user join a league by entering an invite code.
 */
import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { useJoinLeague } from '@/lib/api/hooks/use-leagues';

export interface JoinSheetProps {
  onClose: () => void;
  onJoined: (leagueId: string) => void;
}

export function JoinSheet({ onClose, onJoined }: JoinSheetProps) {
  const [code, setCode] = useState('');
  const mutation = useJoinLeague();

  const submit = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    mutation.mutate(trimmed, {
      onSuccess: (res) => {
        toast.success(res.message || 'Você entrou na liga!');
        onJoined(res.id);
        onClose();
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.message : 'Código inválido ou expirado.';
        toast.error(msg);
      },
    });
  };

  return (
    <Sheet
      open
      fixed
      onClose={onClose}
      title="Entrar em uma liga"
      subtitle="Peça o código de convite ao organizador"
    >
      <div className="space-y-4">
        <div>
          <label className="block font-sans text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground mb-[7px]">
            Código de convite
          </label>
          <input
            className="w-full h-[46px] px-[14px] rounded-[var(--radius-md)] border border-input bg-card text-foreground font-mono text-[18px] font-bold uppercase tracking-[0.14em] text-center outline-none focus:border-[var(--ring)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_20%,transparent)] placeholder:text-[var(--ink-600)] placeholder:font-sans placeholder:text-[14px] placeholder:tracking-normal placeholder:font-normal"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Ex.: ABC-1234"
            maxLength={20}
            autoFocus
            autoCapitalize="characters"
          />
        </div>
        <Button
          variant="primary"
          block
          icon={LogIn}
          disabled={!code.trim() || mutation.isPending}
          onClick={submit}
        >
          {mutation.isPending ? 'Entrando…' : 'Entrar na liga'}
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Sheet>
  );
}
