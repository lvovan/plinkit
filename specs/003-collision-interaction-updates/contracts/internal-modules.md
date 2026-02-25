# Internal Module Contracts: Collision & Interaction Updates

**Feature**: 003-collision-interaction-updates  
**Date**: 2026-02-25  
**Context**: Changes to existing module contracts and new internal interfaces
introduced by this feature. References the base contracts from
`specs/001-multiplayer-plinko/contracts/internal-modules.md`.

---

## Contract Changes Overview

```
src/config/    → GameConfig extended with ScoringConfig
src/core/      → ScoringEngine extended with calculateRoundScore()
src/rendering/ → EffectsManager extended with flash, slash, score breakdown
               → Renderer: emitParticles behavior narrowed, RenderState extended
src/types/     → New types: ScoringConfig, ScoreBreakdown, CollisionFlash,
                 SlashEffect, DropIndicator
src/main.ts    → Collision loop expanded, bounce counter added, ghost puck wired
```

No changes to: PhysicsSimulation, AudioManager, UIOverlayManager contracts.

**InputManager**: Added `setBoardHeight(height: number)` method and updated
`canvasToWorldX` to mirror the renderer's padding + aspect-ratio fitting
transform (see spec 001 Contract 2 for full details).

---

## Contract 1: ScoringEngine (extended)

The scoring module gains a new method for bounce-multiplied scoring.
The existing `getScoreForBucket()` method is unchanged.

```typescript
// NEW method on existing ScoringEngine class
interface ScoringEngine {
  /** Existing: lookup base score for a bucket index. */
  getScoreForBucket(bucketIndex: number): number;

  /** Existing: find players sharing the highest score. */
  findTiedPlayers(players: Player[]): Player[];

  /** NEW: Calculate round score with bounce multiplier.
   *  multiplier = min(config.bounceMultiplierRate ^ bounceCount,
   *                   config.bounceMultiplierCap)
   *  totalScore = floor(baseScore × multiplier)
   *  Returns the full breakdown for display. */
  calculateRoundScore(bucketIndex: number, bounceCount: number): ScoreBreakdown;
}
```

**Contract guarantees**:
- `bounceCount = 0` → `multiplier = 1.0`, `totalScore = baseScore`
- `multiplier` never exceeds `config.bounceMultiplierCap`
- `totalScore` is always an integer (floored)
- Throws `RangeError` if `bucketIndex` is out of bounds (same as `getScoreForBucket`)

---

## Contract 2: EffectsManager (extended)

The effects module gains methods for collision flashes, slash effects,
and score breakdown display. Existing `triggerShake` and `getShakeOffset`
are unchanged.

```typescript
interface EffectsManager {
  /** Existing: trigger board shake. */
  triggerShake(intensity: number, durationMs: number): void;
  getShakeOffset(): { x: number; y: number };

  /** MODIFIED: trigger score pop with full breakdown instead of raw score.
   *  Renders as two-line text: "baseScore × multiplier×" / "= totalScore". */
  triggerScorePop(x: number, y: number, breakdown: ScoreBreakdown): void;

  /** NEW: add a radial flash at the collision point with multiplier text. */
  addCollisionFlash(x: number, y: number, multiplierText: string): void;

  /** NEW: add a slash effect along the shove direction. */
  addSlashEffect(
    originX: number, originY: number,
    directionX: number, directionY: number,
    magnitude: number
  ): void;

  /** NEW: render all active visual effects (flashes, slashes, score pops).
   *  Called once per frame from the render loop.
   *  worldToCanvas is a transform function provided by the renderer. */
  renderEffects(
    ctx: CanvasRenderingContext2D,
    worldToCanvas: (wx: number, wy: number) => { x: number; y: number },
    worldToPixels: (size: number) => number
  ): void;

  /** Existing: clear all effects. */
  clear(): void;
}
```

**Contract guarantees**:
- `addCollisionFlash`: flash duration ≤ 300ms (FR-003), auto-removed after expiry
- `addSlashEffect`: slash duration ≤ 500ms (FR-018), auto-removed after expiry
- `renderEffects`: only draws active (non-expired) effects; filters expired each frame
- All effects render using `ctx.save()`/`ctx.restore()` — no side effects on canvas state
- `triggerScorePop` breaking change: `score: number` parameter replaced with `breakdown: ScoreBreakdown` (caller in main.ts must be updated)

---

## Contract 3: Renderer (modified behavior)

No new methods added to the `Renderer` interface. Behavior changes:

```typescript
interface Renderer {
  /** Unchanged signature. */
  init(canvas: HTMLCanvasElement, layout: LayoutResult): void;
  drawFrame(state: RenderState): void;
  shake(intensity: number, durationMs: number): void;
  resize(): void;

  /** MODIFIED behavior: only emits particles for 'bucketLand' type.
   *  'pinHit' and 'shove' types are silently ignored (no-op). */
  emitParticles(x: number, y: number, type: ParticleType): void;
}
```

