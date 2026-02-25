# Data Model: Persistent Puck Growth & Board Standardization

**Feature Branch**: `010-persistent-puck-growth`  
**Date**: 2026-02-25

---

## Modified Entities

### BoardLayout (existing — `src/types/index.ts`)

No structural changes. `pinRows` becomes fixed at 8 instead of randomized 5–9.

```typescript
export interface BoardLayout {
  pinRows: number;          // existing — now FIXED at 8 (was dynamic 5–9)
  bucketCount: number;      // existing — remains 5
  pinSpacing: number;       // existing — computed for 8-row layout
  pinRadius: number;        // existing — 0.30
  puckRadius: number;       // existing — 0.50
  bucketScores: number[];   // existing — [100, 1000, 10000, 1000, 100]
  boardWidth: number;       // existing — 10.0
  boardHeight: number;      // existing — 14.0
  pinsPerRow: number;       // existing — remains 5
}
```

**Validation rules:**
- `pinRows` = 8 (constant, never mutated)
- All other fields unchanged from `DEFAULT_BOARD_LAYOUT`

---

### PuckBody (existing — `src/physics/board-builder.ts`)

Add `currentRadius` and `growthCount` fields to track growth state.

```typescript
export interface PuckBody {
  id: string;                    // existing — e.g., 'puck_1'
  body: planck.Body;             // existing — Planck.js dynamic body
  playerId: string;              // existing — owning player's ID
  turnIndex: number;             // existing — which turn created this puck
  isSettled: boolean;            // existing — NOW can revert to false on displacement
  settledInBucket: number | null; // existing — NOW can revert to null on displacement
  createdAtTick: number;         // existing
  currentRadius: number;         // NEW — current collision radius (starts at puckRadius, grows up to MAX_PUCK_RADIUS)
  growthCount: number;           // NEW — number of growth events applied (for debugging/telemetry)
  lastScoredBucket: number | null; // NEW — tracks which bucket score was last awarded (for revocation)
  scoreAwarded: number;          // NEW — total score currently awarded to this puck (0 if not in bucket or revoked)
}
```

**Validation rules:**
- `currentRadius` ∈ [`DEFAULT_BOARD_LAYOUT.puckRadius`, `MAX_PUCK_RADIUS`] where `MAX_PUCK_RADIUS ≈ 0.631`
- `growthCount` ≥ 0
- `scoreAwarded` ≥ 0
- When `isSettled` reverts to `false`, `settledInBucket` MUST also revert to `null`
- When `settledInBucket` changes from a bucket index to `null`, `scoreAwarded` MUST be subtracted from the player's total (clamped ≥ 0)

---

### RuntimePuck (existing — `src/types/index.ts`)

Extend with radius for rendering.

```typescript
export interface RuntimePuck {
  id: string;                     // existing
  playerId: string;               // existing
  turnIndex: number;              // existing
  isSettled: boolean;             // existing
  settledInBucket: number | null; // existing
  currentRadius: number;          // NEW — for rendering at correct size
  growthCount: number;            // NEW — for visual effects (pop count)
}
```

---

### ShoveConfig (existing — `src/types/index.ts`)

Update the shove zone row limit.

```typescript
export interface ShoveConfig {
  // ... existing fields unchanged ...
  shoveZoneRowLimit: number;   // existing — NOW fixed at 6 (was 5)
  // ...
}
```

---

### GameConfig (existing — `src/types/index.ts`)

Add growth configuration block.

```typescript
export interface GameConfig {
  // ... existing fields unchanged ...
  growth: GrowthConfig;  // NEW
}
```

---

### RenderState (existing — `src/types/contracts.ts`)

Extend puck rendering data with dynamic radius and growth animation state.

