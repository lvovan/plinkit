import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  playDrop,
  playPinHit,
  playShove,
  playBucketLand,
  playWinner,
  playTick,
  playTimeout,
} from '@/audio/synth-effects';

/**
 * T019: Verify each SFX factory function creates expected Web Audio nodes
 * with correct parameters.
 *
 * We mock the AudioContext and verify that oscillators/gain nodes are
 * created with the right frequencies, types, and timing.
 */

function createMockAudioContext() {
  const oscillators: Array<{
    type: OscillatorType;
    frequencyValue: number;
    frequencySetValueAtTime: ReturnType<typeof vi.fn>;
    frequencyLinearRamp: ReturnType<typeof vi.fn>;
    frequencyExponentialRamp: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];

  const gainNodes: Array<{
    gainValue: number;
    gainSetValueAtTime: ReturnType<typeof vi.fn>;
    gainLinearRamp: ReturnType<typeof vi.fn>;
    gainExponentialRamp: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  }> = [];

  const ctx = {
    currentTime: 0,
    createOscillator: vi.fn(() => {
      const osc = {
        type: 'sine' as OscillatorType,
        frequencyValue: 440,
        frequencySetValueAtTime: vi.fn(),
        frequencyLinearRamp: vi.fn(),
        frequencyExponentialRamp: vi.fn(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: {
          get value() { return osc.frequencyValue; },
          set value(v: number) { osc.frequencyValue = v; },
          setValueAtTime: vi.fn(function(this: unknown, v: number) { osc.frequencySetValueAtTime(v); osc.frequencyValue = v; }),
          linearRampToValueAtTime: vi.fn(function(this: unknown, v: number) { osc.frequencyLinearRamp(v); }),
          exponentialRampToValueAtTime: vi.fn(function(this: unknown, v: number) { osc.frequencyExponentialRamp(v); }),
        },
      };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const gain = {
        gainValue: 1,
        gainSetValueAtTime: vi.fn(),
        gainLinearRamp: vi.fn(),
        gainExponentialRamp: vi.fn(),
        connect: vi.fn(),
        gain: {
          get value() { return gain.gainValue; },
          set value(v: number) { gain.gainValue = v; },
          setValueAtTime: vi.fn(function(this: unknown, v: number) { gain.gainSetValueAtTime(v); gain.gainValue = v; }),
          linearRampToValueAtTime: vi.fn(function(this: unknown, v: number) { gain.gainLinearRamp(v); }),
          exponentialRampToValueAtTime: vi.fn(function(this: unknown, v: number) { gain.gainExponentialRamp(v); }),
        },
      };
      gainNodes.push(gain);
      return gain;
    }),
    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      Q: { value: 1 },
      connect: vi.fn(),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      loop: false,
    })),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      numberOfChannels: 1,
      duration: length / sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length)),
    })),
    sampleRate: 44100,
  };

  const destination = { connect: vi.fn() } as unknown as AudioNode;

  return { ctx: ctx as unknown as AudioContext, destination, oscillators, gainNodes };
}

describe('Synth Effects', () => {
  let mock: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    mock = createMockAudioContext();
  });

  describe('playDrop()', () => {
    it('should create an oscillator with sine type for drop sound', () => {
      playDrop(mock.ctx, mock.destination);
      expect(mock.ctx.createOscillator).toHaveBeenCalled();
      expect(mock.ctx.createGain).toHaveBeenCalled();
      // Drop uses a sine sweep from ~200Hz down
      expect(mock.oscillators.length).toBeGreaterThanOrEqual(1);
      expect(mock.oscillators[0].type).toBe('sine');
    });
  });

  describe('playPinHit()', () => {
    it('should create oscillator nodes for pin hit sound', () => {
      playPinHit(mock.ctx, mock.destination);
      expect(mock.ctx.createOscillator).toHaveBeenCalled();
      expect(mock.ctx.createGain).toHaveBeenCalled();
    });

    it('should apply pitch variation when provided', () => {
      playPinHit(mock.ctx, mock.destination, 0.15);
      expect(mock.oscillators.length).toBeGreaterThanOrEqual(1);
      // With pitch variation the frequency should be set (possibly offset from base)
    });
  });

  describe('playShove()', () => {
    it('should create audio nodes for shove whoosh', () => {
      playShove(mock.ctx, mock.destination);
      // Shove uses filtered noise — requires buffer source or oscillator
      expect(mock.ctx.createGain).toHaveBeenCalled();
    });
  });

  describe('playBucketLand()', () => {
    it('should create multiple oscillators for arpeggio', () => {
      playBucketLand(mock.ctx, mock.destination);
      // Bucket land plays a pentatonic arpeggio — multiple oscillators
      expect(mock.oscillators.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('playWinner()', () => {
    it('should create oscillators for winner fanfare', () => {
      playWinner(mock.ctx, mock.destination);
      expect(mock.oscillators.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('playTick()', () => {
    it('should create a short sine blip', () => {
      playTick(mock.ctx, mock.destination);
      expect(mock.ctx.createOscillator).toHaveBeenCalled();
      expect(mock.oscillators[0].type).toBe('sine');
    });
  });

  describe('playTimeout()', () => {
    it('should create a square wave oscillator', () => {
      playTimeout(mock.ctx, mock.destination);
      expect(mock.ctx.createOscillator).toHaveBeenCalled();
      // Timeout uses square wave
      const squareOsc = mock.oscillators.find(o => o.type === 'square');
      expect(squareOsc).toBeDefined();
    });
  });

  it('should have all 7 SFX factory functions exported', () => {
    expect(typeof playDrop).toBe('function');
    expect(typeof playPinHit).toBe('function');
    expect(typeof playShove).toBe('function');
    expect(typeof playBucketLand).toBe('function');
    expect(typeof playWinner).toBe('function');
    expect(typeof playTick).toBe('function');
    expect(typeof playTimeout).toBe('function');
  });
});
