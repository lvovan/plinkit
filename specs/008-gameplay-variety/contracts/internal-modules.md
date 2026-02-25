# Internal Module Contracts: Gameplay Variety & Polish

**Feature**: 008-gameplay-variety  
**Date**: 2026-02-25

## Contract Changes Summary

| Contract | Change | Impact |
|----------|--------|--------|
| BoardLayout | Add `pinsPerRow` field | Breaking — all callers must provide |
| PhysicsConfig | Add `autoShoveVelocityThreshold` field | Breaking — config initializers must include |
| GameConfig | Add `autoShove: AutoShoveConfig` | Breaking — config initializers must include |
| SoundName | Add `'coinDing'` and `'autoShove'` variants | Backward-compatible (union extension) |
| board-geometry | `computePinPositions()` uses `pinsPerRow`; `computeBucketBoundaries()` uses proportional widths | Internal logic change, same signatures |
| PhysicsSimulation | Add `applyAutoShove(event)` method | Non-breaking addition |
| BucketDetector | Emit `AutoShoveEvent` instead of immediate bucket assignment for stuck pucks | Behavioral change |
| AudioManager | Route two new SoundName values | Non-breaking addition |
| synth-effects | Add `playCoinDing()`, `playAutoShove()` | Non-breaking addition |
| registration.ts | Add localStorage read/write for player names | Non-breaking addition |
| shove-guidance.ts | New module | New file |

---

## Contract 1 (Modified): BoardLayout

### Change: Add `pinsPerRow` field

```typescript
export interface BoardLayout {
  pinRows: number;        // existing — now varies 5–9 per round
  bucketCount: number;    // existing — fixed at 5
  pinSpacing: number;     // existing — now computed dynamically
  pinRadius: number;      // existing — 0.30
  puckRadius: number;     // existing — 0.50
  bucketScores: number[]; // existing — [100, 1000, 10000, 1000, 100]
  boardWidth: number;     // existing — 10.0
  boardHeight: number;    // existing — 14.0
  pinsPerRow: number;     // NEW — 4–6, controls pin count per even row
}
```

**Breaking**: `DEFAULT_BOARD_LAYOUT` in `game-config.ts` must include `pinsPerRow: 5` (matching the current behavior where `bucketCount` determines pins per row).

**Consumers affected**: `computePinPositions()`, `computeBucketBoundaries()`, `BoardBuilder.build()`, `main.ts` round-transition logic.

---

## Contract 2 (New): AutoShoveConfig

```typescript
export interface AutoShoveConfig {
  /** Velocity below which a puck is considered "stuck" (u/s). */
  velocityThreshold: number;
  /** Ticks at 60fps puck must be stuck before auto-shove fires. */
  stallTicks: number;
  /** Impulse magnitude per auto-shove. */
  impulseMagnitude: number;
  /** Max auto-shove attempts before fallback to nearest-bucket. */
  maxAttempts: number;
  /** Duration of visual warning pulse before impulse (ms). */
  warningDurationMs: number;
}
```

**Default values**:
```typescript
{
  velocityThreshold: 0.1,
  stallTicks: 180,
  impulseMagnitude: 1.5,
  maxAttempts: 3,
  warningDurationMs: 300,
}
```

---

## Contract 3 (Modified): SoundName

### Change: Add two new sound variants

```typescript
// Before:
export type SoundName =
  | 'drop' | 'pinHit' | 'shove' | 'bucketLand'
  | 'winner' | 'tick' | 'timeout' | 'jackpotBucket';

// After:
export type SoundName =
  | 'drop' | 'pinHit' | 'shove' | 'bucketLand'
  | 'winner' | 'tick' | 'timeout' | 'jackpotBucket'
  | 'coinDing'    // metallic coin ding on bucket score
  | 'autoShove';  // low thunk on auto-shove impulse
```

**Backward-compatible**: Union extension. Existing `switch`/`if` chains that handle the original 8 values continue to work; new values hit the default/else branch until routing is added.

---

## Contract 4 (Modified): board-geometry — `computePinPositions()`

### Change: Use `pinsPerRow` instead of `bucketCount` for pin count

```typescript
// Signature unchanged:
export function computePinPositions(layout: BoardLayout): PinPosition[];

// Behavioral change:
// Before: even rows have `bucketCount` pins, odd rows have `bucketCount - 1`
// After:  even rows have `pinsPerRow` pins, odd rows have `pinsPerRow - 1`
// Pin spacing computed from: min(2.0, (boardWidth - 2*(pinRadius+puckRadius)) / (pinsPerRow-1))
// Top/bottom margins: pinRows >= 8 ? 1.5 : 2.0 (dynamic for dense layouts)
```

---

## Contract 5 (Modified): board-geometry — `computeBucketBoundaries()`

### Change: Proportional widths via log₁₀(score)

