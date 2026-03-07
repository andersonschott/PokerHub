// PokerHub Timer Web Worker
// Usa timestamp absoluto para evitar drift acumulativo.
// Funciona 100% offline — não depende de SignalR ou qualquer rede.
// Persiste estado no IndexedDB a cada 10 segundos.

'use strict';

let timerState = {
    isRunning: false,
    isPaused: false,
    levelStartedAt: null,      // timestamp absoluto (ms) do início do nível atual
    levelDurationMs: 0,        // duração total do nível em ms
    pausedTimeRemaining: 0,    // ms restantes no momento do pause
    currentLevel: 0,           // índice do nível atual (Order)
    blindStructure: [],        // array completo de BlindLevelDto
    tournamentId: null
};

let tickInterval = null;
let persistInterval = null;
const DB_NAME = 'PokerHubTimer';
const DB_STORE = 'timerState';
const PERSIST_INTERVAL_MS = 10_000;
const TICK_INTERVAL_MS = 250;

// ─── Entrada de mensagens ───────────────────────────────────────────────────

self.onmessage = function (e) {
    const { type, payload } = e.data;
    switch (type) {
        case 'INIT':        initTimer(payload);      break;
        case 'SYNC':        syncFromServer(payload); break;
        case 'PAUSE':       pauseTimer();            break;
        case 'RESUME':      resumeTimer();           break;
        case 'SKIP_LEVEL':  skipToNextLevel();       break;
        case 'PREV_LEVEL':  goToPreviousLevel();     break;
        case 'GET_STATE':   postState();             break;
        default:
            console.warn('[TimerWorker] Mensagem desconhecida:', type);
    }
};

// ─── Init ───────────────────────────────────────────────────────────────────

function initTimer(payload) {
    timerState.tournamentId   = payload.tournamentId;
    timerState.blindStructure = payload.blindStructure || [];
    timerState.currentLevel   = payload.currentLevel  ?? 1;
    timerState.isPaused       = payload.isPaused      ?? false;

    const level = getCurrentBlindLevel();
    if (!level) {
        self.postMessage({ type: 'ERROR', payload: { message: 'Nível de blind não encontrado na estrutura.' } });
        return;
    }

    timerState.levelDurationMs = level.durationMinutes * 60 * 1000;

    if (payload.timeRemainingSeconds != null) {
        const elapsedMs = timerState.levelDurationMs - (payload.timeRemainingSeconds * 1000);
        timerState.levelStartedAt = Date.now() - Math.max(0, elapsedMs);
        timerState.pausedTimeRemaining = timerState.isPaused ? payload.timeRemainingSeconds * 1000 : 0;
    } else {
        timerState.levelStartedAt = Date.now();
        timerState.pausedTimeRemaining = 0;
    }

    timerState.isRunning = !timerState.isPaused;

    startTicking();
    startPersisting();
    postState();
}

// ─── Tick ───────────────────────────────────────────────────────────────────

function startTicking() {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(tick, TICK_INTERVAL_MS);
}

function tick() {
    if (!timerState.isRunning || timerState.isPaused) return;

    const now        = Date.now();
    const elapsed    = now - timerState.levelStartedAt;
    const remaining  = Math.max(0, timerState.levelDurationMs - elapsed);
    const secondsRemaining = Math.ceil(remaining / 1000);

    if (remaining <= 0) {
        advanceLevel();
        return;
    }

    // Alertas sonoros baseados em tempo restante
    let soundHint = null;
    if (secondsRemaining === 10) soundHint = 'critical';
    else if (secondsRemaining === 60) soundHint = 'warning';

    self.postMessage({
        type: 'TICK',
        payload: {
            secondsRemaining,
            currentLevel: timerState.currentLevel,
            blind:        getCurrentBlindLevel(),
            nextBlind:    getNextBlindLevel(),
            soundHint,
            isOffline:    true
        }
    });
}

// ─── Advance / Previous Level ────────────────────────────────────────────────

function advanceLevel() {
    const nextLevel = getNextBlindLevel();

    if (!nextLevel) {
        // Último nível da estrutura
        timerState.isRunning = false;
        self.postMessage({ type: 'TOURNAMENT_LAST_LEVEL', payload: { currentLevel: timerState.currentLevel } });
        return;
    }

    timerState.currentLevel    = nextLevel.order;
    timerState.levelDurationMs = nextLevel.durationMinutes * 60 * 1000;
    timerState.levelStartedAt  = Date.now();
    timerState.pausedTimeRemaining = 0;

    const sound = nextLevel.isBreak ? 'breakStart' : 'levelChange';

    self.postMessage({
        type: 'LEVEL_CHANGED',
        payload: {
            currentLevel: timerState.currentLevel,
            blind:        nextLevel,
            nextBlind:    getNextBlindLevel(),
            sound
        }
    });

    // Dispara som no bridge (que não tem acesso ao AudioContext)
    self.postMessage({ type: 'PLAY_SOUND', payload: { sound } });
}

function goToPreviousLevel() {
    const prevLevel = getPreviousBlindLevel();
    if (!prevLevel) return;

    timerState.currentLevel    = prevLevel.order;
    timerState.levelDurationMs = prevLevel.durationMinutes * 60 * 1000;
    timerState.levelStartedAt  = Date.now();
    timerState.pausedTimeRemaining = 0;

    self.postMessage({
        type: 'LEVEL_CHANGED',
        payload: {
            currentLevel: timerState.currentLevel,
            blind:        prevLevel,
            nextBlind:    getCurrentBlindLevel(), // o que era "atual" agora é o próximo
            sound:        null
        }
    });
}

function skipToNextLevel() {
    advanceLevel();
}

