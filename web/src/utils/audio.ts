// Web Audio API procedural sound synthesizer and Android Bridge Haptics

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const SoundEngine = {
  soundEnabled: true,
  volume: 0.8,
  hapticsEnabled: true,

  init() {
    getAudioContext();
  },

  // Android Native or browser vibration
  vibrate(durationMs: number = 30) {
    if (!this.hapticsEnabled) return;
    try {
      const androidBridge = (window as unknown as { AndroidBridge?: { vibrate: (ms: number) => void; hapticClick: () => void; hapticTick: () => void } }).AndroidBridge;
      if (androidBridge && typeof androidBridge.vibrate === 'function') {
        androidBridge.vibrate(durationMs);
        return;
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(durationMs);
      }
    } catch {
      // ignore
    }
  },

  hapticTick() {
    if (!this.hapticsEnabled) return;
    try {
      const androidBridge = (window as unknown as { AndroidBridge?: { hapticTick: () => void } }).AndroidBridge;
      if (androidBridge && typeof androidBridge.hapticTick === 'function') {
        androidBridge.hapticTick();
        return;
      }
      this.vibrate(12);
    } catch {
      // ignore
    }
  },

  // Cube turning sound: realistic mechanical snap/whoosh
  playTurnSound(speed: number = 1.0) {
    this.hapticTick();
    if (!this.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Pitch sweep down to simulate a plastic click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340 * speed, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch {
      // ignore
    }
  },

  // Button tap sound
  playClickSound() {
    this.hapticTick();
    if (!this.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.04);

      gain.gain.setValueAtTime(0.2 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // ignore
    }
  },

  // Timer inspection countdown tick (e.g., 8s, 12s)
  playWarningBeep(isUrgent: boolean = false) {
    this.vibrate(isUrgent ? 50 : 25);
    if (!this.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isUrgent ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isUrgent ? 880 : 587.33, now); // A5 or D5

      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // ignore
    }
  },

  // Timer start chime
  playTimerStartSound() {
    this.vibrate(40);
    if (!this.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {
      // ignore
    }
  },

  // Timer stop chime
  playTimerStopSound() {
    this.vibrate(60);
    if (!this.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.12); // C5

      gain.gain.setValueAtTime(0.35 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // ignore
    }
  },

  // Solved cube / victory celebration fanfare
  playSuccessFanfare() {
    this.vibrate(100);
    if (!this.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const startTime = ctx.currentTime + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.3 * this.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.26);
      });
    } catch {
      // ignore
    }
  },

  // Level Up / Achievement fanfare
  playLevelUpFanfare() {
    this.vibrate(150);
    if (!this.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const chordNotes = [
        { freq: 440, delay: 0 },
        { freq: 554.37, delay: 0.08 },
        { freq: 659.25, delay: 0.16 },
        { freq: 880, delay: 0.24 },
        { freq: 1108.73, delay: 0.36 }
      ];

      chordNotes.forEach(({ freq, delay }) => {
        const startTime = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.3 * this.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.42);
      });
    } catch {
      // ignore
    }
  },

  // Error buzz
  playErrorBuzz() {
    this.vibrate(80);
    if (!this.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.setValueAtTime(110, now + 0.08);

      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // ignore
    }
  }
};