```typescript
export interface RenderState {
  pins: Array<{ x: number; y: number; radius: number }>;
  pucks: Array<{
    x: number;
    y: number;
    radius: number;              // existing — NOW uses currentRadius from PuckBody
    style: PuckStyle;
    settled: boolean;
    angle: number;
    autoShoveProgress?: number;
    growthAnimProgress?: number;  // NEW — 0..1 for popping animation, undefined if not animating
  }>;
  buckets: Array<{ x: number; width: number; score: number }>;
  shoveZoneY: number;
  activePuckId: string | null;
  interpolationAlpha: number;
  dropIndicator?: { x: number; style: PuckStyle };
  scoreRevocations: ScoreRevocationEvent[];  // NEW — pending revocation flashes to display
}
```

---

### SoundName (existing — `src/types/contracts.ts`)

Add `'puckGrowth'` to the union.

```typescript
export type SoundName =
  | 'drop' | 'pinHit' | 'shove' | 'bucketLand'
  | 'winner' | 'tick' | 'timeout' | 'jackpotBucket'
  | 'coinDing' | 'autoShove'
  | 'puckGrowth';     // NEW — pop/bloop sound on same-player puck contact growth
```

---

## New Entities

### GrowthConfig

Configuration for same-player puck growth mechanics.

```typescript
export interface GrowthConfig {
  /** Surface area growth factor per contact event. Default: 1.20 (20% increase) */
  surfaceAreaGrowthFactor: number;
  /** Maximum puck radius after growth (world units). Default: 0.631 */
  maxPuckRadius: number;
  /** Maximum chain-reaction depth per drop. Default: 10 */
  maxChainDepth: number;
}
```

**Validation rules:**
- `surfaceAreaGrowthFactor` > 1.0
- `maxPuckRadius` > `DEFAULT_BOARD_LAYOUT.puckRadius` (0.50)
- `maxPuckRadius` ≤ half of minimum diagonal pin-edge gap
- `maxChainDepth` ≥ 1

**Default values:**
```typescript
const DEFAULT_GROWTH_CONFIG: GrowthConfig = {
  surfaceAreaGrowthFactor: 1.20,
  maxPuckRadius: 0.631,
  maxChainDepth: 10,
};
```

---

### GrowthEvent

Runtime event emitted when two same-player pucks touch. Queued during `begin-contact`, processed after `world.step()`.

```typescript
export interface GrowthEvent {
  /** First puck in the contact pair */
  puckIdA: string;
  /** Second puck in the contact pair */
  puckIdB: string;
  /** Owning player (same for both pucks) */
  playerId: string;
  /** Chain depth at which this event was generated (0 = initial contact) */
  chainDepth: number;
}
```

**State transitions:**
```
Puck A (player X) contacts Puck B (player X)
  → GrowthEvent queued { puckIdA, puckIdB, playerId: X, chainDepth: 0 }

After world.step():
  → Process queue:
     1. Compute newRadius for A and B (min of currentRadius × √growthFactor, maxPuckRadius)
     2. Resize fixtures (destroy + create)
     3. Wake bodies
     4. Micro-step world.step()
     5. Check for new same-player contacts → queue at chainDepth + 1
     6. Repeat until queue empty OR chainDepth ≥ maxChainDepth
```

---

### ScoreRevocationEvent

Emitted when a puck is displaced from a bucket and its score is revoked.

```typescript
export interface ScoreRevocationEvent {
  /** The puck that was displaced */
  puckId: string;
  /** The owning player whose score is reduced */
  playerId: string;
  /** The score amount being subtracted */
  revokedScore: number;
  /** The bucket the puck was displaced from */
  fromBucket: number;
  /** World position for the negative-score flash */
  x: number;
  y: number;
}
```

---

### GrowthPopEffect (rendering)

Visual effect for puck growth — rendered as a scale-up animation with overshoot.

```typescript
export interface GrowthPopEffect {
  /** World position of the growing puck */
  x: number;
  y: number;
  /** Start time (performance.now()) */
  startTime: number;
  /** Duration in ms. Default: 300 */
  durationMs: number;
  /** Target radius after growth */
  targetRadius: number;
  /** Radius before growth (for interpolation) */
  fromRadius: number;
  /** Puck style for color/pattern reference */
  style: PuckStyle;
}
```

---

### NegativeScoreFlash (rendering)

Visual effect for score revocation — red negative number near the scoreboard.

