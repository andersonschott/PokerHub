// Screen Wake Lock API - Prevents screen from sleeping
let wakeLock = null;

async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
            console.log('Wake Lock acquired');
            return true;
        } catch (err) {
            console.error('Wake Lock error:', err.name, err.message);
            return false;
        }
    }
    console.log('Wake Lock API not supported');
    return false;
}

async function releaseWakeLock() {
    if (wakeLock !== null) {
        try {
            await wakeLock.release();
            wakeLock = null;
            console.log('Wake Lock released manually');
        } catch (err) {
            console.error('Wake Lock release error:', err);
        }
    }
}

// Re-acquire wake lock when page becomes visible again
// (Wake Lock is automatically released when page is hidden)
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock re-acquired after visibility change');
        } catch (err) {
            console.error('Wake Lock re-acquire error:', err);
        }
    }
});