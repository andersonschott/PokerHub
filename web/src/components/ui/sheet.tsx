import { useEffect, type MouseEvent, type ReactNode, type HTMLAttributes } from 'react';
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

export function Sheet({
  open = true,
  onClose,
  title,
  subtitle,
  leading,
  fixed = false,
  className,
  children,
  ...props
}: SheetProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const onBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && onClose) onClose();
  };

  return (
    <div
      className={cn(
        'z-[60] inset-0 flex items-end justify-center',
        'bg-black/55 animate-ph-fade-in',
        fixed ? 'fixed' : 'absolute',
      )}
      onClick={onBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'w-full max-w-[520px]',
          'bg-[var(--felt-800)]',
          'rounded-tl-[var(--radius-xl)] rounded-tr-[var(--radius-xl)]',
          'border border-b-0 border-border',
          'shadow-sheet',
          'px-[18px] pt-2',
          'pb-[calc(20px+var(--safe-bottom,0px))]',
          'animate-ph-sheet-up',
          'max-h-[88%] overflow-y-auto',
          className,
        )}
        {...props}
      >
        {/* Grab handle */}
        <div className="w-10 h-1 rounded-full bg-[var(--felt-600)] mx-auto mb-[14px]" />

        {/* Header */}
        {title != null || leading != null ? (
          <div className="flex items-center gap-3 mb-[14px]">
            {leading}
            <div className="flex-1 min-w-0">
              {title ? (
                <div className="font-sans font-bold text-[19px] tracking-[-0.01em] text-foreground">
                  {title}
                </div>
              ) : null}
              {subtitle ? (
                <div className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</div>
              ) : null}
            </div>
            {onClose ? (
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="shrink-0 inline-flex items-center justify-center size-8 rounded-[var(--radius-md)] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