```typescript
export interface NegativeScoreFlash {
  /** Score amount to display (positive number, shown as negative) */
  amount: number;
  /** Player name or ID for positioning near their scoreboard entry */
  playerId: string;
  /** Start time (performance.now()) */
  startTime: number;
  /** Duration in ms. Default: 1500 */
  durationMs: number;
}
```

---

## Relationships

```
GameConfig
  ├── boardLayout: BoardLayout       (1:1, existing — pinRows fixed to 8)
  ├── shoveConfig: ShoveConfig       (1:1, existing — shoveZoneRowLimit fixed to 6)
  ├── scoring: ScoringConfig         (1:1, existing — unchanged)
  └── growth: GrowthConfig           (1:1, NEW)

PuckBody
  ├── body: planck.Body              (1:1, existing)
  ├── playerId → Player.id           (N:1, existing)
  ├── currentRadius: number          (NEW — determines fixture circle size)
  ├── growthCount: number            (NEW — debug/telemetry)
  ├── lastScoredBucket: number|null  (NEW — for revocation tracking)
  └── scoreAwarded: number           (NEW — score currently attributed to this puck)

GrowthEvent
  ├── puckIdA → PuckBody.id          (reference)
  ├── puckIdB → PuckBody.id          (reference)
  └── playerId → Player.id           (reference)

ScoreRevocationEvent
  ├── puckId → PuckBody.id           (reference)
  └── playerId → Player.id           (reference)

begin-contact ──detects──▶ GrowthEvent ──processed by──▶ puck-growth.ts
BucketDetector ──detects displacement──▶ ScoreRevocationEvent ──consumed by──▶ main.ts → ScoringEngine
AudioManager ──routes──▶ SoundName ('puckGrowth') ──to──▶ synth-effects.ts
EffectsManager ──renders──▶ GrowthPopEffect + NegativeScoreFlash
```

---

## Summary of Changes by File

| File | Change type | What changes |
|------|-------------|-------------|
| `src/types/index.ts` | Modify | Add `GrowthConfig` interface, add `growth` to `GameConfig`, add `GrowthEvent`, `ScoreRevocationEvent` types, extend `RuntimePuck` with `currentRadius`/`growthCount` |
| `src/types/contracts.ts` | Modify | Add `'puckGrowth'` to `SoundName`, extend `RenderState` puck with `growthAnimProgress`, add `scoreRevocations` to `RenderState` |
| `src/config/game-config.ts` | Modify | Fix `pinRows: 8`, fix `shoveZoneRowLimit: 6`, add `DEFAULT_GROWTH_CONFIG`, add `growth` to `DEFAULT_GAME_CONFIG` |
| `src/physics/board-builder.ts` | Modify | Extend `PuckBody` with `currentRadius`, `growthCount`, `lastScoredBucket`, `scoreAwarded` |
| `src/physics/simulation.ts` | Modify | Extend contact listener for same-player detection, add growth event queue, add `resizePuckFixture()` method, remove `clearPucks()` from round transitions |
| `src/physics/puck-growth.ts` | New file | Growth logic: queue processing, fixture resize, chain-reaction loop, cap enforcement |
| `src/physics/bucket-detector.ts` | Modify | Monitor settled pucks for displacement, emit `ScoreRevocationEvent` |
| `src/core/scoring.ts` | Modify | Add `revokeScore()` method, clamp player score ≥ 0 |
| `src/audio/synth-effects.ts` | Modify | Add `playPuckGrowth()` synth function |
| `src/audio/audio-manager.ts` | Modify | Route `'puckGrowth'` to `playPuckGrowth()` |
| `src/rendering/effects.ts` | Modify | Add `GrowthPopEffect` and `NegativeScoreFlash` effect types |
| `src/rendering/renderer.ts` | Modify | Render pucks at dynamic `currentRadius`, render growth pop animation, render negative score flash |
| `src/main.ts` | Modify | Remove `randomizeLayout()`, remove `sim.clearPucks()`+`sim.createWorld()` from round transitions, wire growth events, wire score revocation, reset `bounceCount` per turn (already done — verify) |
