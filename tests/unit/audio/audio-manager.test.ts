import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameAudioManager } from '@/audio/audio-manager';

// Mock the Web Audio API
function createMockAudioContext() {
  const gainNode = {
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
  };

  const sourceNode = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    playbackRate: { value: 1 },
  };

  const ctx = {
    state: 'suspended' as string,
    resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => gainNode),
    createBufferSource: vi.fn(() => sourceNode),
    decodeAudioData: vi.fn().mockResolvedValue({
      duration: 10,
      length: 441000,
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: vi.fn(() => new Float32Array(441000)),
    } as unknown as AudioBuffer),
    destination: {},
    currentTime: 0,
  };

  return { ctx, gainNode, sourceNode };
}

describe('GameAudioManager', () => {
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

  describe('load()', () => {
    it('should load and decode audio sprite sheet', async () => {
      // Mock fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }) as unknown as typeof fetch;

      const spriteMap = {
        drop: { offset: 0, duration: 0.5 },
        pinHit: { offset: 0.5, duration: 0.2 },
      };

      await audio.load('audio/sprites.ogg', spriteMap);

      expect(globalThis.fetch).toHaveBeenCalledWith('audio/sprites.ogg');
      expect(mockCtx.ctx.decodeAudioData).toHaveBeenCalled();
    });
  });

  describe('play()', () => {
    it('should play a named sound from the sprite map', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }) as unknown as typeof fetch;

      const spriteMap = {
        drop: { offset: 0, duration: 0.5 },
        pinHit: { offset: 0.5, duration: 0.2 },
      };

      await audio.load('audio/sprites.ogg', spriteMap);
      audio.play('drop');

      expect(mockCtx.ctx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.sourceNode.start).toHaveBeenCalledWith(0, 0, 0.5);
    });

    it('should apply pitch variation when specified', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
      }) as unknown as typeof fetch;

      const spriteMap = {
        pinHit: { offset: 0.5, duration: 0.2 },
      };

      await audio.load('audio/sprites.ogg', spriteMap);

      // Mock Math.random for deterministic pitch variation
      const origRandom = Math.random;
      Math.random = () => 0.5; // Should yield pitch = 1.0 (center of variation range)
      audio.play('pinHit', { pitchVariation: 0.2 });
      Math.random = origRandom;

      expect(mockCtx.sourceNode.playbackRate.value).toBeCloseTo(1.0, 1);
    });
  });

  describe('setVolume()', () => {
    it('should set the master volume on the gain node', () => {
      audio.setVolume(0.5);
      expect(mockCtx.gainNode.gain.value).toBe(0.5);
    });

    it('should clamp volume to 0-1 range', () => {
      audio.setVolume(1.5);
      expect(mockCtx.gainNode.gain.value).toBe(1);

      audio.setVolume(-0.5);
      expect(mockCtx.gainNode.gain.value).toBe(0);
    });
  });

  describe('toggleMute()', () => {
    it('should mute and unmute the audio', () => {
      audio.setVolume(0.8);
      audio.toggleMute();
      expect(mockCtx.gainNode.gain.value).toBe(0);

      audio.toggleMute();
      expect(mockCtx.gainNode.gain.value).toBe(0.8);
    });
  });
});