```typescript
// Signature unchanged:
export function computeBucketBoundaries(layout: BoardLayout): BucketBoundary[];

// Behavioral change:
// Before: bucketWidth = boardWidth / bucketCount (equal widths)
// After:  bucketWidth[i] = (log10(score[i]) / Σlog10(scores)) × boardWidth
// Minimum width clamped to 1.2 units (puck diameter + 0.2 clearance)
// Physics divider positions match proportional visual widths
```

**Return type unchanged**: `BucketBoundary[]` with `{ index, leftX, rightX, centerX, score }`.

---

## Contract 6 (Modified): PhysicsSimulation

### Change: Add `applyAutoShove()` method

```typescript
export interface PhysicsSimulation {
  // ... existing methods unchanged ...

  /**
   * Apply an automatic impulse to a stuck puck.
   * @param event - AutoShoveEvent with puckId, attemptIndex, direction
   * @returns true if the impulse was applied, false if the puck was not found
   */
  applyAutoShove(event: AutoShoveEvent): boolean;
}
```

**Implementation**: Looks up puck body by ID, calls `body.applyLinearImpulse(Vec2(dir.x * magnitude, dir.y * magnitude), body.getWorldCenter())`.

---

## Contract 7 (Modified): BucketDetector

### Change: Emit AutoShoveEvent for stuck pucks before fallback

```typescript
// Current behavior in checkSettled():
//   puck stuck 10s anywhere → assignBucket(nearest)
//
// New behavior:
//   puck speed < 0.1 for 180 ticks above bucket zone
//     → emit AutoShoveEvent (attempt 0)
//     → reset stall timer
//     → if attempt >= maxAttempts → assignBucket(nearest) (existing fallback)
//
// The event is returned from checkSettled() or emitted via callback.
// The caller (game loop in main.ts) routes it to PhysicsSimulation.applyAutoShove().
```

---

## Contract 8 (Modified): AudioManager

### Change: Route `'coinDing'` and `'autoShove'` to synth functions

```typescript
// In the play() routing switch/map:
case 'coinDing':    playCoinDing(ctx, destination, timeScale); break;
case 'autoShove':   playAutoShove(ctx, destination, timeScale); break;
```

---

## Contract 9 (New): synth-effects additions

```typescript
/**
 * Metallic coin ding — two-layer sine synthesis at inharmonic ratio.
 * 2400 Hz fundamental + 3800 Hz overtone, ~150ms decay.
 */
export function playCoinDing(
  ctx: AudioContext,
  destination: AudioNode,
  timeScale?: number
): void;

/**
 * Low "thunk" for auto-shove visual feedback.
 * ~150 Hz, 100ms exponential decay.
 */
export function playAutoShove(
  ctx: AudioContext,
  destination: AudioNode,
  timeScale?: number
): void;
```

---

## Contract 10 (Modified): registration.ts — Name Persistence

### Change: Add localStorage read/write for player names

```typescript
// Internal helper functions (not exported beyond module):

/** Load previously saved player names from localStorage. Returns [] on failure. */
function loadSavedNames(): string[];

/** Save current player names to localStorage. Silent on failure. */
function saveNames(names: string[]): void;

// localStorage key: 'plinkit_player_names'
// Value format: JSON string[] — e.g. '["Alice","Bob"]'
```

**Integration**:
- `showRegistration()`: after creating inputs, call `loadSavedNames()` and pre-fill input values
- Submit handler: call `saveNames()` with current input values before resolving the Promise

---

## Contract 11 (New): shove-guidance.ts

```typescript
/**
 * Show a "Did you know?" popup explaining the shove mechanic.
 * Displayed as a fixed-position DOM overlay. Resolves when dismissed.
 * 
 * @param container - Parent DOM element for the overlay
 * @returns Promise that resolves when the user dismisses the popup
 */
export function showShoveGuidance(container: HTMLElement): Promise<void>;

/**
 * Module-level flag: has the guidance been shown this session?
 * Reset on page reload (not persisted to localStorage).
 */
export function wasGuidanceShown(): boolean;
```

---

## Contract 12 (Modified): main.ts — Round Transition

### Change: Rebuild board at round boundaries

```typescript
// Current flow in startNextTurn():
//   Just advance turn, no board rebuild.
//
// New flow when roundJustCompleted === true:
//   1. Generate random pinRows ∈ [5,9], pinsPerRow ∈ [4,6]
//   2. Compute new pinSpacing from pinsPerRow
//   3. Update config.boardLayout with new values
//   4. Call sim.createWorld(config) to rebuild physics
//   5. Recompute pinRenderData and bucketRenderData
//   6. Check shove guidance trigger (end of round 1, no shoves)
```

### Change: Track shove events for guidance

```typescript
// Module-level state:
let shoveOccurredInRound1 = false;

// Set to true when applyShove() is called during round 1
// Checked at end of round 1 to decide whether to show guidance popup
```
