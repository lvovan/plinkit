# Internal Module Contracts: Gameplay Tuning

**Feature**: 002-gameplay-tuning  
**Date**: 2026-02-24

## Contract Changes

This feature modifies two existing internal contracts and adds one new overlay method.

---

### 1. PhysicsStepResult (extended)

**Module**: `src/types/contracts.ts`  
**Direction**: PhysicsSimulation → GameLoop (main.ts)

```typescript
// NEW type
interface OutOfBoundsEvent {
  puckId: string;
  position: { x: number; y: number };
}

// MODIFIED — added outOfBoundsPucks field
interface PhysicsStepResult {
  tick: number;
  collisions: CollisionEvent[];
  settledPucks: SettledPuckEvent[];
  outOfBoundsPucks: OutOfBoundsEvent[];  // NEW — empty array when no OOB
}
```

**Consumer**: `main.ts` game loop `onStep()` callback reads `result.outOfBoundsPucks` and calls `stateMachine.completeTurn()` with `scoreEarned: 0`.

**Backward Compatibility**: The new field defaults to `[]`. Existing consumers that don't read `outOfBoundsPucks` are unaffected.

---

### 2. UIOverlayManager (extended)

**Module**: `src/types/contracts.ts`  
**Direction**: GameLoop (main.ts) → OverlayManager

```typescript
// MODIFIED — added showOutOfBounds method
interface UIOverlayManager {
  // ... existing methods unchanged ...
  showOutOfBounds(): void;  // NEW — show transient "Out of Bounds" notification
}
```

**Behavior**:
- Displays an "Out of Bounds" message overlay.
- Auto-dismisses after ~2 seconds (consistent with existing notification pattern).
- Does not block game flow — fire-and-forget from the caller's perspective.

---

### 3. PhysicsSimulation (interface unchanged)

The `PhysicsSimulation` interface itself does not change. The implementation (`PhysicsSimulationImpl`) adds internal OOB tracking, but the public `step()` method's return type change is captured in Contract 1 above.

---

### 4. Configuration Constants (not a contract, but externally visible defaults)

**Module**: `src/config/game-config.ts`

```typescript
// DEFAULT_BOARD_LAYOUT modifications:
{
  pinRows: 6,                                    // was 12
  bucketCount: 5,                                // was 9
  pinSpacing: 2.0,                               // was 1.0
  puckRadius: 0.5,                               // was 0.25
  bucketScores: [100, 1000, 10000, 1000, 100],   // was [100,500,1000,5000,10000,5000,1000,500,100]
  // pinRadius, boardWidth, boardHeight unchanged
}

// DEFAULT_SHOVE_CONFIG modifications:
{
  shoveZoneRowLimit: 5,  // was 9
  // all other fields unchanged
}
```

These are configuration values, not interface contracts. Listed here for completeness since they affect the behavior visible to all modules that consume `GameConfig`.
