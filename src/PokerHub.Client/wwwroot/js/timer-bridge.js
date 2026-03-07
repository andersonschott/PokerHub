// PokerHub Timer Bridge — JSInterop entre Blazor WASM e o Web Worker
// Responsável por:
//   1. Criar e destruir o Worker
//   2. Relay de mensagens Worker → Blazor (via DotNetObjectReference)
//   3. Persistência no IndexedDB (recebida do Worker via PERSIST_STATE)
//   4. Efeitos sonoros (via timer-sounds.js)

'use strict';

(function (window) {
    const DB_NAME    = 'PokerHubTimer';
    const DB_STORE   = 'timerState';
    const DB_VERSION = 1;

    let _worker    = null;
    let _dotnetRef = null;
    let _db        = null;

    // ─── IndexedDB ─────────────────────────────────────────────────────────

    function openDb() {
        return new Promise((resolve, reject) => {
            if (_db) { resolve(_db); return; }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = e => {
                e.target.result.createObjectStore(DB_STORE, { keyPath: 'tournamentId' });
            };
            req.onsuccess = e => { _db = e.target.result; resolve(_db); };
            req.onerror   = e => reject(e.target.error);
        });
    }

    async function persistState(snapshot) {
        try {
            const db = await openDb();
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).put(snapshot);
        } catch (e) {
            console.warn('[TimerBridge] IndexedDB persist error:', e);
        }
    }

    async function loadPersistedState(tournamentId) {
        try {
            const db = await openDb();
            return await new Promise((resolve, reject) => {
                const req = db.transaction(DB_STORE, 'readonly')
                               .objectStore(DB_STORE)
                               .get(tournamentId);
                req.onsuccess = e => resolve(e.target.result ?? null);
                req.onerror   = e => reject(e.target.error);
            });
        } catch (e) {
            console.warn('[TimerBridge] IndexedDB load error:', e);
            return null;
        }
    }

    async function clearPersistedState(tournamentId) {
        try {
            const db = await openDb();
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).delete(tournamentId);
        } catch (e) {
            console.warn('[TimerBridge] IndexedDB clear error:', e);
        }
    }

    // ─── Sons ───────────────────────────────────────────────────────────────

    function playSound(sound) {
        try {
            if (!window.timerSounds) return;
            switch (sound) {
                case 'levelChange': window.timerSounds.playLevelChange(); break;
                case 'breakStart':  window.timerSounds.playBreakStart();  break;
                case 'warning':     window.timerSounds.playWarning();     break;
                case 'critical':    window.timerSounds.playCritical();    break;
                case 'finished':    window.timerSounds.playFinished();    break;
            }
        } catch (e) {
            console.warn('[TimerBridge] playSound error:', e);
        }
    }

    // ─── Worker → Blazor relay ───────────────────────────────────────────────

    function onWorkerMessage(e) {
        const { type, payload } = e.data;

        switch (type) {
            case 'TICK':
                if (payload.soundHint) playSound(payload.soundHint);
                notifyBlazor('OnTimerTick', payload);
                break;

            case 'LEVEL_CHANGED':
                if (payload.sound) playSound(payload.sound);
                notifyBlazor('OnWorkerLevelChanged', payload);
                break;

            case 'PAUSED':
                notifyBlazor('OnTimerPaused', payload);
                break;

            case 'RESUMED':
                notifyBlazor('OnTimerResumed', payload);
                break;

            case 'TOURNAMENT_LAST_LEVEL':
                playSound('finished');
                notifyBlazor('OnTournamentLastLevel', payload);
                break;

            case 'SYNC_APPLIED':
                notifyBlazor('OnSyncApplied', payload);
                break;

            case 'STATE':
                notifyBlazor('OnTimerState', payload);
                break;

            case 'PERSIST_STATE':
                persistState(payload);
                break;

            case 'PLAY_SOUND':
                playSound(payload.sound);
                break;

            case 'ERROR':
                console.error('[TimerWorker]', payload.message);
                notifyBlazor('OnTimerError', payload);
                break;

            default:
                console.warn('[TimerBridge] Mensagem desconhecida do Worker:', type);
        }
    }

    function notifyBlazor(method, payload) {
        if (!_dotnetRef) return;
        try {
            _dotnetRef.invokeMethodAsync(method, payload);
        } catch (e) {
            console.warn('[TimerBridge] invokeMethodAsync error:', method, e);
        }
    }

    // ─── API pública (chamada via JSInterop do Blazor) ───────────────────────

    window.timerBridge = {

        /**
         * Inicializa o Worker e conecta ao Blazor.
         * @param {DotNetObjectReference} dotnetRef  — referência ao componente Blazor
         * @param {string} workerUrl                 — URL do timer-worker.js (ex: "/js/timer-worker.js")
         */
        init: function (dotnetRef, workerUrl) {
            if (_worker) {
                _worker.terminate();
                _worker = null;
            }
            _dotnetRef = dotnetRef;
            _worker = new Worker(workerUrl);
            _worker.onmessage = onWorkerMessage;
            _worker.onerror   = function (e) {
                console.error('[TimerWorker] Erro interno:', e.message);
                notifyBlazor('OnTimerError', { message: e.message });
            };
        },

        /**
         * Envia comando ao Worker.
         * @param {string} type     — tipo da mensagem (ex: 'INIT', 'PAUSE', 'SYNC', …)
         * @param {object} payload  — dados do comando
         */
        send: function (type, payload) {
            if (!_worker) {
                console.warn('[TimerBridge] Worker não inicializado. Chame init() primeiro.');
                return;
            }
            _worker.postMessage({ type, payload: payload ?? {} });
        },

        /**
         * Destrói o Worker e libera recursos.
         */
        destroy: function () {
            if (_worker) {
                _worker.terminate();
                _worker = null;
            }
            _dotnetRef = null;
        },

        /**
         * Carrega estado persistido do IndexedDB para um torneio.
         * Retorna null se não houver estado salvo.
         */
        loadPersistedState: function (tournamentId) {
            return loadPersistedState(tournamentId);
        },

        /**
         * Limpa estado persistido (ex: ao finalizar torneio).
         */
        clearPersistedState: function (tournamentId) {
            clearPersistedState(tournamentId);
        }
    };

})(window);
