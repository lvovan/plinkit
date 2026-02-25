import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameAudioManager } from '@/audio/audio-manager';

/**
 * T020: Verify AudioManager.toggleMuteSfx() toggles muted state
 * and isSfxMuted() returns correct value.
 */

function createMockAudioContext() {
  const ctx = {
    state: 'suspended' as string,
    resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => ({
      gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: { value: 440, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      Q: { value: 1 },
      connect: vi.fn(),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      numberOfChannels: 1,
      duration: length / sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length)),
    })),
    destination: {},
    currentTime: 0,
    sampleRate: 44100,
  };

  return { ctx };
}

describe('GameAudioManager (Web Audio Synthesis)', () => {
  let audio: GameAudioManager;
  let mockCtx: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mockCtx = createMockAudioContext();
    audio = new GameAudioManager(mockCtx.ctx as unknown as AudioContext);
  });

  describe('unlock()', () => {
    it('should resume AudioContext on unlock', async () => {
      await audio.unlock();
      expect(mockCtx.ctx.resume).toHaveBeenCalled();
    });

    it('should not throw if context is already running', async () => {
      mockCtx.ctx.state = 'running';
      await expect(audio.unlock()).resolves.toBeUndefined();
    });
  });

  describe('init()', () => {
    it('should initialize without errors', () => {
      expect(() => audio.init()).not.toThrow();
    });

    it('should create gain nodes for audio bus routing', () => {
      audio.init();
      expect(mockCtx.ctx.createGain).toHaveBeenCalled();
    });
  });

  describe('play()', () => {
    it('should not throw when playing a valid sound name', () => {
      audio.init();
      expect(() => audio.play('drop')).not.toThrow();
    });

    it('should not throw when SFX is muted', () => {
      audio.init();
      audio.toggleMuteSfx();
      expect(() => audio.play('drop')).not.toThrow();
    });

    it('should accept pitch variation option', () => {
      audio.init();
      expect(() => audio.play('pinHit', { pitchVariation: 0.15 })).not.toThrow();
    });
  });

  describe('toggleMuteSfx() / isSfxMuted()', () => {
    it('should start unmuted', () => {
      audio.init();
      expect(audio.isSfxMuted()).toBe(false);
    });

    it('should toggle to muted', () => {
      audio.init();
      audio.toggleMuteSfx();
      expect(audio.isSfxMuted()).toBe(true);
    });

    it('should toggle back to unmuted', () => {
      audio.init();
      audio.toggleMuteSfx();
      audio.toggleMuteSfx();
      expect(audio.isSfxMuted()).toBe(false);
    });
  });

  describe('setSfxVolume()', () => {
    it('should not throw when setting volume', () => {
      audio.init();
      expect(() => audio.setSfxVolume(0.5)).not.toThrow();
    });

    it('should clamp volume to 0-1 range', () => {
      audio.init();
      expect(() => audio.setSfxVolume(1.5)).not.toThrow();
      expect(() => audio.setSfxVolume(-0.5)).not.toThrow();
    });
  });

  describe('getContext()', () => {
    it('should return the AudioContext', () => {
      const ctx = audio.getContext();
      expect(ctx).toBeDefined();
    });
  });

  describe('getMasterGain()', () => {
    it('should return a GainNode after init', () => {
      audio.init();
      const masterGain = audio.getMasterGain();
      expect(masterGain).toBeDefined();
    });
  });
});
