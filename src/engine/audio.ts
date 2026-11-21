import { PlatformSettings } from '@/src/types/platform';

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private settings: PlatformSettings = {
    soundEnabled: true,
    musicEnabled: true,
    volume: 0.65,
    graphicsQuality: 'medium',
    theme: 'dark',
    language: 'uz',
  };

  public syncSettings(settings: PlatformSettings) {
    this.settings = settings;
    if (!settings.musicEnabled && this.musicTimer !== null) {
      this.stopMusic();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainLevel = 0.2,
    freqEnd?: number,
  ) {
    if (!this.settings.soundEnabled || this.settings.volume <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, freqEnd),
        now + duration,
      );
    }

    const vol = gainLevel * this.settings.volume;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playCollect() {
    this.playTone(587.33, 0.12, 'triangle', 0.22, 880);
    window.setTimeout(() => {
      this.playTone(880, 0.14, 'sine', 0.18, 1174.66);
    }, 65);
  }

  public playJump() {
    this.playTone(220, 0.16, 'sine', 0.18, 460);
  }

  public playKick() {
    this.playTone(135, 0.14, 'triangle', 0.3, 55);
  }

  public playLaser() {
    this.playTone(760, 0.13, 'sawtooth', 0.12, 240);
  }

  public playBoost() {
    this.playTone(240, 0.25, 'sawtooth', 0.15, 620);
  }

  public playBump() {
    this.playTone(110, 0.16, 'square', 0.16, 48);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      window.setTimeout(() => {
        this.playTone(n, 0.24, 'triangle', 0.2);
      }, idx * 100);
    });
  }

  public playGameOver() {
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((n, idx) => {
      window.setTimeout(() => {
        this.playTone(n, 0.25, 'sawtooth', 0.12);
      }, idx * 120);
    });
  }

  public startMusic(mood: 'cheerful' | 'action' | 'ambient' = 'cheerful') {
    if (!this.settings.musicEnabled || this.settings.volume <= 0.01) return;
    if (this.musicTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const scales: Record<'cheerful' | 'action' | 'ambient', number[]> = {
      cheerful: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63],
      action: [196.0, 233.08, 293.66, 392.0, 293.66, 233.08],
      ambient: [220.0, 261.63, 329.63, 440.0, 329.63, 261.63],
    };
    const notes = scales[mood];

    this.musicTimer = window.setInterval(() => {
      if (!this.settings.musicEnabled || !this.ctx) return;
      const freq = notes[this.musicStep % notes.length];
      this.musicStep += 1;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = mood === 'action' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const vol = 0.045 * this.settings.volume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.44);
    }, 460);
  }

  public stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new ProceduralAudioEngine();

export function speakUzbekHint(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'uz-UZ';
    utter.rate = 0.95;
    utter.pitch = 1.05;
    utter.volume = 0.7;
    window.speechSynthesis.speak(utter);
  } catch {
    // Gracefully ignore if TTS unavailable in browser
  }
}
