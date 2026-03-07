// PokerHub Service Worker — cache inteligente por estratégia
// Estratégias: network-first | stale-while-revalidate | cache-first-ttl | network-only
// Background sync para ações offline (POST/PUT/DELETE)
// Atualização com toast não-bloqueante

'use strict';

self.importScripts('./service-worker-assets.js');

// ─── Constantes ──────────────────────────────────────────────────────────────

const APP_VERSION   = self.assetsManifest.version;
const STATIC_CACHE  = `pokerhub-static-${APP_VERSION}`;
const API_CACHE     = 'pokerhub-api-v2';                // versão separada do STATIC
const MAX_API_BYTES = 50 * 1024 * 1024;                 // 50 MB

// Padrões de assets estáticos do Blazor
const STATIC_INCLUDE = [
    /\.dll$/, /\.pdb$/, /\.wasm/, /\.html/, /\.js$/,
    /\.json$/, /\.css$/, /\.woff$/, /\.woff2$/, /\.png$/,
    /\.jpe?g$/, /\.gif$/, /\.ico$/, /\.blat$/, /\.dat$/, /\.webmanifest$/
];
const STATIC_EXCLUDE = [ /^service-worker\.js$/ ];

const base            = '/';
const baseUrl         = new URL(base, self.origin);
const manifestUrlList = self.assetsManifest.assets.map(a => new URL(a.url, baseUrl).href);

// ─── Rotas e estratégias de cache ────────────────────────────────────────────
// Ordem importa: mais específico primeiro.
// maxAge em ms. strategy: 'network-first' | 'stale-while-revalidate' | 'cache-first-ttl' | 'network-only'

