import { describe, it, expect } from 'vitest';
import { GameMusicManager } from '@/audio/music-manager';

describe('Music Volume (US4)', () => {
  // T043: Music default volume is exactly 0.7 × 0.30 = 0.21
  it('should have default music volume of 0.21 (30% of SFX volume 0.7)', () => {
    const manager = new GameMusicManager();
    // Access the private volume field via the public API:
    // The volume is applied when init() is called. We verify by checking the
    // gain node value after initialization.
    // Since we can't easily create an AudioContext in node, we verify the
    // constant by reading the volume property value from a known getter.
    // The GameMusicManager stores `private volume = 0.21` which is used in init().
    // We verify the behavior indirectly: create a manager, verify it reports correct volume.
    // The manager's setVolume is the setter — let's just verify the constructor default.
    expect((manager as unknown as { volume: number }).volume).toBe(0.21);
  });
});
