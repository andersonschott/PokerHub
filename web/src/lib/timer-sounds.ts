/**
 * Sons do timer via Web Audio API — porta de `wwwroot/js/timer-sounds.js` do Blazor.
 * Mesmas notas/sequências de `playLevelChange` e `playBreakStart`.
 *
 * Política de autoplay: em mobile o AudioContext nasce `suspended` sem gesto do usuário.
 * `primeAudioOnGesture()` faz resume no 1º toque; cada play também tenta resume.
 */

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    return ctx;
  } catch {
    return null;
  }
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.8,
): void {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') void c.resume();

    const oscillator = c.createOscillator();
    const gain = c.createGain();
    oscillator.connect(gain);
    gain.connect(c.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + duration);

    oscillator.start(c.currentTime);
    oscillator.stop(c.currentTime + duration);
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

/** Virada de nível — 3 beeps agudos + acorde ascendente melódico. */
export function playLevelChange(): void {
  playTone(880, 0.15, 'square', 0.9);
  setTimeout(() => playTone(880, 0.15, 'square', 0.9), 200);
  setTimeout(() => playTone(880, 0.15, 'square', 0.9), 400);
  setTimeout(() => {
    playTone(523, 0.25, 'sawtooth', 0.8);
    setTimeout(() => playTone(659, 0.25, 'sawtooth', 0.8), 150);
    setTimeout(() => playTone(784, 0.25, 'sawtooth', 0.8), 300);
    setTimeout(() => playTone(1047, 0.4, 'sawtooth', 0.9), 450);
  }, 600);
}

/** Início de intervalo — tom relaxante porém perceptível. */
export function playBreakStart(): void {
  playTone(392, 0.35, 'triangle', 0.75);
  setTimeout(() => playTone(523, 0.5, 'triangle', 0.8), 350);
}

/** Libera o AudioContext no 1º gesto do usuário (contorna a autoplay policy mobile). */
export function primeAudioOnGesture(): void {
  const resume = () => {
    const c = getCtx();
    if (c && c.state === 'suspended') void c.resume();
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('touchstart', resume);
  };
  window.addEventListener('pointerdown', resume, { once: true });
  window.addEventListener('touchstart', resume, { once: true });
}
