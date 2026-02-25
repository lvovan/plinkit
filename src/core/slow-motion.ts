import type { SlowMotionConfig, SlowMotionState } from '@/types/index';

/**
 * Easing: ease-out cubic — fast start, slow end.
 * Used for entering slow-motion (rapid deceleration).
 */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Easing: ease-in cubic — slow start, fast end.
 * Used for exiting slow-motion (gradual acceleration).
 */
function easeInCubic(t: number): number {
  return t ** 3;
}

/** Create a fresh slow-motion state (normal speed, not triggered). */
export function createSlowMotionState(): SlowMotionState {
  return {
    phase: 'normal',
    timeScale: 1.0,
    phaseElapsed: 0,
    triggeredThisTurn: false,
  };
}

/**
 * Trigger slow-motion. Returns a new state in 'entering' phase.
 * Guards:
 * - Only triggers when in 'normal' phase
 * - Only triggers once per turn (triggeredThisTurn flag)
 */
export function triggerSlowMotion(state: SlowMotionState): SlowMotionState {
  if (state.triggeredThisTurn || state.phase !== 'normal') {
    return state;
  }
  return {
    ...state,
    phase: 'entering',
    phaseElapsed: 0,
    triggeredThisTurn: true,
  };
}

/**
 * Advance the slow-motion state by dt seconds.
 * Pure function — returns a new state object.
 *
 * Phase transitions:
 *   normal → (no-op)
 *   entering → slow (after enterDuration)
 *   slow → exiting (after holdDuration)
 *   exiting → normal (after exitDuration)
 */
export function updateSlowMotion(
  state: SlowMotionState,
  dt: number,
  config: SlowMotionConfig,
): SlowMotionState {
  if (state.phase === 'normal') return state;

  const elapsed = state.phaseElapsed + dt;

  switch (state.phase) {
    case 'entering': {
      if (elapsed >= config.enterDuration) {
        // Transition to slow phase
        return {
          ...state,
          phase: 'slow',
          timeScale: config.targetScale,
          phaseElapsed: 0,
        };
      }
      // Ease from 1.0 → targetScale
      const t = elapsed / config.enterDuration;
      const eased = easeOutCubic(t);
      return {
        ...state,
        timeScale: 1.0 - (1.0 - config.targetScale) * eased,
        phaseElapsed: elapsed,
      };
    }

    case 'slow': {
      if (elapsed >= config.holdDuration) {
        // Transition to exiting phase
        return {
          ...state,
          phase: 'exiting',
          timeScale: config.targetScale,
          phaseElapsed: 0,
        };
      }
      return {
        ...state,
        timeScale: config.targetScale,
        phaseElapsed: elapsed,
      };
    }

    case 'exiting': {
      if (elapsed >= config.exitDuration) {
        // Transition to normal phase
        return {
          ...state,
          phase: 'normal',
          timeScale: 1.0,
          phaseElapsed: 0,
        };
      }
      // Ease from targetScale → 1.0
      const t = elapsed / config.exitDuration;
      const eased = easeInCubic(t);
      return {
        ...state,
        timeScale: config.targetScale + (1.0 - config.targetScale) * eased,
        phaseElapsed: elapsed,
      };
    }

    default:
      return state;
  }
}

/** Reset slow-motion state for a new turn. */
export function resetSlowMotion(): SlowMotionState {
  return createSlowMotionState();
}
