# Internal Module Contracts: Persistent Puck Growth & Board Standardization

**Feature**: 010-persistent-puck-growth  
**Date**: 2026-02-25

## Contract Changes Summary

| Contract | Change | Impact |
|----------|--------|--------|
| GameConfig | Add `growth: GrowthConfig` | Breaking — config initializers must include |
| PuckBody | Add `currentRadius`, `growthCount`, `lastScoredBucket`, `scoreAwarded` | Breaking — all PuckBody constructors must set new fields |
| RuntimePuck | Add `currentRadius`, `growthCount` | Breaking — RenderState builders must provide |
| RenderState | Add `growthAnimProgress` on pucks, add `scoreRevocations` array | Breaking — renderer must handle new fields |
| SoundName | Add `'puckGrowth'` variant | Backward-compatible (union extension) |
| DEFAULT_BOARD_LAYOUT | `pinRows` fixed to 8 | Behavioral change — no longer randomized |
| DEFAULT_SHOVE_CONFIG | `shoveZoneRowLimit` fixed to 6 | Behavioral change |
| PhysicsSimulation | Add growth event queue, `resizePuckFixture()`, `processGrowthQueue()` | Non-breaking addition |
| BucketDetector | Monitor settled pucks for displacement, emit `ScoreRevocationEvent` | Behavioral change |
| ScoringEngine | Add `revokeScore()` method | Non-breaking addition |
| synth-effects | Add `playPuckGrowth()` | Non-breaking addition |
| puck-growth.ts | New module | New file |

---

## Contract 1 (New): GrowthConfig

```typescript
export interface GrowthConfig {
  /** Surface area growth factor per same-player contact. */
  surfaceAreaGrowthFactor: number;
  /** Maximum puck radius after growth (world units). */
  maxPuckRadius: number;
  /** Maximum chain-reaction depth per drop. */
  maxChainDepth: number;
}
```

**Default values:**
```typescript
{
  surfaceAreaGrowthFactor: 1.20,
  maxPuckRadius: 0.631,
  maxChainDepth: 10,
}
```

---

## Contract 2 (Modified): PuckBody

### Change: Add growth tracking fields

```typescript
export interface PuckBody {
  id: string;                      // existing
  body: planck.Body;               // existing
  playerId: string;                // existing
  turnIndex: number;               // existing
  isSettled: boolean;              // existing — now mutable (can revert to false)
  settledInBucket: number | null;  // existing — now mutable (can revert to null)
  createdAtTick: number;           // existing
  currentRadius: number;           // NEW — current collision radius
  growthCount: number;             // NEW — number of growth events applied
  lastScoredBucket: number | null; // NEW — which bucket score was last awarded
  scoreAwarded: number;            // NEW — score currently attributed to this puck
}
```

**Breaking**: All call sites that construct `PuckBody` (currently `dropPuck()` in `simulation.ts`) must set `currentRadius: boardLayout.puckRadius`, `growthCount: 0`, `lastScoredBucket: null`, `scoreAwarded: 0`.

**Consumers affected**: `simulation.ts`, `bucket-detector.ts`, `puck-growth.ts` (new), `main.ts` (render state builder).

---

## Contract 3 (Modified): GameConfig

### Change: Add `growth` field

```typescript
export interface GameConfig {
  totalRounds: number;           // existing
  boardLayout: BoardLayout;      // existing
  physics: PhysicsConfig;        // existing
  shoveConfig: ShoveConfig;      // existing
  scoring: ScoringConfig;        // existing
  slowMotion: SlowMotionConfig;  // existing
  turnTimerSeconds: number;      // existing
  maxTieBreakers: number;        // existing
  autoShove: AutoShoveConfig;    // existing
  growth: GrowthConfig;          // NEW
}
```

**Breaking**: `DEFAULT_GAME_CONFIG` in `game-config.ts` must include `growth: DEFAULT_GROWTH_CONFIG`. `createGameConfig()` must spread `growth` overrides.

---

## Contract 4 (Modified): DEFAULT_BOARD_LAYOUT

### Change: Fix `pinRows` to 8

