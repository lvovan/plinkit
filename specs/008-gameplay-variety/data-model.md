# Data Model: Gameplay Variety & Polish

**Feature Branch**: `008-gameplay-variety`  
**Date**: 2026-02-25

---

## Modified Entities

### BoardLayout (existing — `src/types/index.ts`)

Add `pinsPerRow` field to decouple pin-per-row count from `bucketCount`.

```typescript
export interface BoardLayout {
  pinRows: number;          // existing — now dynamic: 5–9 per round
  bucketCount: number;      // existing — remains 5
  pinSpacing: number;       // existing — now computed dynamically per round
  pinRadius: number;        // existing — 0.30
  puckRadius: number;       // existing — 0.50
  bucketScores: number[];   // existing — [100, 1000, 10000, 1000, 100]
  boardWidth: number;       // existing — 10.0
  boardHeight: number;      // existing — 14.0
  pinsPerRow: number;       // NEW — 4–6 per round (even rows get this count, odd rows get pinsPerRow-1)
}
```

**Validation rules:**
- `pinsPerRow` ∈ [4, 6]
- `pinRows` ∈ [5, 9]
- `pinSpacing` = `min(2.0, (boardWidth - 2*(pinRadius + puckRadius)) / (pinsPerRow - 1))`
- `pinSpacing` ≥ 1.60 (hard minimum for puck passability)
- All other fields unchanged from `DEFAULT_BOARD_LAYOUT`

---

### PhysicsConfig (existing — `src/types/index.ts`)

Add auto-shove threshold. The existing `stalledVelocityThreshold` (0.01) is for bucket settle detection; the new auto-shove threshold (0.1) is 10× more sensitive.

```typescript
export interface PhysicsConfig {
  // ... existing fields unchanged ...
  autoShoveVelocityThreshold: number;  // NEW — 0.1 u/s
}
```

---

### GameConfig (existing — `src/types/index.ts`)

Add auto-shove configuration block.

```typescript
export interface GameConfig {
  // ... existing fields unchanged ...
  autoShove: AutoShoveConfig;  // NEW
}
```

---

### SoundName (existing — `src/types/contracts.ts`)

Add `'coinDing'` to the union.

```typescript
export type SoundName =
  | 'drop' | 'pinHit' | 'shove' | 'bucketLand'
  | 'winner' | 'tick' | 'timeout' | 'jackpotBucket'
  | 'coinDing'     // NEW
  | 'autoShove';   // NEW — low "thunk" for auto-shove events
```

---

### RenderState (existing — `src/types/contracts.ts`)

No changes needed. `RenderState.buckets` is already `Array<{x, width, score}>` — the width field will receive proportional values instead of equal values. `RenderState.pins` is already `Array<{x, y, radius}>` — pin positions change per round.

---

## New Entities

### AutoShoveConfig

Configuration for the stuck-puck auto-shove system.

```typescript
export interface AutoShoveConfig {
  /** Velocity below which a puck is considered "stuck" (u/s). Default: 0.1 */
  velocityThreshold: number;
  /** Number of ticks (at 60fps) a puck must be below threshold before auto-shove. Default: 180 (3s) */
  stallTicks: number;
  /** Impulse magnitude applied per auto-shove. Default: 1.5 */
  impulseMagnitude: number;
  /** Maximum auto-shove attempts before fallback to nearest-bucket. Default: 3 */
  maxAttempts: number;
  /** Duration of visual warning pulse before impulse fires (ms). Default: 300 */
  warningDurationMs: number;
}
```

**Validation rules:**
- `velocityThreshold` > `stalledVelocityThreshold` (0.01)
- `stallTicks` > 0
- `impulseMagnitude` ∈ (0, maxForceMagnitude)
- `maxAttempts` ≥ 1

**Default values:**
```typescript
const DEFAULT_AUTO_SHOVE: AutoShoveConfig = {
  velocityThreshold: 0.1,
  stallTicks: 180,
  impulseMagnitude: 1.5,
  maxAttempts: 3,
  warningDurationMs: 300,
};
```

---

### AutoShoveEvent

Runtime event emitted when a stuck puck needs an auto-shove. Used to communicate between `BucketDetector` (detection) and `PhysicsSimulation` (impulse application).

