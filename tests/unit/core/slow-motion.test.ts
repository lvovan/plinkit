import { describe, it, expect } from 'vitest';
import {
  createSlowMotionState,
  triggerSlowMotion,
  updateSlowMotion,
  resetSlowMotion,
} from '@/core/slow-motion';
import type { SlowMotionConfig } from '@/types/index';

const config: SlowMotionConfig = {
  targetScale: 0.3,
  enterDuration: 0.25,
  holdDuration: 1.5,
  exitDuration: 0.4,
};

describe('Slow-Motion State Machine', () => {
  describe('createSlowMotionState', () => {
    it('should return an initial state in normal phase', () => {
      const state = createSlowMotionState();
      expect(state.phase).toBe('normal');
      expect(state.timeScale).toBe(1.0);
      expect(state.phaseElapsed).toBe(0);
      expect(state.triggeredThisTurn).toBe(false);
    });
  });

  describe('triggerSlowMotion', () => {
    it('should transition from normal to entering', () => {
      const state = createSlowMotionState();
      const next = triggerSlowMotion(state);
      expect(next.phase).toBe('entering');
      expect(next.phaseElapsed).toBe(0);
      expect(next.triggeredThisTurn).toBe(true);
    });

    it('should not trigger if already triggered this turn (once-per-turn guard)', () => {
      const state = createSlowMotionState();
      const triggered = triggerSlowMotion(state);
      const again = triggerSlowMotion(triggered);
      // Should remain in entering phase, not restart
      expect(again.phase).toBe('entering');
      expect(again.triggeredThisTurn).toBe(true);
    });

    it('should not trigger if not in normal phase (phase gate)', () => {
      const state = { ...createSlowMotionState(), phase: 'slow' as const, triggeredThisTurn: true };
      const result = triggerSlowMotion(state);
      expect(result).toBe(state); // Same reference, no change
    });
  });

  describe('updateSlowMotion', () => {
    it('should not change state when in normal phase', () => {
      const state = createSlowMotionState();
      const next = updateSlowMotion(state, 0.1, config);
      expect(next.phase).toBe('normal');
      expect(next.timeScale).toBe(1.0);
    });

    it('should ease timeScale during entering phase', () => {
      let state = triggerSlowMotion(createSlowMotionState());
      // Halfway through entering (0.125 of 0.25s)
      state = updateSlowMotion(state, 0.125, config);
      expect(state.phase).toBe('entering');
      expect(state.timeScale).toBeLessThan(1.0);
      expect(state.timeScale).toBeGreaterThan(config.targetScale);
    });

    it('should transition from entering to slow when enterDuration exceeded', () => {
      let state = triggerSlowMotion(createSlowMotionState());
      state = updateSlowMotion(state, config.enterDuration + 0.01, config);
      expect(state.phase).toBe('slow');
      expect(state.timeScale).toBe(config.targetScale);
    });

    it('should remain in slow phase and track phaseElapsed', () => {
      let state = triggerSlowMotion(createSlowMotionState());
      state = updateSlowMotion(state, config.enterDuration + 0.01, config);
      expect(state.phase).toBe('slow');

      state = updateSlowMotion(state, 0.5, config);
      expect(state.phase).toBe('slow');
      expect(state.timeScale).toBe(config.targetScale);
      expect(state.phaseElapsed).toBeCloseTo(0.5, 2);
    });

    it('should transition from slow to exiting when holdDuration exceeded', () => {
      let state = triggerSlowMotion(createSlowMotionState());
      // Enter
      state = updateSlowMotion(state, config.enterDuration + 0.01, config);
      // Hold the full duration
      state = updateSlowMotion(state, config.holdDuration + 0.01, config);
      expect(state.phase).toBe('exiting');
    });

    it('should ease timeScale back to 1.0 during exiting phase', () => {
      let state = triggerSlowMotion(createSlowMotionState());
      state = updateSlowMotion(state, config.enterDuration + 0.01, config);
      state = updateSlowMotion(state, config.holdDuration + 0.01, config);
      expect(state.phase).toBe('exiting');

      // Halfway through exiting
      state = updateSlowMotion(state, config.exitDuration / 2, config);
      expect(state.phase).toBe('exiting');
      expect(state.timeScale).toBeGreaterThan(config.targetScale);
      expect(state.timeScale).toBeLessThan(1.0);
    });

    it('should transition from exiting to normal when exitDuration exceeded', () => {
      let state = triggerSlowMotion(createSlowMotionState());
      state = updateSlowMotion(state, config.enterDuration + 0.01, config);
      state = updateSlowMotion(state, config.holdDuration + 0.01, config);
      state = updateSlowMotion(state, config.exitDuration + 0.01, config);
      expect(state.phase).toBe('normal');
      expect(state.timeScale).toBe(1.0);
    });

    it('should track phaseElapsed correctly within each phase', () => {
      let state = triggerSlowMotion(createSlowMotionState());
      expect(state.phaseElapsed).toBe(0);

      state = updateSlowMotion(state, 0.1, config);
      expect(state.phaseElapsed).toBeCloseTo(0.1, 3);
    });
  });

  describe('resetSlowMotion', () => {
    it('should return to initial normal state', () => {
      let state = triggerSlowMotion(createSlowMotionState());
      state = updateSlowMotion(state, 0.1, config);
      const reset = resetSlowMotion();
      expect(reset.phase).toBe('normal');
      expect(reset.timeScale).toBe(1.0);
      expect(reset.phaseElapsed).toBe(0);
      expect(reset.triggeredThisTurn).toBe(false);
    });
  });
});
