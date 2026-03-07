// PokerHub IndexedDB Service
// Cache offline para dados de torneio, timer, fila de ações e sessão.
// Todas as operações são wrapped em try/catch — IndexedDB pode falhar em modo incógnito.

'use strict';

(function (window) {
    const DB_NAME    = 'pokerhub-offline';
    const DB_VERSION = 1;

    const STORES = {
        ACTIVE_TOURNAMENT: 'active-tournament',
        TIMER_STATE:       'timer-state',
        BLIND_STRUCTURE:   'blind-structure',
        OFFLINE_QUEUE:     'offline-queue',
        USER_SESSION:      'user-session',
        RANKINGS_CACHE:    'rankings-cache',
        LEAGUE_DATA:       'league-data'
    };

    // TTL em ms
    const TTL = {
        RANKINGS: 24 * 60 * 60 * 1000,  // 24h
        LEAGUE:    1 * 60 * 60 * 1000   //  1h
    };

    let _db = null;

    // ── Conexão ─────────────────────────────────────────────────────────────

    function openDB() {
        if (_db) return Promise.resolve(_db);

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = e => {
                const db = e.target.result;
                Object.values(STORES).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'id' });
                        if (storeName === STORES.OFFLINE_QUEUE) {
                            store.createIndex('timestamp', 'timestamp');
                        }
                    }
                });
            };

            req.onsuccess = e => {
                _db = e.target.result;

                // Reconexão automática se a conexão for fechada inesperadamente
                _db.onclose = () => { _db = null; };
                _db.onversionchange = () => { _db.close(); _db = null; };

                resolve(_db);
            };

            req.onerror   = e => reject(e.target.error);
            req.onblocked = () => reject(new Error('IndexedDB bloqueado por outra aba'));
        });
    }

    // ── CRUD genérico ────────────────────────────────────────────────────────

    async function get(storeName, id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(storeName, 'readonly')
                          .objectStore(storeName)
                          .get(id);
            req.onsuccess = e => resolve(e.target.result ?? null);
            req.onerror   = e => reject(e.target.error);
        });
    }

    async function put(storeName, data) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(storeName, 'readwrite')
                          .objectStore(storeName)
                          .put(data);
            req.onsuccess = () => resolve();
            req.onerror   = e => reject(e.target.error);
        });
    }

    async function remove(storeName, id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(storeName, 'readwrite')
                          .objectStore(storeName)
                          .delete(id);
            req.onsuccess = () => resolve();
            req.onerror   = e => reject(e.target.error);
        });
    }

    async function getAll(storeName) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(storeName, 'readonly')
                          .objectStore(storeName)
                          .getAll();
            req.onsuccess = e => resolve(e.target.result ?? []);
            req.onerror   = e => reject(e.target.error);
        });
    }

    async function clear(storeName) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(storeName, 'readwrite')
                          .objectStore(storeName)
                          .clear();
            req.onsuccess = () => resolve();
            req.onerror   = e => reject(e.target.error);
        });
    }

    async function count(storeName) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(storeName, 'readonly')
                          .objectStore(storeName)
                          .count();
            req.onsuccess = e => resolve(e.target.result);
            req.onerror   = e => reject(e.target.error);
        });
    }

    // ── API pública ──────────────────────────────────────────────────────────

    window.pokerhubDB = {

        // ── CRUD genérico (exposto para casos avançados) ─────────────────────

        async get(store, id) {
            try { return await get(store, id); }
            catch (e) { console.warn('[pokerhubDB] get error:', e); return null; }
        },

        async put(store, data) {
            try { await put(store, data); }
            catch (e) { console.warn('[pokerhubDB] put error:', e); }
        },

        async delete(store, id) {
            try { await remove(store, id); }
            catch (e) { console.warn('[pokerhubDB] delete error:', e); }
        },

        async getAll(store) {
            try { return await getAll(store); }
            catch (e) { console.warn('[pokerhubDB] getAll error:', e); return []; }
        },

        async clear(store) {
            try { await clear(store); }
            catch (e) { console.warn('[pokerhubDB] clear error:', e); }
        },

        // ── Timer State ──────────────────────────────────────────────────────

        async saveTimerState(tournamentId, state) {
            try {
                await put(STORES.TIMER_STATE, { id: tournamentId, ...state, savedAt: Date.now() });
            } catch (e) { console.warn('[pokerhubDB] saveTimerState error:', e); }
        },

        async getTimerState(tournamentId) {
            try { return await get(STORES.TIMER_STATE, tournamentId); }
            catch (e) { console.warn('[pokerhubDB] getTimerState error:', e); return null; }
        },

        async deleteTimerState(tournamentId) {
            try { await remove(STORES.TIMER_STATE, tournamentId); }
            catch (e) { console.warn('[pokerhubDB] deleteTimerState error:', e); }
        },

        // ── Active Tournament ────────────────────────────────────────────────

        async saveActiveTournament(tournament) {
            try {
                await put(STORES.ACTIVE_TOURNAMENT, { ...tournament, savedAt: Date.now() });
            } catch (e) { console.warn('[pokerhubDB] saveActiveTournament error:', e); }
        },

        async getActiveTournament(tournamentId) {
            try { return await get(STORES.ACTIVE_TOURNAMENT, tournamentId); }
            catch (e) { console.warn('[pokerhubDB] getActiveTournament error:', e); return null; }
        },

        async deleteActiveTournament(tournamentId) {
            try { await remove(STORES.ACTIVE_TOURNAMENT, tournamentId); }
            catch (e) { console.warn('[pokerhubDB] deleteActiveTournament error:', e); }
        },

        // ── Blind Structure ──────────────────────────────────────────────────

        async saveBlindStructure(tournamentId, blinds) {
            try {
                await put(STORES.BLIND_STRUCTURE, { id: tournamentId, blinds, savedAt: Date.now() });
            } catch (e) { console.warn('[pokerhubDB] saveBlindStructure error:', e); }
        },

        async getBlindStructure(tournamentId) {
            try {
                const row = await get(STORES.BLIND_STRUCTURE, tournamentId);
                return row ? row.blinds : null;
            } catch (e) { console.warn('[pokerhubDB] getBlindStructure error:', e); return null; }
        },

        // ── Offline Queue ────────────────────────────────────────────────────

        async enqueueOfflineAction(action) {
            // action: { id, actionType, payloadJson, timestamp, retries }
            try {
                await put(STORES.OFFLINE_QUEUE, { ...action, timestamp: action.timestamp ?? Date.now() });
            } catch (e) { console.warn('[pokerhubDB] enqueueOfflineAction error:', e); }
        },

        async dequeueOfflineAction() {
            // Retorna a ação mais antiga e a remove da fila
            try {
                const db = await openDB();
                return new Promise((resolve, reject) => {
                    const tx    = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite');
                    const store = tx.objectStore(STORES.OFFLINE_QUEUE);
                    const idx   = store.index('timestamp');

                    const req = idx.openCursor(null, 'next'); // cursor ascendente (mais antigo primeiro)
                    req.onsuccess = e => {
                        const cursor = e.target.result;
                        if (!cursor) { resolve(null); return; }

                        const item = cursor.value;
                        cursor.delete();
                        resolve(item);
                    };
                    req.onerror = e => reject(e.target.error);
                });
            } catch (e) {
                console.warn('[pokerhubDB] dequeueOfflineAction error:', e);
                return null;
            }
        },

        async peekOfflineQueue() {
            // Retorna todas as ações na fila sem remover (para exibição)
            try {
                const db = await openDB();
                return new Promise((resolve, reject) => {
                    const req = db.transaction(STORES.OFFLINE_QUEUE, 'readonly')
                                  .objectStore(STORES.OFFLINE_QUEUE)
                                  .index('timestamp')
                                  .getAll();
                    req.onsuccess = e => resolve(e.target.result ?? []);
                    req.onerror   = e => reject(e.target.error);
                });
            } catch (e) {
                console.warn('[pokerhubDB] peekOfflineQueue error:', e);
                return [];
            }
        },

        async getOfflineQueueSize() {
            try { return await count(STORES.OFFLINE_QUEUE); }
            catch (e) { console.warn('[pokerhubDB] getOfflineQueueSize error:', e); return 0; }
        },

        async clearOfflineQueue() {
            try { await clear(STORES.OFFLINE_QUEUE); }
            catch (e) { console.warn('[pokerhubDB] clearOfflineQueue error:', e); }
        },

        async incrementRetries(actionId) {
            try {
                const row = await get(STORES.OFFLINE_QUEUE, actionId);
                if (row) {
                    row.retries = (row.retries ?? 0) + 1;
                    await put(STORES.OFFLINE_QUEUE, row);
                }
            } catch (e) { console.warn('[pokerhubDB] incrementRetries error:', e); }
        },

        // ── User Session ─────────────────────────────────────────────────────

        async saveUserSession(session) {
            // session: { id: 'session', userId, userName, token, leagueIds, ... }
            try { await put(STORES.USER_SESSION, { id: 'session', ...session }); }
            catch (e) { console.warn('[pokerhubDB] saveUserSession error:', e); }
        },

        async getUserSession() {
            try { return await get(STORES.USER_SESSION, 'session'); }
            catch (e) { console.warn('[pokerhubDB] getUserSession error:', e); return null; }
        },

        async clearUserSession() {
            try { await remove(STORES.USER_SESSION, 'session'); }
            catch (e) { console.warn('[pokerhubDB] clearUserSession error:', e); }
        },

        // ── Rankings Cache ────────────────────────────────────────────────────

        async saveRankingsCache(leagueId, data) {
            try {
                await put(STORES.RANKINGS_CACHE, { id: leagueId, data, savedAt: Date.now() });
            } catch (e) { console.warn('[pokerhubDB] saveRankingsCache error:', e); }
        },

        async getRankingsCache(leagueId) {
            try {
                const row = await get(STORES.RANKINGS_CACHE, leagueId);
                if (!row) return null;
                if (Date.now() - row.savedAt > TTL.RANKINGS) {
                    await remove(STORES.RANKINGS_CACHE, leagueId); // expirado
                    return null;
                }
                return row.data;
            } catch (e) { console.warn('[pokerhubDB] getRankingsCache error:', e); return null; }
        },

        // ── League Data Cache ─────────────────────────────────────────────────

        async saveLeagueData(leagueId, data) {
            try {
                await put(STORES.LEAGUE_DATA, { id: leagueId, data, savedAt: Date.now() });
            } catch (e) { console.warn('[pokerhubDB] saveLeagueData error:', e); }
        },

        async getLeagueData(leagueId) {
            try {
                const row = await get(STORES.LEAGUE_DATA, leagueId);
                if (!row) return null;
                if (Date.now() - row.savedAt > TTL.LEAGUE) {
                    await remove(STORES.LEAGUE_DATA, leagueId); // expirado
                    return null;
                }
                return row.data;
            } catch (e) { console.warn('[pokerhubDB] getLeagueData error:', e); return null; }
        },

        // ── Utilitários ───────────────────────────────────────────────────────

        /** Limpa TUDO (logout / reset) */
        async clearAll() {
            try {
                await Promise.all(Object.values(STORES).map(s => clear(s)));
            } catch (e) { console.warn('[pokerhubDB] clearAll error:', e); }
        },

        /** Inicializa o DB (útil para pré-aquecer na startup) */
        async initialize() {
            try { await openDB(); return true; }
            catch (e) { console.warn('[pokerhubDB] initialize error:', e); return false; }
        }
    };

})(window);