```typescript
export const DEFAULT_BOARD_LAYOUT: BoardLayout = {
  pinRows: 8,              // CHANGED from 6 (was randomized 5–9 at runtime)
  bucketCount: 5,          // unchanged
  pinSpacing: 2.0,         // unchanged (recomputed for 8 rows)
  pinRadius: 0.30,         // unchanged
  puckRadius: 0.5,         // unchanged
  bucketScores: [100, 1000, 10000, 1000, 100], // unchanged
  boardWidth: 10.0,        // unchanged
  boardHeight: 14.0,       // unchanged
  pinsPerRow: 5,           // unchanged
};
```

**Behavioral**: `randomizeLayout()` in `main.ts` is removed entirely. The layout constant is never mutated.

---

## Contract 5 (Modified): DEFAULT_SHOVE_CONFIG

### Change: Fix `shoveZoneRowLimit` to 6

```typescript
export const DEFAULT_SHOVE_CONFIG: ShoveConfig = {
  // ... other fields unchanged ...
  shoveZoneRowLimit: 6,    // CHANGED from 5
  // ...
};
```

**Behavioral**: Shove zone extends deeper into the board (6 of 8 rows vs 5 of 6 rows).

---

## Contract 6 (Modified): SoundName

### Change: Add `'puckGrowth'` variant

```typescript
export type SoundName =
  | 'drop' | 'pinHit' | 'shove' | 'bucketLand'
  | 'winner' | 'tick' | 'timeout' | 'jackpotBucket'
  | 'coinDing' | 'autoShove'
  | 'puckGrowth';       // NEW
```

**Backward-compatible**: Union extension. Existing code that switches on `SoundName` will need a new case but won't break at compile time (TypeScript exhaustiveness checks will flag missing cases if used).

---

## Contract 7 (Modified): RenderState

### Change: Extend puck data and add revocation events

```typescript
export interface RenderState {
  // ... existing fields ...
  pucks: Array<{
    x: number;
    y: number;
    radius: number;              // existing — now uses PuckBody.currentRadius
    style: PuckStyle;
    settled: boolean;
    angle: number;
    autoShoveProgress?: number;
    growthAnimProgress?: number;  // NEW — 0..1 animation progress, undefined if not animating
  }>;
  scoreRevocations: ScoreRevocationEvent[];  // NEW — events to render as negative score flashes
}
```

**Breaking**: Renderer must handle `growthAnimProgress` (scale overshoot animation) and `scoreRevocations` (negative score flash rendering).

---

## Contract 8 (New): puck-growth.ts Module

### Public API

```typescript
/**
 * Processes queued growth events after a physics step.
 * Resizes puck fixtures, enforces size cap, manages chain reactions.
 *
 * @param board - The current Board with puck bodies
 * @param growthQueue - Queued GrowthEvent entries from contact listener
 * @param config - GrowthConfig with factor, max radius, chain depth
 * @param physicsConfig - PhysicsConfig for fixture properties (density, restitution, friction)
 * @returns Array of processed GrowthEvents (for audio/visual effect triggering)
 */
export function processGrowthQueue(
  board: Board,
  growthQueue: GrowthEvent[],
  config: GrowthConfig,
  physicsConfig: PhysicsConfig,
): GrowthEvent[];

/**
 * Compute the new radius after a growth event, capped at maxPuckRadius.
 * newRadius = min(currentRadius × √growthFactor, maxPuckRadius)
 *
 * Surface area ∝ radius², so radius grows by √factor to achieve
 * the specified surface area growth.
 */
export function computeGrownRadius(
  currentRadius: number,
  surfaceAreaGrowthFactor: number,
  maxPuckRadius: number,
): number;

/**
 * Resize a puck's physics fixture to a new radius.
 * Destroys the old fixture and creates a new CircleShape.
 * Wakes the body to ensure physics interaction.
 */
export function resizePuckFixture(
  puck: PuckBody,
  newRadius: number,
  physicsConfig: PhysicsConfig,
): void;
```

**Dependencies**: `planck`, `Board`, `PuckBody`, `GrowthEvent`, `GrowthConfig`, `PhysicsConfig`

