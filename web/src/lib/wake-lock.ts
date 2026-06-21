/**
 * useWakeLock — mantém a tela acesa enquanto `active` (Screen Wake Lock API).
 * Porta do `wwwroot/js/wakelock.js` do Blazor:
 *  - request('screen') ao ativar;
 *  - re-acquire em `visibilitychange` (o lock cai sozinho quando a aba some);
 *  - release no cleanup.
 * Best-effort: sem suporte (Safari iOS) ou rejeição → no-op silencioso.
 */
import { useEffect } from 'react';

interface WakeLockSentinelLike {
  release(): Promise<void>;
}
interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

function getWakeLock(): WakeLockLike | null {
  const wl = (navigator as unknown as { wakeLock?: WakeLockLike }).wakeLock;
  return wl ?? null;
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const api = getWakeLock();
    if (!api) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let released = false;

    const request = async () => {
      try {
        sentinel = await api.request('screen');
      } catch {
        /* permissão negada / não-fullscreen / etc. — silencioso */
      }
    };

    const onVisibility = () => {
      if (!released && document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        void sentinel?.release();
      } catch {
        /* silencioso */
      }
      sentinel = null;
    };
  }, [active]);
}
