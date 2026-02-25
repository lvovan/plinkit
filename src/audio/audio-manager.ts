import type { AudioManager, SoundName } from '@/types/contracts';
import {
  playDrop,
  playPinHit,
  playShove,
  playBucketLand,
  playWinner,
  playTick,
  playTimeout,
} from './synth-effects';

/**
 * AudioManager implementation using Web Audio API synthesis.
 * All sounds are generated programmatically — no audio files loaded.
 *
 * Audio bus routing:
 *   AudioContext → masterGain → sfxGain → [SFX nodes]
 *                             ↘ (MusicManager connects to masterGain)
 */
export class GameAudioManager implements AudioManager {
  private ctx: AudioContext | null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted = false;
  private sfxVolume = 0.7;
  private initialized = false;

  constructor(ctx?: AudioContext) {
    this.ctx = ctx ?? null;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  init(): void {
    if (this.initialized) return;
    const ctx = this.ensureContext();

    // Master gain → destination
    this.masterGain = ctx.createGain();
    this.masterGain.connect(ctx.destination);

    // SFX gain → master gain
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this.initialized = true;
  }

  play(name: SoundName, options?: { pitchVariation?: number }): void {
    if (this.muted || !this.sfxGain) return;

    const ctx = this.ensureContext();
    const dest = this.sfxGain;

    switch (name) {
      case 'drop':
        playDrop(ctx, dest);
        break;
      case 'pinHit':
        playPinHit(ctx, dest, options?.pitchVariation);
        break;
      case 'shove':
        playShove(ctx, dest);
        break;
      case 'bucketLand':
        playBucketLand(ctx, dest);
        break;
      case 'winner':
        playWinner(ctx, dest);
        break;
      case 'tick':
        playTick(ctx, dest);
        break;
      case 'timeout':
        playTimeout(ctx, dest);
        break;
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain && !this.muted) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  toggleMuteSfx(): void {
    this.muted = !this.muted;
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.muted ? 0 : this.sfxVolume;
    }
  }

  isSfxMuted(): boolean {
    return this.muted;
  }

  getContext(): AudioContext {
    return this.ensureContext();
  }

  getMasterGain(): GainNode {
    if (!this.masterGain) {
      this.init();
    }
    return this.masterGain!;
  }
}
