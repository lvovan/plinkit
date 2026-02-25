import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EffectsManager } from '@/rendering/effects';

describe('EffectsManager', () => {
  let effects: EffectsManager;

  beforeEach(() => {
    effects = new EffectsManager();
  });

  // ---- T008: CollisionFlash lifecycle ----

  describe('addCollisionFlash', () => {
    it('should create a flash that is active immediately', () => {
      effects.addCollisionFlash(1.0, 2.0, '1.2×');
      const flashes = effects.getActiveFlashes();
      expect(flashes.length).toBe(1);
      expect(flashes[0].x).toBe(1.0);
      expect(flashes[0].y).toBe(2.0);
    });

    it('should store multiplierText on the flash', () => {
      effects.addCollisionFlash(0, 0, '3.5×');
      const flashes = effects.getActiveFlashes();
      expect(flashes[0].multiplierText).toBe('3.5×');
    });

    it('should expire after 250ms', () => {
      const now = 1000;
      const spy = vi.spyOn(performance, 'now').mockReturnValue(now);

      effects.addCollisionFlash(0, 0, '1.0×');
      expect(effects.getActiveFlashes().length).toBe(1);

      // Still active at 249ms
      spy.mockReturnValue(now + 249);
      expect(effects.getActiveFlashes().length).toBe(1);

      // Expired at 250ms
      spy.mockReturnValue(now + 250);
      expect(effects.getActiveFlashes().length).toBe(0);

      spy.mockRestore();
    });

    it('should support multiple simultaneous flashes', () => {
      effects.addCollisionFlash(1, 1, '1.0×');
      effects.addCollisionFlash(2, 2, '1.2×');
      effects.addCollisionFlash(3, 3, '1.3×');
      expect(effects.getActiveFlashes().length).toBe(3);
    });
  });

  // ---- T022: SlashEffect lifecycle ----

  describe('addSlashEffect', () => {
    it('should create a slash that is active immediately', () => {
      effects.addSlashEffect(1.0, 2.0, 0.5, 0.5, 3.0);
      const slashes = effects.getActiveSlashes();
      expect(slashes.length).toBe(1);
      expect(slashes[0].originX).toBe(1.0);
      expect(slashes[0].originY).toBe(2.0);
    });

    it('should store magnitude on the slash', () => {
      effects.addSlashEffect(0, 0, 1, 0, 4.5);
      const slashes = effects.getActiveSlashes();
      expect(slashes[0].magnitude).toBe(4.5);
    });

    it('should store direction on the slash', () => {
      effects.addSlashEffect(0, 0, 0.7, -0.7, 2.0);
      const slashes = effects.getActiveSlashes();
      expect(slashes[0].directionX).toBe(0.7);
      expect(slashes[0].directionY).toBe(-0.7);
    });

    it('should expire after 400ms', () => {
      const now = 1000;
      const spy = vi.spyOn(performance, 'now').mockReturnValue(now);

      effects.addSlashEffect(0, 0, 1, 0, 3.0);
      expect(effects.getActiveSlashes().length).toBe(1);

      // Still active at 399ms
      spy.mockReturnValue(now + 399);
      expect(effects.getActiveSlashes().length).toBe(1);

      // Expired at 400ms
      spy.mockReturnValue(now + 400);
      expect(effects.getActiveSlashes().length).toBe(0);

      spy.mockRestore();
    });
  });

  // ---- Score pop lifecycle ----

  describe('triggerScorePop', () => {
    it('should create a score pop with breakdown', () => {
      const breakdown = { baseScore: 1000, bounceCount: 5, multiplier: 2.01, totalScore: 2010 };
      effects.triggerScorePop(1.0, 2.0, breakdown);
      const pops = effects.getActiveScorePops();
      expect(pops.length).toBe(1);
      expect(pops[0].breakdown).toEqual(breakdown);
    });

    it('should have 1800ms duration', () => {
      const now = 1000;
      const spy = vi.spyOn(performance, 'now').mockReturnValue(now);

      const breakdown = { baseScore: 100, bounceCount: 0, multiplier: 1.0, totalScore: 100 };
      effects.triggerScorePop(0, 0, breakdown);

      // Still active at 1799ms
      spy.mockReturnValue(now + 1799);
      expect(effects.getActiveScorePops().length).toBe(1);

      // Expired at 1801ms (filter uses strict <)
      spy.mockReturnValue(now + 1801);
      expect(effects.getActiveScorePops().length).toBe(0);

      spy.mockRestore();
    });
  });

  // ---- clear ----

  describe('clear', () => {
    it('should remove all active effects', () => {
      effects.addCollisionFlash(0, 0, '1.0×');
      effects.addSlashEffect(0, 0, 1, 0, 3.0);
      effects.triggerScorePop(0, 0, { baseScore: 100, bounceCount: 0, multiplier: 1.0, totalScore: 100 });

      effects.clear();

      expect(effects.getActiveFlashes().length).toBe(0);
      expect(effects.getActiveSlashes().length).toBe(0);
      expect(effects.getActiveScorePops().length).toBe(0);
    });
  });
});