```typescript
export interface AutoShoveEvent {
  /** The stuck puck's runtime ID */
  puckId: string;
  /** Which attempt this is (0-indexed) */
  attemptIndex: number;
  /** Direction unit vector for the impulse */
  direction: { x: number; y: number };
}
```

**State transitions:**
```
Puck dropped → Moving (normal)
  ↓ velocity < 0.1 for 180 ticks, above bucket zone
Stuck detected → AutoShoveEvent emitted
  ↓ impulse applied
Moving (recovering)
  ↓ velocity < 0.1 again for 180 ticks
Stuck detected (retry) → AutoShoveEvent (attemptIndex++)
  ↓ after maxAttempts
Fallback → assignBucket() (existing behavior)
```

---

### RoundLayout

Per-round pin configuration generated at round start. Not a persistent type — used as a parameter to `computePinPositions()` via `BoardLayout`.

```typescript
// Not a separate interface — expressed as modifications to BoardLayout fields:
// boardLayout.pinRows = randomInt(5, 9)
// boardLayout.pinsPerRow = randomInt(4, 6)
// boardLayout.pinSpacing = computed from pinsPerRow
```

The round layout is generated in `main.ts` at round transition time and passed to `sim.createWorld(config)` via the existing `GameConfig`.

---

### SavedPlayerNames

localStorage schema for persisted player names.

```typescript
// Storage key: 'plinkit_player_names'
// Value: JSON-serialized string[]
// Example: '["Alice","Bob"]'

// Not a TypeScript interface — accessed via helper functions:
function loadSavedNames(): string[];
function saveNames(names: string[]): void;
```

**Validation rules:**
- Value must be a valid JSON array of strings
- Max entries: 4 (matches max player count)
- Graceful degradation on parse failure or storage unavailability

---

## Relationships

```
GameConfig
  ├── boardLayout: BoardLayout  (1:1, existing)
  │     └── pinsPerRow: number  (NEW field)
  ├── physics: PhysicsConfig    (1:1, existing)
  │     └── autoShoveVelocityThreshold: number (NEW field)
  └── autoShove: AutoShoveConfig (1:1, NEW)

BucketDetector ──emits──▶ AutoShoveEvent ──consumed by──▶ PhysicsSimulation

AudioManager ──routes──▶ SoundName ('coinDing' | 'autoShove') ──to──▶ synth-effects.ts

registration.ts ──reads/writes──▶ localStorage['plinkit_player_names']
```

---

## Summary of Changes by File

| File | Change type | What changes |
|------|------------|-------------|
| `src/types/index.ts` | Modify | Add `pinsPerRow` to `BoardLayout`, add `AutoShoveConfig` interface, add `autoShove` to `GameConfig`, add `autoShoveVelocityThreshold` to `PhysicsConfig` |
| `src/types/contracts.ts` | Modify | Add `'coinDing'` and `'autoShove'` to `SoundName` |
| `src/config/game-config.ts` | Modify | Add `pinsPerRow: 5` to `DEFAULT_BOARD_LAYOUT`, add `autoShoveVelocityThreshold: 0.1` to physics, add `DEFAULT_AUTO_SHOVE` config block |
| `src/config/board-geometry.ts` | Modify | Update `computePinPositions()` to use `pinsPerRow`, add `computeProportionalBucketWidths()`, update `computeBucketBoundaries()` |
| `src/physics/bucket-detector.ts` | Modify | Add auto-shove detection logic, emit `AutoShoveEvent` |
| `src/physics/simulation.ts` | Modify | Add `applyAutoShove(event)` method |
| `src/audio/synth-effects.ts` | Add | `playCoinDing()`, `playAutoShove()` |
| `src/audio/audio-manager.ts` | Modify | Route `'coinDing'` and `'autoShove'` to new synth functions |
| `src/ui/registration.ts` | Modify | Add `loadSavedNames()` / `saveNames()`, pre-fill on mount, save on submit |
| `src/ui/shove-guidance.ts` | New file | Shove guidance popup overlay |
| `src/main.ts` | Modify | Round-transition board rebuild, shove tracking, guidance trigger, dynamic render data |