// ─── Pause / Resume ──────────────────────────────────────────────────────────

function pauseTimer() {
    if (timerState.isPaused) return;

    const elapsed = Date.now() - timerState.levelStartedAt;
    timerState.pausedTimeRemaining = Math.max(0, timerState.levelDurationMs - elapsed);
    timerState.isPaused  = true;
    timerState.isRunning = false;

    self.postMessage({
        type: 'PAUSED',
        payload: { timeRemainingMs: timerState.pausedTimeRemaining }
    });
}

function resumeTimer() {
    if (!timerState.isPaused) return;

    // Recalcula levelStartedAt com base no tempo restante salvo
    timerState.levelStartedAt = Date.now() - (timerState.levelDurationMs - timerState.pausedTimeRemaining);
    timerState.pausedTimeRemaining = 0;
    timerState.isPaused  = false;
    timerState.isRunning = true;

    self.postMessage({ type: 'RESUMED', payload: {} });
}

// ─── Sync com servidor ───────────────────────────────────────────────────────

function syncFromServer(payload) {
    // payload: { timeRemainingSeconds, currentLevel, isPaused }
    const THRESHOLD_MS = 2000; // 2 segundos

    // Se o nível mudou, aceita direto
    if (payload.currentLevel !== timerState.currentLevel) {
        timerState.currentLevel = payload.currentLevel;
        const level = getCurrentBlindLevel();
        if (level) {
            timerState.levelDurationMs = level.durationMinutes * 60 * 1000;
        }
        const remainingMs = (payload.timeRemainingSeconds ?? 0) * 1000;
        timerState.levelStartedAt = Date.now() - (timerState.levelDurationMs - remainingMs);
        self.postMessage({ type: 'SYNC_APPLIED', payload: { drift: null, serverWins: true, reason: 'levelChanged' } });
        return;
    }

    // Mesmo nível — calcula drift
    const elapsed          = Date.now() - timerState.levelStartedAt;
    const localRemainingMs = Math.max(0, timerState.levelDurationMs - elapsed);
    const serverRemainingMs = (payload.timeRemainingSeconds ?? 0) * 1000;
    const driftMs           = Math.abs(localRemainingMs - serverRemainingMs);

    if (driftMs >= THRESHOLD_MS) {
        // Servidor ganha — ajusta levelStartedAt
        timerState.levelStartedAt = Date.now() - (timerState.levelDurationMs - serverRemainingMs);
        self.postMessage({ type: 'SYNC_APPLIED', payload: { drift: driftMs, serverWins: true, reason: 'driftExceeded' } });
    } else {
        // Diferença pequena — ajuste suave (não pula)
        self.postMessage({ type: 'SYNC_APPLIED', payload: { drift: driftMs, serverWins: false, reason: 'withinThreshold' } });
    }

    // Sincroniza estado de pause/resume se diferente
    if (payload.isPaused !== undefined && payload.isPaused !== timerState.isPaused) {
        if (payload.isPaused) pauseTimer();
        else resumeTimer();
    }
}

// ─── postState ───────────────────────────────────────────────────────────────

function postState() {
    const elapsed         = timerState.isRunning && !timerState.isPaused
        ? Date.now() - timerState.levelStartedAt
        : timerState.levelDurationMs - timerState.pausedTimeRemaining;
    const remainingMs     = Math.max(0, timerState.levelDurationMs - elapsed);
    const secondsRemaining = Math.ceil(remainingMs / 1000);

    self.postMessage({
        type: 'STATE',
        payload: {
            tournamentId:      timerState.tournamentId,
            currentLevel:      timerState.currentLevel,
            isPaused:          timerState.isPaused,
            isRunning:         timerState.isRunning,
            secondsRemaining,
            blind:             getCurrentBlindLevel(),
            nextBlind:         getNextBlindLevel(),
            isOffline:         true
        }
    });
}

// ─── Helpers de blind structure ──────────────────────────────────────────────

function getCurrentBlindLevel() {
    return timerState.blindStructure.find(b => b.order === timerState.currentLevel) ?? null;
}

function getNextBlindLevel() {
    const sorted = timerState.blindStructure
        .filter(b => b.order > timerState.currentLevel)
        .sort((a, b) => a.order - b.order);
    return sorted[0] ?? null;
}

function getPreviousBlindLevel() {
    const sorted = timerState.blindStructure
        .filter(b => b.order < timerState.currentLevel)
        .sort((a, b) => b.order - a.order);
    return sorted[0] ?? null;
}

// ─── IndexedDB persistence ───────────────────────────────────────────────────

function startPersisting() {
    if (persistInterval) clearInterval(persistInterval);
    persistInterval = setInterval(saveToIndexedDB, PERSIST_INTERVAL_MS);
}

function saveToIndexedDB() {
    if (!timerState.tournamentId) return;

    // Calcula remaining atual para persistir valor correto
    const elapsed        = timerState.isRunning && !timerState.isPaused
        ? Date.now() - timerState.levelStartedAt
        : timerState.levelDurationMs - timerState.pausedTimeRemaining;
    const remainingMs    = Math.max(0, timerState.levelDurationMs - elapsed);

    const snapshot = {
        tournamentId:      timerState.tournamentId,
        currentLevel:      timerState.currentLevel,
        isPaused:          timerState.isPaused,
        remainingMs,
        levelDurationMs:   timerState.levelDurationMs,
        blindStructure:    timerState.blindStructure,
        savedAt:           Date.now()
    };

    // Solicita ao bridge persistir no IndexedDB (Worker não acessa IndexedDB diretamente em todos os browsers)
    self.postMessage({ type: 'PERSIST_STATE', payload: snapshot });
}
