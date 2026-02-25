# Contracts: Round Persistence & Audio Tuning

**Feature**: 009-round-persistence-audio  
**Date**: 2026-02-25  
**Source**: `src/types/contracts.ts`

## Contract Changes

### PhysicsSimulation (modified)

**New method: `rebuildBoard(config: GameConfig): void`**

Replaces pins and bucket dividers in the existing physics world without destroying pucks. Wakes all puck bodies so they interact with new geometry.

```typescript
export interface PhysicsSimulation {
  // ...existing methods...
  createWorld(config: GameConfig): void;
  dropPuck(x: number, playerId: string): string;
  applyShove(puckId: string, vector: ShoveVector): boolean;
  step(timeScale?: number): PhysicsStepResult;
  getPuckState(puckId: string): PuckState;
  getSnapshot(): PhysicsSnapshot;
  clearPucks(): void;
  destroy(): void;

  /** NEW: Replace pins and bucket dividers while preserving puck bodies. */
  rebuildBoard(config: GameConfig): void;

  /** NEW: Get all puck bodies for score recalculation. */
  getAllPucks(): PuckBody[];
}
```

**Behavioral contract for `rebuildBoard`**:
- Precondition: `createWorld()` has been called at least once.
- Destroys all existing pin bodies (`board.pins`).
- Destroys all existing bucket wall bodies (`board.bucketWalls`).
- Creates new pin bodies at positions derived from `config.boardLayout`.
- Creates new bucket divider bodies from `config.boardLayout`.
- Recomputes `board.shoveZoneY`.
- Rebuilds `BucketDetector` with new layout.
- Wakes all existing puck bodies (`setAwake(true)`).
- Does NOT destroy puck bodies, boundary walls, or the world itself.
- Does NOT reset puck IDs or tick counter.

**Behavioral contract for `getAllPucks`**:
- Returns the current `board.pucks` array.
- Used by orchestration layer for score recalculation after repositioning.

---

### PuckBody (modified type)

**New field: `bounceMultiplier: number`**

```typescript
export interface PuckBody {
  id: string;
  body: planck.Body;
  playerId: string;
  turnIndex: number;
  isSettled: boolean;
  settledInBucket: number | null;
  createdAtTick: number;
  /** NEW: Bounce multiplier at settlement. Default 1.0. Immutable once set. */
  bounceMultiplier: number;
}
```

---

### EffectsManager (new method)

**New method: `addScoreDelta(x, y, deltaText, color): void`**

```typescript
// Added to EffectsManager class (not a contract interface, but a public API)
addScoreDelta(x: number, y: number, deltaText: string, color: string): void;
```

**Behavioral contract**:
- Creates a `ScoreDeltaEffect` at the given world coordinates.
- The effect renders as floating text that drifts upward and fades over ~1200ms.
- Text is rendered in the given `color` with a black outline for legibility.
- Auto-expires after `duration` milliseconds.

---

### GameStateMachineContract (unchanged)

No changes to the state machine contract. Round evaluation, turn management, and tie-breaker logic remain unchanged. The orchestration of when to call `rebuildBoard` vs `createWorld` is handled in `main.ts`.

---

### Renderer / RenderState (unchanged)

No changes to the render contract. `RenderState.pins` and `RenderState.buckets` arrays are already rebuilt from the board each frame. Score delta effects are rendered internally by `EffectsManager` which is already wired into the renderer.

---

### AudioManager / MusicManager (unchanged contracts)

No contract changes. The music volume adjustment is a constant change in the `GameMusicManager` implementation (0.3 → 0.21), not a contract change. `setVolume()` and `toggleMute()` continue to work as before.

## Summary of Contract Surface Changes

| Contract | Change | Impact |
|----------|--------|--------|
| `PhysicsSimulation` | +`rebuildBoard()`, +`getAllPucks()` | New methods, no breaking changes |
| `PuckBody` | +`bounceMultiplier` field | Additive, default 1.0 — existing code unaffected |
| `EffectsManager` | +`addScoreDelta()` | New method, internal rendering concern |
| All others | No changes | — |
