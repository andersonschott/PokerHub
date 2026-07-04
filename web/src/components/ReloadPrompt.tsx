import { Button } from '@/components/ui/button';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log(`Service worker registered`, r);
    },
    onRegisterError(error: any) {
      console.error('Error during service worker registration:', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-lg bg-background p-4 shadow-lg ring-1 ring-border">
        <div className="mb-2 text-sm font-semibold">
          Nova versão disponível!
        </div>
        <div className="mb-4 text-sm text-muted-foreground">
          Recarregue a página para aplicar as melhorias e correções mais
          recentes.
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => updateServiceWorker(true)}
        >
          Recarregar
        </Button>
      </div>
    </div>
  );
}
