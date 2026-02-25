# Internal Module Contracts: Menu System & Layout Polish

**Feature**: 007-menu-layout-polish  
**Date**: 2025-02-25

## Contract Changes Summary

| Contract | Change | Impact |
|----------|--------|--------|
| PhysicsSimulation | `step()` gains optional `timeScale` param | Backward-compatible |
| AudioManager | `play()` options gain optional `timeScale` field | Backward-compatible |
| MusicManager | Add `setTimeScale()` method | Backward-compatible |
| UIOverlayManager | Add `initAnimationToggle()`, update `initAudioToggles()` position | Non-breaking addition |
| Renderer | No signature changes (internal background integration) | None |
| InputManager | No changes | None |
| GameStateMachine | No changes | None |

---

## Contract 1 (Modified): PhysicsSimulation

### Change: `step()` gains optional `timeScale` parameter

```typescript
export interface PhysicsSimulation {
  // ... existing methods unchanged ...

  /**
   * Advance physics by one fixed timestep, optionally scaled.
   * @param timeScale - Multiplier for the effective dt (0 < timeScale ≤ 1.0).
   *   When omitted or 1.0, behaves identically to the current implementation.
   *   During slow-motion, pass a value like 0.3 to slow simulated time
   *   while keeping the step rate at 60 Hz for robust collision detection.
   *   Internally computes: world.step(fixedTimestep * timeScale)
   */
  step(timeScale?: number): PhysicsStepResult;

  // ... remaining methods unchanged ...
}
```

**Backward compatibility**: The parameter is optional with implicit default `1.0`. All existing callers continue to work without changes.

---

## Contract 4 (Modified): AudioManager

### Change: `play()` options gain optional `timeScale` field

```typescript
export interface AudioManager {
  // ... existing methods unchanged ...

  /**
   * Play a named sound effect using Web Audio synthesis.
   * No-ops if SFX is muted or AudioContext is not initialized.
   * @param name - Which SFX to trigger
   * @param options - Optional parameters:
   *   - pitchVariation: ±fraction for random pitch offset (e.g. 0.15 = ±15%)
   *   - timeScale: slow-motion factor (0 < timeScale ≤ 1.0).
   *     When present, stretches SFX envelope durations by 1/timeScale
   *     and pitch-shifts frequencies by timeScale^0.5.
   *     When omitted, plays at normal speed.
   */
  play(name: SoundName, options?: {
    pitchVariation?: number;
    timeScale?: number;
  }): void;

  // ... remaining methods unchanged ...
}
```

**Backward compatibility**: The `timeScale` option is optional. All existing `play()` calls are unaffected.

---

## Contract 7 (Modified): MusicManager

### Change: Add `setTimeScale()` method

```typescript
export interface MusicManager {
  // ... existing methods unchanged ...

  /**
   * Set the music playback time-scale for slow-motion synchronization.
   * Affects both the scheduler beat interval (beatDuration / timeScale)
   * and note generation (frequencies × timeScale^0.5, durations / timeScale).
   * @param scale - Time-scale factor (0 < scale ≤ 1.0).
   *   1.0 = normal speed. 0.3 = slow-motion.
   *   Call with 1.0 to restore normal playback.
   */
  setTimeScale(scale: number): void;

  // ... remaining methods unchanged ...
}
```

**Backward compatibility**: New method, no existing signature changes.

---

## Contract 6 (Modified): UIOverlayManager

### Change: Add `initAnimationToggle()` method

```typescript
export interface UIOverlayManager {
  // ... existing methods unchanged ...

  /**
   * Initialize the background animation toggle button.
   * Positioned near the audio toggle buttons in the upper-left corner.
   * Follows the same 44×44px icon-button pattern as audio toggles.
   * @param onToggle - Callback invoked when the player clicks the toggle.
   *   Receives the new enabled state (true = animation on, false = off).
   */
  initAnimationToggle(onToggle: (enabled: boolean) => void): void;

  /**
   * Update the visual state of the animation toggle button.
   * @param animationEnabled - Whether background animation is currently enabled.
   */
  updateAnimationToggleState(animationEnabled: boolean): void;

  // ... remaining methods unchanged ...
}
```

**Note on `initAudioToggles()`**: The existing method signature is unchanged, but its implementation will update CSS positioning from `right:8px` to `left:8px`. This is a visual-only change — no contract impact.

**Note on `showRegistration()`**: The existing method signature is unchanged, but the rendered registration panel will include a copyright subtitle element. This is an internal rendering detail — no contract impact.

---

## New Internal Module: SlowMotionController

This is a new internal module (not an external-facing contract). Documented here because it coordinates across multiple existing contracts.

```typescript
export type SlowMotionPhase = 'normal' | 'entering' | 'slow' | 'exiting';

export interface SlowMotionConfig {
  targetScale: number;    // 0.3
  enterDuration: number;  // 0.25s
  holdDuration: number;   // 1.5s
  exitDuration: number;   // 0.4s
}

export interface SlowMotionState {
  phase: SlowMotionPhase;
  timeScale: number;
  phaseElapsed: number;
  triggeredThisTurn: boolean;
}

/**
 * Pure function: advance slow-motion state by realDt seconds.
 * Returns the updated state (immutable pattern — does not mutate input).
 * Easing: easeOutCubic for entering, easeInCubic for exiting.
 */
export function updateSlowMotion(
  state: SlowMotionState,
  config: SlowMotionConfig,
  realDt: number
): SlowMotionState;

/**
 * Create initial slow-motion state (phase='normal', timeScale=1).
 */
export function createSlowMotionState(): SlowMotionState;

/**
 * Trigger slow-motion entry. No-ops if triggeredThisTurn is true or phase !== 'normal'.
 */
export function triggerSlowMotion(state: SlowMotionState): SlowMotionState;

/**
 * Reset state for a new turn (phase='normal', timeScale=1, triggeredThisTurn=false).
 */
export function resetSlowMotion(): SlowMotionState;
```

**Integration points**:
- `main.ts` calls `updateSlowMotion()` in `onStep()`, passes `state.timeScale` to `sim.step()`, `audioManager.play()`, and `musicManager.setTimeScale()`
- `main.ts` calls `triggerSlowMotion()` when active puck's `position.y < shoveZoneY`
- `main.ts` calls `resetSlowMotion()` on turn start

---

## New Internal Module: BackgroundManager

Internal rendering module — not an external-facing contract. Documented here for cross-module coordination.

```typescript
export interface BackgroundManager {
  /**
   * Initialize offscreen canvases and generate static layers (sky, hills).
   * Must be called after canvas dimensions are known.
   */
  init(width: number, height: number): void;

  /**
   * Rebuild all layers at new dimensions. Called on canvas resize.
   * Re-seeds hill generation with the same phases for visual consistency.
   */
  rebuild(width: number, height: number): void;

  /**
   * Update animated layers (cloud positions, celestial body).
   * Skipped when animationEnabled is false.
   * @param dt - Frame delta time in seconds
   */
  update(dt: number): void;

  /**
   * Composite all background layers onto the main canvas context.
   * Always draws (even when animation is disabled — static scene remains).
   */
  composite(ctx: CanvasRenderingContext2D): void;

  /** Toggle animation on/off. Returns new state. */
  toggleAnimation(): boolean;

  /** Query whether animation is currently enabled. */
  isAnimationEnabled(): boolean;
}
```

**Integration point**: `renderer.ts` calls `background.update(dt)` then `background.composite(ctx)` at the start of `drawFrame()`, before the board fill.
