import { useRef, useId, type ReactNode, type HTMLAttributes } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SheetProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
  fixed?: boolean;
  children?: ReactNode;
}

export function Sheet({ open = true, onClose, title, subtitle, leading, fixed: _fixed,
  className, children, ...props }: SheetProps) {
  const descriptionId = useId();
  const opener = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) opener.current = document.activeElement as HTMLElement | null;
  wasOpen.current = open;
  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose?.(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed z-[60] inset-0 bg-black/55 animate-ph-fade-in" />
        <Dialog.Content
          aria-describedby={subtitle ? descriptionId : undefined}
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus({ preventScroll: true }); }
          }}
          className={cn('fixed z-[61] bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px]',
            'bg-[var(--felt-800)] rounded-t-[var(--radius-xl)] border border-b-0 border-border shadow-sheet',
            'px-[18px] pt-2 pb-[calc(20px+var(--safe-bottom,0px))] animate-ph-sheet-up max-h-[88dvh] overflow-y-auto', className)}
          {...props}
        >
          <div className="w-10 h-1 rounded-full bg-[var(--felt-600)] mx-auto mb-[14px]" />
          <div className="flex items-center gap-3 mb-[14px]">
            {leading}
            <div className="flex-1 min-w-0">
              <Dialog.Title className={title ? 'font-sans font-bold text-[19px] tracking-[-0.01em] text-foreground' : 'sr-only'}>
                {title ?? props['aria-label'] ?? 'Detalhes'}
              </Dialog.Title>
              {subtitle && <Dialog.Description id={descriptionId} asChild><div className="text-sm text-muted-foreground mt-0.5">{subtitle}</div></Dialog.Description>}
            </div>
            {onClose && <Dialog.Close asChild>
              <button type="button" aria-label="Fechar" className="shrink-0 inline-flex items-center justify-center size-11 rounded-[var(--radius-md)] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            </Dialog.Close>}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