---

## Contract 9 (Modified): BucketDetector

### Change: Add displacement monitoring for settled pucks

```typescript
class BucketDetector {
  // ... existing methods ...

  /**
   * Check settled pucks for displacement.
   * Called every tick for all settled pucks.
   * Returns ScoreRevocationEvents for any puck knocked out of its bucket.
   */
  checkDisplacement(
    pucks: PuckBody[],
    bucketBoundaries: BucketBoundary[],
  ): ScoreRevocationEvent[];
}
```

**Behavioral change**: Previously, settled pucks were skipped entirely (`if (puck.isSettled) continue`). Now, settled pucks are checked for displacement via `body.isAwake()` and positional checks against bucket boundaries.

---

## Contract 10 (Modified): ScoringEngine

### Change: Add score revocation

```typescript
class ScoringEngine {
  // ... existing methods ...

  /**
   * Revoke a previously awarded score from a player.
   * Subtracts the amount from player.score, clamping at 0.
   *
   * @returns The actual amount subtracted (may be less than revokedScore if clamped)
   */
  revokeScore(player: Player, revokedScore: number): number;
}
```

---

## Contract 11 (Modified): simulation.ts (PhysicsSimulation)

### Change: Growth event queue integration

```typescript
class PhysicsSimulation {
  // ... existing methods ...

  /** Queue of growth events detected during the current step */
  private growthQueue: GrowthEvent[];

  /**
   * Extended step() method:
   * 1. world.step() — physics solver
   * 2. Process growth queue (resize fixtures, chain reactions)
   * 3. Check bucket displacement
   * 4. Existing settlement checks
   *
   * Returns extended StepResult with growth and revocation events.
   */
  step(dt: number): StepResult;
}
```

**StepResult extension:**
```typescript
export interface StepResult {
  collisions: CollisionEvent[];      // existing
  settledPuck?: SettledPuckInfo;      // existing
  growthEvents: GrowthEvent[];       // NEW — processed growth events (for audio/visual)
  scoreRevocations: ScoreRevocationEvent[]; // NEW — pucks displaced from buckets
}
```

---

## Contract 12 (New): synth-effects.ts Addition

### New function: `playPuckGrowth()`

```typescript
/**
 * Play a short "pop/bloop" synth sound for puck growth.
 * Sine sweep 200→800 Hz over 60ms + filtered noise burst.
 * Respects timeScale for slow-motion pitch shifting.
 */
export function playPuckGrowth(
  ctx: AudioContext,
  destination: AudioNode,
  timeScale?: number,
): void;
```

---

## Contract 13 (Modified): main.ts Behavioral Changes

### Removed: `randomizeLayout()`

The `randomizeLayout()` function is deleted. Board layout is fixed at `DEFAULT_BOARD_LAYOUT` values.

### Modified: `transitionToNextRound()`

Before:
```typescript
async function transitionToNextRound(): Promise<void> {
  randomizeLayout();
  sim.clearPucks();
  puckStyleMap.clear();
  sim.createWorld(config);
  // ...
}
```

After:
```typescript
async function transitionToNextRound(): Promise<void> {
  // No layout randomization — board is fixed
  // No puck clearing — pucks persist
  // No world rebuild — physics world persists
  // puckStyleMap preserved — needed for persistent puck rendering
  startNextTurn();
}
```

### Modified: Bounce multiplier reset

The `bounceCount` variable is reset to 0 at the start of each turn (already done at line 361 after `completeTurn()`). Verify this remains correct — no changes needed if the reset already occurs before `dropPuck()`.

### Added: Growth event wiring

After `sim.step()`, iterate `result.growthEvents` to:
1. Play `'puckGrowth'` sound for each event
2. Add `GrowthPopEffect` to the effects manager for each affected puck

### Added: Score revocation wiring

After `sim.step()`, iterate `result.scoreRevocations` to:
1. Call `scoring.revokeScore(player, event.revokedScore)`
2. Add `NegativeScoreFlash` to the effects manager
3. Update scoreboard overlay
