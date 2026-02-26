# Data Model: Gameplay Tuning

**Feature**: 002-gameplay-tuning  
**Date**: 2026-02-24

## Entity Changes

This feature modifies **configuration values** and adds one new **event type**. No new entities or database schemas are introduced.

### Modified Entity: BoardLayout

Existing type in `src/types/index.ts`. No structural changes — only default values change.

```
BoardLayout
├── pinRows: number          # 12 → 6
├── bucketCount: number      # 9 → 5
├── pinSpacing: number       # 1.0 → 2.0
├── pinRadius: number        # 0.12 (reduced 60% from 0.30)
├── puckRadius: number       # 0.25 → 0.5
├── bucketScores: number[]   # [100,500,1000,5000,10000,5000,1000,500,100] → [100,1000,10000,1000,100]
├── boardWidth: number       # 10.0 (unchanged)
└── boardHeight: number      # 14.0 (unchanged)
```

**Validation Rules**:
- `pinRows` must be ≥ 2 (need at least 2 rows for stagger)
- `bucketCount` must be ≥ 2
- `bucketScores.length` must equal `bucketCount`
- `bucketScores` must be symmetric: `bucketScores[i] === bucketScores[bucketCount - 1 - i]`
- `pinSpacing` must be > `pinRadius + puckRadius` (pins must not overlap with puck path)

### Modified Entity: ShoveConfig

Existing type in `src/types/index.ts`. Only default value for `shoveZoneRowLimit` changes.

```
ShoveConfig
├── maxShovesPerTurn: number        # 2 (unchanged)
├── maxForceMagnitude: number       # 5.0 (unchanged)
├── minFlickSpeed: number           # 200 (unchanged)
├── flickSampleWindowMs: number     # 80 (unchanged)
├── quantizationPrecision: number   # 0.001 (unchanged)
└── shoveZoneRowLimit: number       # 9 → 5
```

### New Event Type: OutOfBoundsEvent

Added to `PhysicsStepResult` in `src/types/contracts.ts`.

```
OutOfBoundsEvent
├── puckId: string     # ID of the puck that went out of bounds
└── position: { x: number, y: number }  # Last known position
```

**State Transitions**:
- Emitted when a puck remains above the top boundary (`y > boardHeight/2 + puckRadius`) for `OOB_GRACE_TICKS` (30) consecutive simulation ticks.
- Timer resets if puck returns below the boundary.
- Once emitted, the puck is marked as settled with `settledInBucket = -1` (no bucket).

### Modified Contract: PhysicsStepResult

```
PhysicsStepResult
├── tick: number
├── collisions: CollisionEvent[]
├── settledPucks: SettledPuckEvent[]
└── outOfBoundsPucks: OutOfBoundsEvent[]   # NEW
```

### Modified Contract: PhysicsSimulation (internal state)

The `PhysicsSimulationImpl` class gains:
```
PhysicsSimulationImpl (internal)
└── oobTimers: Map<string, number>   # puckId → first-OOB-tick (grace period tracking)
```

### Modified Constant: PARTICLE_CONFIG

In `src/rendering/particles.ts`:

```
PARTICLE_CONFIG.pinHit
├── count: number     # 6 → 3
├── color: string     # '#ffffff' (unchanged)
├── sizeMin: number   # 1.5 (unchanged)
├── sizeMax: number   # 3 (unchanged)
├── speedMin: number  # 20 (unchanged)
└── speedMax: number  # 40 (unchanged)
```

## Relationships

```
GameConfig ──contains──> BoardLayout (modified defaults)
GameConfig ──contains──> ShoveConfig (modified defaults)
PhysicsSimulationImpl ──produces──> PhysicsStepResult (extended with outOfBoundsPucks)
PhysicsStepResult ──contains──> OutOfBoundsEvent[] (new)
main.ts game loop ──reads──> OutOfBoundsEvent → completeTurn(score=0)
OverlayManager ──shows──> "Out of Bounds" notification (new method)
```

## Bug Fix: computePinPositions Stagger

In `src/config/board-geometry.ts`, the `rowOffset` variable must be removed. This is not a data model change but a formula fix that affects the computed `PinPosition[]` output.

**Before**: Odd-row pins align vertically with even-row pins (broken stagger).  
**After**: Odd-row pins sit at midpoints between even-row pins (correct stagger).

See [research.md](research.md) § R4 for full mathematical verification.
