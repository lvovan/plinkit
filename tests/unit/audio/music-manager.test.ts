import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameMusicManager } from '@/audio/music-manager';

/**
 * Mock AudioContext for testing MusicManager state transitions
 * and gain ramp scheduling without real audio hardware.
 */
function createMockGainNode() {
  return {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockAudioContext() {
  let time = 0;
  const ctx = {
    get currentTime() {
      return time;
    },
    _advanceTime(dt: number) {
      time += dt;
    },
    sampleRate: 44100,
    createGain: vi.fn(() => createMockGainNode()),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => ({
      getChannelData: vi.fn(() => new Float32Array(length)),
      length,
      sampleRate,
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
  };
  return ctx as unknown as AudioContext & { _advanceTime: (dt: number) => void };
}

describe('GameMusicManager', () => {
  let manager: GameMusicManager;
  let mockCtx: ReturnType<typeof createMockAudioContext>;
  let mockDestination: ReturnType<typeof createMockGainNode>;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new GameMusicManager();
    mockCtx = createMockAudioContext();
    mockDestination = createMockGainNode();
  });

  // T028: State transitions
  describe('state transitions', () => {
    it('starts with no current track', () => {
      expect(manager.getCurrentTrack()).toBeNull();
    });

    it('reports lobby track after startTrack("lobby")', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.startTrack('lobby');
      expect(manager.getCurrentTrack()).toBe('lobby');
    });

    it('reports gameplay track after startTrack("gameplay")', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.startTrack('gameplay');
      expect(manager.getCurrentTrack()).toBe('gameplay');
    });

    it('transitions lobby→gameplay via crossfadeTo', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.startTrack('lobby');
      manager.crossfadeTo('gameplay');
      expect(manager.getCurrentTrack()).toBe('gameplay');
    });

    it('transitions gameplay→lobby via crossfadeTo', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.startTrack('gameplay');
      manager.crossfadeTo('lobby');
      expect(manager.getCurrentTrack()).toBe('lobby');
    });

    it('returns null after stop()', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.startTrack('lobby');
      manager.stop();
      expect(manager.getCurrentTrack()).toBeNull();
    });

    it('does not start track before init()', () => {
      manager.startTrack('lobby');
      expect(manager.getCurrentTrack()).toBeNull();
    });
  });

  // T029: Independent mute toggle
  describe('toggleMute independence', () => {
    it('starts unmuted', () => {
      expect(manager.isMuted()).toBe(false);
    });

    it('toggles muted state', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.toggleMute();
      expect(manager.isMuted()).toBe(true);
      manager.toggleMute();
      expect(manager.isMuted()).toBe(false);
    });

    it('mute sets musicGain to 0', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      // createGain is called 3 times: musicGain, lobbyGain, gameplayGain
      const musicGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0].value;
      manager.toggleMute();
      expect(musicGain.gain.value).toBe(0);
    });

    it('unmute restores musicGain to volume', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      const musicGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0].value;
      manager.setVolume(0.5);
      manager.toggleMute();
      expect(musicGain.gain.value).toBe(0);
      manager.toggleMute();
      expect(musicGain.gain.value).toBe(0.5);
    });

    it('mute state persists without init', () => {
      manager.toggleMute();
      expect(manager.isMuted()).toBe(true);
    });
  });

  // T030: crossfadeTo gain ramp scheduling
  describe('crossfadeTo gain ramps', () => {
    it('schedules linearRampToValueAtTime on both gain nodes', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.startTrack('lobby');

      const lobbyGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[1].value;
      const gameplayGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[2].value;

      manager.crossfadeTo('gameplay', 1000);

      // Lobby should ramp down to 0
      expect(lobbyGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
      // Gameplay should ramp up to 1
      expect(gameplayGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));
    });

    it('uses correct duration for ramp', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.startTrack('lobby');

      const lobbyGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[1].value;

      const durationMs = 2000;
      manager.crossfadeTo('gameplay', durationMs);

      // The ramp end time should be currentTime + duration in seconds
      const expectedEndTime = mockCtx.currentTime + durationMs / 1000;
      expect(lobbyGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expectedEndTime);
    });

    it('does not schedule ramp if already on the same track', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.startTrack('gameplay');

      const gameplayGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[2].value;
      // Reset mocks after startTrack
      gameplayGain.gain.linearRampToValueAtTime.mockClear();

      manager.crossfadeTo('gameplay');
      expect(gameplayGain.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
    });

    it('sets setValueAtTime before ramp to anchor the automation', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);
      manager.startTrack('lobby');

      const lobbyGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[1].value;

      manager.crossfadeTo('gameplay', 1000);

      // setValueAtTime should be called before linearRampToValueAtTime
      expect(lobbyGain.gain.setValueAtTime).toHaveBeenCalled();
    });

    it('creates gain node graph: musicGain→destination, lobbyGain→musicGain, gameplayGain→musicGain', () => {
      manager.init(mockCtx, mockDestination as unknown as AudioNode);

      const musicGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[0].value;
      const lobbyGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[1].value;
      const gameplayGain = (mockCtx.createGain as ReturnType<typeof vi.fn>).mock.results[2].value;

      // musicGain connects to destination
      expect(musicGain.connect).toHaveBeenCalledWith(mockDestination);
      // lobbyGain connects to musicGain
      expect(lobbyGain.connect).toHaveBeenCalledWith(musicGain);
      // gameplayGain connects to musicGain
      expect(gameplayGain.connect).toHaveBeenCalledWith(musicGain);
    });
  });
});