### RenderState (extended)

```typescript
interface RenderState {
  // Existing fields unchanged
  pins: PinRenderData[];
  pucks: PuckRenderData[];
  buckets: BucketRenderData[];
  shoveZoneY: number;
  activePuckId: string | null;
  interpolationAlpha: number;

  /** NEW: when present, renderer draws a ghost puck at this position. */
  dropIndicator?: {
    x: number;          // world X coordinate
    style: PuckStyle;   // player's puck color and pattern
  };
}
```

**Contract guarantees**:
- When `dropIndicator` is present, renderer draws a semi-transparent (40% opacity) puck at `(dropIndicator.x, topOfBoard)` with the given style
- When `dropIndicator` is absent or undefined, no ghost puck is drawn
- Ghost puck is rendered before active pucks in z-order (appears behind game pucks)

---

## Contract 4: GameConfig (extended)

```typescript
interface GameConfig {
  board: BoardLayout;       // unchanged
  physics: PhysicsConfig;   // unchanged
  shove: ShoveConfig;       // unchanged
  game: GameplayConfig;     // unchanged

  /** NEW: scoring multiplier configuration. */
  scoring: ScoringConfig;
}

interface ScoringConfig {
  /** Exponential rate per bounce. Must be > 1.0. Default: 1.15 */
  bounceMultiplierRate: number;
  /** Maximum multiplier cap. Must be >= 1.0. Default: 10.0 */
  bounceMultiplierCap: number;
}
```

**Contract guarantees**:
- `createGameConfig(overrides?)` deep-merges `scoring` overrides like all other sub-configs
- Default values: `{ bounceMultiplierRate: 1.15, bounceMultiplierCap: 10.0 }`

---

## Contract 5: TurnResult (extended)

```typescript
interface TurnResult {
  // Existing fields unchanged
  playerId: string;
  bucketIndex: number;
  dropPositionX: number;
  shoves: ShoveVector[];

  /** NEW: total number of bounces during this turn. */
  bounceCount: number;

  /** MODIFIED: was `scoreEarned: number`, now includes full breakdown. */
  scoreBreakdown: ScoreBreakdown;

  /** MODIFIED: totalScore extracted from breakdown for backward compat. */
  scoreEarned: number;
}
```

**Contract guarantees**:
- `scoreEarned === scoreBreakdown.totalScore` (kept for backward compatibility)
- `bounceCount === scoreBreakdown.bounceCount`

---

## New Types

```typescript
/** Scoring configuration */
interface ScoringConfig {
  bounceMultiplierRate: number;  // default: 1.15
  bounceMultiplierCap: number;   // default: 10.0
}

/** Full breakdown of a round's score calculation */
interface ScoreBreakdown {
  baseScore: number;     // bucket lookup value
  bounceCount: number;   // total collisions during round
  multiplier: number;    // min(rate^bounces, cap), ≥ 1.0
  totalScore: number;    // floor(baseScore × multiplier)
}

/** Internal effect state — not exposed via contracts */
interface CollisionFlash {
  x: number; y: number;
  startTime: number;
  duration: number;        // ≤ 300ms
  multiplierText: string;  // e.g., "1.3×"
}

/** Internal effect state — not exposed via contracts */
interface SlashEffect {
  originX: number; originY: number;
  directionX: number; directionY: number;
  magnitude: number;
  startTime: number;
  duration: number;  // ≤ 500ms
}
```

---

## Collision Event Flow (updated)

```
Physics.step()
  → CollisionEvent { type, puckId, x, y }
    → main.ts collision loop (ALL types: pinHit, puckHit, wallHit):
       1. bounceCount++
       2. audioManager.play('pinHit', { pitchVariation: 0.15 })
       3. effects.addCollisionFlash(x, y, formatMultiplier(bounceCount))
    → result.settledPucks:
       1. scoring.calculateRoundScore(bucketIndex, bounceCount) → breakdown
       2. audioManager.play('bucketLand')
       3. renderer.emitParticles(x, y, 'bucketLand')  // retained
       4. effects.triggerScorePop(x, y, breakdown)
       5. stateMachine.completeTurn({ ..., bounceCount, scoreBreakdown: breakdown })

ShoveEvent (from input):
  → main.ts shove handler:
     1. sim.applyShove(puckId, vector)
     2. if successful:
        a. audioManager.play('shove')
        b. shakeIntensity = 5 × (forceMag / maxForceMag)
        c. renderer.shake(shakeIntensity, 150)
        d. effects.addSlashEffect(puckX, puckY, normDirX, normDirY, forceMag)
```
