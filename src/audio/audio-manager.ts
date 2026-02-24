import type { AudioManager, SoundName, SpriteMap } from '@/types/contracts';

/**
 * AudioManager implementation using Web Audio API.
 * Loads an audio sprite sheet and plays named sounds with optional pitch variation.
 */
export class GameAudioManager implements AudioManager {
  private ctx: AudioContext | null;
  private masterGain: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private spriteMap: SpriteMap = {};
  private muted = false;
  private savedVolume = 1;

  constructor(ctx?: AudioContext) {
    this.ctx = ctx ?? null;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  async load(spriteUrl: string, spriteMap: SpriteMap): Promise<void> {
    this.spriteMap = spriteMap;
    const ctx = this.ensureContext();
    const response = await fetch(spriteUrl);
    const arrayBuffer = await response.arrayBuffer();
    this.buffer = await ctx.decodeAudioData(arrayBuffer);
  }

  play(name: SoundName, options?: { pitchVariation?: number }): void {
    if (!this.buffer || this.muted) return;

    const sprite = this.spriteMap[name];
    if (!sprite) return;

    const ctx = this.ensureContext();
    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.masterGain!);

    // Apply pitch variation if specified
    if (options?.pitchVariation) {
      const variation = options.pitchVariation;
      // Random pitch between (1 - variation) and (1 + variation)
      const pitch = 1 + (Math.random() * 2 - 1) * variation;
      source.playbackRate.value = pitch;
    }

    source.start(0, sprite.offset, sprite.duration);
  }

  setVolume(volume: number): void {
    this.ensureContext();
    const clamped = Math.max(0, Math.min(1, volume));
    this.masterGain!.gain.value = clamped;
    if (!this.muted) {
      this.savedVolume = clamped;
    }
  }

  toggleMute(): void {
    this.ensureContext();
    if (this.muted) {
      this.muted = false;
      this.masterGain!.gain.value = this.savedVolume;
    } else {
      this.savedVolume = this.masterGain!.gain.value;
      this.muted = true;
      this.masterGain!.gain.value = 0;
    }
  }
}
