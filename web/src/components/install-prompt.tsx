import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Dica de instalação do PWA, mostrada uma vez por dispositivo.
 * - Android/Chrome/Edge: captura `beforeinstallprompt` e oferece o botão "Instalar".
 * - iOS/Safari: não há evento → mostra as instruções de "Adicionar à Tela de Início".
 * Some quando já instalado (display-mode standalone) ou após dispensar/instalar.
 */

const DISMISS_KEY = 'ph-install-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  const iDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ se apresenta como "Macintosh" com touch.
  const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iDevice || iPadOs;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* localStorage indisponível — segue mostrando */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // evita o mini-infobar nativo; usamos nossa UI
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onInstalled = () => setShow(false);
    window.addEventListener('appinstalled', onInstalled);

    // iOS não dispara beforeinstallprompt → mostra a dica após um respiro.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      setIos(true);
      timer = setTimeout(() => setShow(true), 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!show) return null;

  const remember = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const dismiss = () => {
    remember();
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    remember();
    setDeferred(null);
    setShow(false);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Instalar o PokerHub"
    >
      <div
        className={cn(
          'pointer-events-auto mx-auto flex max-w-md items-start gap-3 p-4',
          'rounded-[var(--radius-lg)] border border-border bg-card shadow-xl',
          'animate-ph-sheet-up',
        )}
      >
        <img
          src="/pwa-192x192.png"
          alt=""
          className="h-11 w-11 shrink-0 rounded-[var(--radius-md)]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[15px] font-bold text-foreground">Instalar o PokerHub</p>
          {ios ? (
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Toque em <Share className="-mt-0.5 inline h-4 w-4 align-middle" aria-hidden />{' '}
              <span className="font-medium text-foreground">Compartilhar</span> e depois em{' '}
              <span className="font-medium text-foreground">“Adicionar à Tela de Início”</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Acesse em tela cheia, direto da tela inicial — mais rápido, como um app.
            </p>
          )}
          {!ios && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" icon={Download} onClick={install}>
                Instalar
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Agora não
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={dismiss}
          className="-m-1 shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