const ROUTES = [
    // Auth — NUNCA cachear
    { pattern: /\/api\/auth\//,                             strategy: 'network-only' },

    // Torneio — dados em tempo real (network-first, TTL curto)
    { pattern: /\/api\/tournaments\/[^/?#]+\/timer-state/,  strategy: 'network-first',          maxAge:       30_000 },
    { pattern: /\/api\/tournaments\/[^/?#]+\/detail/,       strategy: 'network-first',          maxAge:   60_000 },
    { pattern: /\/api\/tournaments\/[^/?#]+\/payments/,     strategy: 'network-first',          maxAge:   60_000 },
    { pattern: /\/api\/tournaments\//,                      strategy: 'network-first',          maxAge:   60_000 },

    // Liga — dados menos voláteis (stale-while-revalidate, mais específico primeiro)
    { pattern: /\/api\/leagues\/[^/?#]+\/ranking/,          strategy: 'stale-while-revalidate', maxAge:  5 * 60_000 },
    { pattern: /\/api\/leagues\/[^/?#]+\/players/,          strategy: 'stale-while-revalidate', maxAge:  5 * 60_000 },
    { pattern: /\/api\/leagues\/[^/?#]+\/seasons/,          strategy: 'stale-while-revalidate', maxAge: 10 * 60_000 },
    { pattern: /\/api\/leagues\//,                          strategy: 'stale-while-revalidate', maxAge:      60_000 },

    // Jogador stats — raramente mudam (cache-first 1h)
    { pattern: /\/api\/players\/[^/?#]+\/stats/,            strategy: 'cache-first-ttl',        maxAge: 60 * 60_000 },
    { pattern: /\/api\/players\//,                          strategy: 'stale-while-revalidate', maxAge:  5 * 60_000 },

    // Prize tables — raramente mudam
    { pattern: /\/api\/prize-tables\//,                     strategy: 'cache-first-ttl',        maxAge: 24 * 60 * 60_000 },

    // Qualquer outra API GET — network-first genérico
    { pattern: /\/api\//,                                   strategy: 'network-first',          maxAge:   60_000 },
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', event => event.waitUntil(onInstall()));

async function onInstall() {
    log('Install', APP_VERSION);
    const requests = self.assetsManifest.assets
        .filter(a => STATIC_INCLUDE.some(p => p.test(a.url)))
        .filter(a => !STATIC_EXCLUDE.some(p => p.test(a.url)))
        .map(a => new Request(a.url, { integrity: a.hash, cache: 'no-cache' }));
    await caches.open(STATIC_CACHE).then(c => c.addAll(requests));
    log('Install completo — aguardando ativação');
    // Não chama skipWaiting() automaticamente: deixa o toast notificar o usuário
}

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => event.waitUntil(onActivate()));

async function onActivate() {
    log('Activate', APP_VERSION);

    // Remove caches antigos (static de versões anteriores; mantém API cache)
    const keys = await caches.keys();
    await Promise.all(
        keys
            .filter(k =>
                (k.startsWith('pokerhub-static-') || k.startsWith('offline-cache-'))
                && k !== STATIC_CACHE
            )
            .map(k => { log('Removendo cache antigo:', k); return caches.delete(k); })
    );

    await self.clients.claim();

    // Notifica clientes que a nova versão está ativa
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED', version: APP_VERSION }));
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', event => event.respondWith(onFetch(event)));

async function onFetch(event) {
    const req    = event.request;
    const url    = new URL(req.url);
    const method = req.method.toUpperCase();

    // Requisições de escrita → network-only com fila offline
    if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
        return networkOnlyWithQueue(req, url, method);
    }

    if (method !== 'GET') return fetch(req);

    // Rota por padrão
    const route = ROUTES.find(r => r.pattern.test(url.pathname + url.search));
    if (route) {
        switch (route.strategy) {
            case 'network-only':           return fetch(req);
            case 'network-first':          return networkFirst(req, route.maxAge);
            case 'stale-while-revalidate': return staleWhileRevalidate(req, event, route.maxAge);
            case 'cache-first-ttl':        return cacheFirstWithTTL(req, route.maxAge);
        }
    }

    // SPA navigation → index.html do cache
    if (req.mode === 'navigate' && !manifestUrlList.includes(req.url)) {
        const cache = await caches.open(STATIC_CACHE);
        return await cache.match('index.html') ?? fetch(req);
    }

    // Asset estático → cache-first
    const staticCache = await caches.open(STATIC_CACHE);
    return await staticCache.match(req) ?? fetch(req);
}

// ─── Estratégia: network-first ────────────────────────────────────────────────

async function networkFirst(req, maxAge) {
    const cache = await caches.open(API_CACHE);
    try {
        const res = await fetch(req);
        if (res.ok) {
            await putCached(cache, req, res.clone(), maxAge);
            log('cache MISS → network OK', req.url);
        }
        return res;
    } catch (_) {
        const cached = await getCached(cache, req, maxAge);
        if (cached) { log('cache HIT (offline)', req.url); return cached; }
        log('cache MISS (offline, sem cache)', req.url);
        return offlineResponse(req.url);
    }
}

// ─── Estratégia: stale-while-revalidate ───────────────────────────────────────

async function staleWhileRevalidate(req, event, maxAge) {
    const cache = await caches.open(API_CACHE);
    const stale = await getCached(cache, req, Infinity); // sempre retorna se existir

    const fetchAndUpdate = fetch(req).then(async res => {
        if (res.ok) await putCached(cache, req, res.clone(), maxAge);
        return res;
    }).catch(() => null);

    if (stale) {
        log('cache HIT (stale)', req.url);
        event.waitUntil(fetchAndUpdate); // atualiza em background
        return stale;
    }

    const res = await fetchAndUpdate;
    if (res) { log('cache MISS → network OK', req.url); return res; }
    return offlineResponse(req.url);
}

// ─── Estratégia: cache-first com TTL ─────────────────────────────────────────

async function cacheFirstWithTTL(req, maxAge) {
    const cache  = await caches.open(API_CACHE);
    const cached = await getCached(cache, req, maxAge);
    if (cached) { log('cache HIT (fresh)', req.url); return cached; }

    try {
        const res = await fetch(req);
        if (res.ok) await putCached(cache, req, res.clone(), maxAge);
        log('cache MISS → network OK', req.url);
        return res;
    } catch (_) {
        log('cache MISS (offline, sem cache)', req.url);
        return offlineResponse(req.url);
    }
}

// ─── Estratégia: network-only com fila offline ────────────────────────────────

async function networkOnlyWithQueue(req, url, method) {
    // Nunca enfileirar auth ou não-API
    if (url.pathname.startsWith('/api/auth/') || !url.pathname.startsWith('/api/')) {
        return fetch(req);
    }

    try {
        return await fetch(req);
    } catch (_) {
        // Falha de rede — salva na fila offline
        try {
            const body    = await req.clone().text().catch(() => '');
            const headers = {};
            req.headers.forEach((v, k) => { headers[k] = v; });

            await enqueueAction({
                id:        crypto.randomUUID(),
                method,
                url:       req.url,
                headers,
                body:      body || undefined,
                timestamp: Date.now(),
                retries:   0
            });

            // Registra background sync (Chrome/Android)
            try { await self.registration.sync.register('pokerhub-offline-queue'); } catch (_) {}

            log('QUEUED (offline):', method, req.url);
            return new Response(JSON.stringify({ queued: true, offline: true }), {
                status:  202,
                headers: { 'Content-Type': 'application/json', 'X-Offline-Queued': 'true' }
            });
        } catch (qErr) {
            log('Falha ao enfileirar ação offline:', qErr);
            return offlineResponse(req.url, 503);
        }
    }
}

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', event => {
    if (event.tag === 'pokerhub-offline-queue') {
        event.waitUntil(processOfflineQueue());
    }
});

async function processOfflineQueue() {
    log('Background sync: processando fila offline');
    let processed = 0;
    let action;

    while ((action = await dequeueAction()) !== null) {
        try {
            const res = await fetch(action.url, {
                method:  action.method,
                headers: action.headers,
                body:    action.body || undefined
            });

            if (res.ok || (res.status >= 400 && res.status < 500)) {
                // Sucesso ou erro de cliente (4xx — não retentar)
                processed++;
                log('Sync: replayado', action.method, action.url, res.status);
            } else if (action.retries < 3) {
                // Erro de servidor — retentar
                await enqueueAction({ ...action, retries: action.retries + 1 });
            }
        } catch (_) {
            // Ainda offline — recoloca na fila e para
            if (action.retries < 3) {
                await enqueueAction({ ...action, retries: action.retries + 1 });
            }
            break;
        }
    }

    if (processed > 0) {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(c => c.postMessage({ type: 'SYNC_COMPLETE', processed }));
        log('Sync concluído:', processed, 'ações processadas');
    }
}

// ─── Message handler ──────────────────────────────────────────────────────────

self.addEventListener('message', event => {
    switch (event.data?.type) {
        case 'SKIP_WAITING':
            log('SKIP_WAITING → ativando nova versão');
            self.skipWaiting();
            break;
        case 'GET_VERSION':
            event.source?.postMessage({ type: 'SW_VERSION', version: APP_VERSION });
            break;
    }
});

// ─── Helpers de cache ─────────────────────────────────────────────────────────

/** Salva resposta com metadados de TTL */
async function putCached(cache, req, res, maxAge) {
    try {
        const body    = await res.text();
        const meta    = { cachedAt: Date.now(), maxAge };
        const headers = new Headers(res.headers);
        headers.set('X-SW-Meta', JSON.stringify(meta));

        await cache.put(req, new Response(body, {
            status: res.status, statusText: res.statusText, headers
        }));

        // Verificação de tamanho assíncrona (não bloqueia a resposta)
        enforceApiCacheLimit(cache).catch(() => {});
    } catch (e) {
        log('putCached error:', e);
    }
}

/** Retorna resposta do cache se existir e dentro do TTL */
async function getCached(cache, req, maxAge) {
    const cached = await cache.match(req);
    if (!cached) return null;

    try {
        const meta = JSON.parse(cached.headers.get('X-SW-Meta') ?? '{}');
        const age  = Date.now() - (meta.cachedAt ?? 0);
        if (age > (maxAge ?? Infinity)) {
            await cache.delete(req);
            return null;
        }
        // Adiciona header informativo
        const headers = new Headers(cached.headers);
        headers.set('X-SW-Cache-Age', String(Math.round(age / 1000)) + 's');
        const body = await cached.text();
        return new Response(body, { status: cached.status, statusText: cached.statusText, headers });
    } catch (_) {
        return null;
    }
}

/** Limita o cache de API a MAX_API_BYTES (evicta os mais antigos) */
async function enforceApiCacheLimit(cache) {
    const keys = await cache.keys();
    const entries = [];
    let total = 0;

    for (const key of keys) {
        const res = await cache.match(key);
        if (!res) continue;
        const body    = await res.clone().text();
        const size    = new Blob([body]).size;
        const meta    = JSON.parse(res.headers.get('X-SW-Meta') ?? '{}');
        entries.push({ key, size, cachedAt: meta.cachedAt ?? 0 });
        total += size;
    }

    if (total <= MAX_API_BYTES) return;

    // Evicta os mais antigos até ficar em 80% do limite
    entries.sort((a, b) => a.cachedAt - b.cachedAt);
    for (const entry of entries) {
        await cache.delete(entry.key);
        total -= entry.size;
        log('Evictado do cache:', entry.key.url);
        if (total <= MAX_API_BYTES * 0.8) break;
    }
}

function offlineResponse(url, status = 503) {
    return new Response(JSON.stringify({ error: 'Offline — sem cache disponível', url }), {
        status,
        headers: { 'Content-Type': 'application/json', 'X-SW-Offline': 'true' }
    });
}

// ─── IndexedDB fila offline (no SW — acesso direto, sem postMessage) ──────────

const IDB_NAME  = 'pokerhub-offline';
const IDB_STORE = 'offline-queue';

function openSwDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                const s = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
                s.createIndex('timestamp', 'timestamp');
            }
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
    });
}

async function enqueueAction(action) {
    const db = await openSwDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(action);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror    = e => { db.close(); reject(e.target.error); };
    });
}

async function dequeueAction() {
    const db = await openSwDB();
    return new Promise((resolve, reject) => {
        const tx  = db.transaction(IDB_STORE, 'readwrite');
        const idx = tx.objectStore(IDB_STORE).index('timestamp');
        const req = idx.openCursor(null, 'next'); // mais antigo primeiro
        req.onsuccess = e => {
            const cursor = e.target.result;
            if (!cursor) { db.close(); resolve(null); return; }
            const item = cursor.value;
            cursor.delete();
            tx.oncomplete = () => { db.close(); resolve(item); };
        };
        req.onerror = e => { db.close(); reject(e.target.error); };
    });
}

// ─── Log ─────────────────────────────────────────────────────────────────────

function log(...args) {
    console.log('[SW]', ...args);
}
