// PokerHub SW Update Manager
// Detecta novo service worker e notifica o app via CustomEvent.
// O componente AppUpdateNotifier.razor escuta e exibe o toast.

'use strict';

(function () {
    if (!('serviceWorker' in navigator)) return;

    // Referência ao SW em estado "waiting" (nova versão pronta mas não ativada)
    let _pendingWorker = null;

    // ── Detecção de atualização ──────────────────────────────────────────────

    navigator.serviceWorker.ready.then(registration => {
        // SW já estava esperando antes de esta página carregar
        if (registration.waiting) {
            setPendingWorker(registration.waiting);
        }

        // SW encontrou atualização durante esta sessão
        registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) return;

            installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                    // Novo SW instalado e pronto — versão anterior ainda ativa
                    setPendingWorker(installing);
                }
            });
        });

        // Verifica por atualizações a cada 60 minutos (torneios duram horas)
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    });

    // ── Mensagens do SW → app ────────────────────────────────────────────────

    navigator.serviceWorker.addEventListener('message', event => {
        switch (event.data?.type) {
            case 'SW_ACTIVATED':
                // Novo SW ativou — recarrega se havia uma versão anterior controlando
                if (window._pokerhubSWControlled) {
                    console.log('[SW Update] Nova versão ativada — recarregando');
                    window.location.reload();
                }
                break;

            case 'SYNC_COMPLETE':
                // Background sync concluiu — notifica o app para refrescar dados
                window.dispatchEvent(new CustomEvent('pokerhub-sync-complete', {
                    detail: { processed: event.data.processed }
                }));
                break;

            case 'SW_VERSION':
                // Resposta ao GET_VERSION
                if (window._pokerhubVersionResolve) {
                    window._pokerhubVersionResolve(event.data.version);
                    window._pokerhubVersionResolve = null;
                }
                break;
        }
    });

    // Marca se esta página já tinha um SW controlando (não é o primeiro acesso)
    window._pokerhubSWControlled = !!navigator.serviceWorker.controller;

    // ── Helpers ──────────────────────────────────────────────────────────────

    function setPendingWorker(worker) {
        _pendingWorker = worker;
        console.log('[SW Update] Nova versão disponível');
        window.dispatchEvent(new CustomEvent('pokerhub-update-available'));
    }

    // ── API pública ───────────────────────────────────────────────────────────

    window.pokerhubSW = {
        /**
         * Aplica a atualização pendente (chamado pelo toast "Atualizar").
         * O SW receberá SKIP_WAITING, ativará e a página recarregará via SW_ACTIVATED.
         */
        applyUpdate() {
            if (_pendingWorker) {
                _pendingWorker.postMessage({ type: 'SKIP_WAITING' });
            }
        },

        /**
         * Registra dotnetRef para notificações vindas do SW.
         * Chamado pelo AppUpdateNotifier.razor via JSInterop.
         */
        watch(dotnetRef) {
            window.addEventListener('pokerhub-update-available', () => {
                dotnetRef.invokeMethodAsync('OnUpdateAvailable').catch(() => {});
            });
            window.addEventListener('pokerhub-sync-complete', event => {
                dotnetRef.invokeMethodAsync('OnSyncComplete', event.detail.processed).catch(() => {});
            });
        },

        /**
         * Solicita ao SW a versão atual. Retorna Promise<string|null>.
         */
        getVersion() {
            return new Promise(resolve => {
                window._pokerhubVersionResolve = resolve;
                navigator.serviceWorker.ready
                    .then(r => r.active?.postMessage({ type: 'GET_VERSION' }))
                    .catch(() => resolve(null));
                setTimeout(() => resolve(null), 3000);
            });
        },

        /**
         * Força verificação de atualização imediata.
         */
        checkForUpdate() {
            return navigator.serviceWorker.ready
                .then(r => r.update())
                .catch(() => {});
        }
    };

})();
