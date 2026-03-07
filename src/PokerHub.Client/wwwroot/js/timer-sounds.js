// Timer sound effects using Web Audio API
window.timerSounds = {
    audioContext: null,

    getAudioContext: function() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    },

    // Play a beep tone with configurable volume
    playTone: function(frequency, duration, type = 'sine', volume = 0.8) {
        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

            // Volume mais alto com fade out suave
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    },

    // Level change alert - som mais longo e chamativo
    playLevelChange: function() {
        // Primeira sequencia - 3 beeps de alerta agudos
        this.playTone(880, 0.15, 'square', 0.9);   // A5 - agudo
        setTimeout(() => this.playTone(880, 0.15, 'square', 0.9), 200);
        setTimeout(() => this.playTone(880, 0.15, 'square', 0.9), 400);

        // Segunda sequencia - acorde ascendente melodico
        setTimeout(() => {
            this.playTone(523, 0.25, 'sawtooth', 0.8);  // C5
            setTimeout(() => this.playTone(659, 0.25, 'sawtooth', 0.8), 150);  // E5
            setTimeout(() => this.playTone(784, 0.25, 'sawtooth', 0.8), 300);  // G5
            setTimeout(() => this.playTone(1047, 0.4, 'sawtooth', 0.9), 450);  // C6
        }, 600);
    },

    // Warning beep - single tone louder
    playWarning: function() {
        this.playTone(800, 0.25, 'square', 0.85);
    },

    // Critical warning - rapid beeps louder
    playCritical: function() {
        this.playTone(1000, 0.12, 'square', 0.9);
        setTimeout(() => this.playTone(1000, 0.12, 'square', 0.9), 180);
        setTimeout(() => this.playTone(1000, 0.12, 'square', 0.9), 360);
    },

    // Tournament finished - victory sound
    playFinished: function() {
        this.playTone(523, 0.25, 'sine', 0.85);  // C5
        setTimeout(() => this.playTone(659, 0.25, 'sine', 0.85), 250);  // E5
        setTimeout(() => this.playTone(784, 0.25, 'sine', 0.85), 500);  // G5
        setTimeout(() => this.playTone(1047, 0.5, 'sine', 0.9), 750);   // C6
    },

    // Break start - relaxing but noticeable tone
    playBreakStart: function() {
        this.playTone(392, 0.35, 'triangle', 0.75);  // G4
        setTimeout(() => this.playTone(523, 0.5, 'triangle', 0.8), 350);  // C5
    }
};
