/**
 * Bottom-sheet com QR Code PIX + "copia e cola".
 * Reutilizado nas telas de débito (jogador) e pagamentos (organizador).
 */
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MoneyValue } from '@/components/ui/money-value';
import { buildPixPayload } from './pix';

export interface PixQrSheetProps {
  open: boolean;
  onClose: () => void;
  pixKey: string;
  recipientName: string;
  amount?: number;
}

export function PixQrSheet({ open, onClose, pixKey, recipientName, amount }: PixQrSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const payload = buildPixPayload({ key: pixKey, name: recipientName, amount });

  const copy = () => {
    try {
      void navigator.clipboard.writeText(payload);
    } catch {
      // clipboard unavailable
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    toast.success('Pix copia e cola copiado');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      fixed
      title={`PIX · ${recipientName}`}
      subtitle="Escaneie no app do banco ou copie"
    >
      <div className="flex flex-col items-center gap-[14px]">
        {amount && amount > 0 ? <MoneyValue value={amount} size="30px" color="none" /> : null}

        <div className="bg-white p-3 rounded-[var(--radius-md)]">
          <QRCodeSVG value={payload} size={196} bgColor="#ffffff" fgColor="#0a0a0a" />
        </div>

        <div className="flex items-center w-full bg-secondary rounded-[var(--radius-md)] px-3 py-[10px]">
          <span className="flex-1 min-w-0 font-mono text-[12px] overflow-hidden text-ellipsis whitespace-nowrap">
            {payload}
          </span>
        </div>

        <Button variant="primary" icon={copied ? Check : Copy} block onClick={copy}>
          {copied ? 'Copiado!' : 'Copiar Pix copia e cola'}
        </Button>
      </div>
    </Sheet>
  );
}
