# Data Model: Round Persistence & Audio Tuning

**Feature**: 009-round-persistence-audio  
**Date**: 2026-02-25

## Entity Changes

### PuckBody (modified)

Existing entity in `src/physics/board-builder.ts`. Represents a live puck in the physics world.

| Field | Type | Change | Description |
|-------|------|--------|-------------|
| `id` | `string` | existing | Unique puck identifier |
| `body` | `planck.Body` | existing | Physics body reference |
| `playerId` | `string` | existing | Owning player ID |
| `turnIndex` | `number` | existing | Turn in which puck was dropped |
| `isSettled` | `boolean` | existing | Whether puck has settled in bucket |
| `settledInBucket` | `number \| null` | existing | Bucket index or null |
| `createdAtTick` | `number` | existing | Physics tick at creation |
| **`bounceMultiplier`** | **`number`** | **NEW** | Bounce multiplier at settlement. Default `1.0`. Set once when puck settles. Preserved across rounds. Used for score recalculation after repositioning. |

### Board (unchanged structure, changed lifecycle)

Existing entity in `src/physics/board-builder.ts`. Represents the physics world.

| Field | Lifecycle Change |
|-------|-----------------|
| `pins` | **Changed**: Destroyed and recreated at round boundaries. Previously only rebuilt on full world creation. |
| `bucketWalls` | **Changed**: Destroyed and recreated at round boundaries (bucket count may change with `pinsPerRow`). |
| `pucks` | **Changed**: Persist across round transitions. Only cleared on tie-breaker, play-again, or new-players. Previously cleared every round. |
| `world` | **Changed**: Long-lived — persists for the entire game session. Previously destroyed and recreated every round. |
| `walls` | Unchanged — boundary walls are position-invariant. |
| `shoveZoneY` | **Changed**: Recomputed at round boundaries from new pin layout. |

### ScoreDeltaEffect (new)

New entity in `src/rendering/effects.ts`. Represents a floating score change indicator rendered on canvas.

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | World X coordinate (puck position) |
| `y` | `number` | World Y coordinate (puck position) |
| `deltaText` | `string` | Display text, e.g., "+1,000" or "−500" |
| `color` | `string` | Player's puck color for visual association |
| `startTime` | `number` | `performance.now()` at creation |
| `duration` | `number` | Effect lifetime in ms (~1200ms) |

**Lifecycle**: Created when a puck's bucket assignment changes during repositioning. Rendered each frame with float-up + fade-out animation. Auto-expired when `now - startTime >= duration`.

## Relationships

```
Player 1──* PuckBody        (a player owns many pucks across rounds)
PuckBody *──1 Bucket         (each settled puck is in exactly one bucket)
Board 1──* PuckBody          (board holds all pucks across all rounds)
Board 1──* Pin               (pins are replaced each round)
Board 1──* BucketWall        (bucket dividers rebuilt with pins)
ScoreDeltaEffect *──1 PuckBody  (each delta corresponds to a repositioned puck)
```

## State Transitions

### Puck Lifecycle (updated)

```
Created (dropPuck)
  │
  ▼
Falling (physics active, bounceCount incrementing)
  │
  ├──► Out of Bounds → Removed (score = 0)
  │
  ▼
Settled in Bucket
  │  bounceMultiplier stamped from ScoreBreakdown.multiplier
  │  score = bucketScore × bounceMultiplier
  │
  ├──► Pin Relocation (round boundary)
  │      │
  │      ├──► Overlaps new pin → Woken, isSettled=false
  │      │      │
  │      │      ▼
  │      │    Re-settling (physics active, animated)
  │      │      │
  │      │      ├──► New bucket → Score delta shown, score recalculated
  │      │      │                  (bounceMultiplier preserved)
  │      │      │
  │      │      ├──► Same bucket → No change
  │      │      │
  │      │      └──► Falls off board → Removed (score = 0)
  │      │
  │      └──► No overlap → Stays in place, re-verify bucket
  │
  ├──► Game continues → Puck remains collidable for future rounds
  │
  └──► Game end (tie-breaker / play-again / new-players) → Cleared
```

### Round Transition Flow (updated)

```
All players complete turns in round N
  │
  ▼
evaluateRoundEnd() → { type: 'nextRound' }
  │
  ▼
randomizeLayout() → new pinRows (5-9), pinsPerRow (4-6)
  │
  ▼
rebuildBoard():
  ├── Destroy old pins (world.destroyBody per pin)
  ├── Destroy old bucket dividers
  ├── Create new pins at randomized positions
  ├── Create new bucket dividers
  ├── Recompute shoveZoneY
  ├── Rebuild BucketDetector
  └── Wake all pucks (setAwake(true))
  │
  ▼
Detect displaced pucks (distance check: puck-pin overlap)
  │
  ▼
Settling phase (physics runs visibly, animated):
  ├── Displaced pucks: isSettled = false, settledInBucket = null
  ├── Physics engine resolves overlaps naturally
  ├── BucketDetector re-evaluates settlement each tick
  └── Repeat until all pucks settled
  │
  ▼
Score recalculation:
  ├── For each puck with changed bucket: newScore = bucketScore × puck.bounceMultiplier
  ├── Show ScoreDeltaEffect near affected pucks
  └── Update player totals on scoreboard
  │
  ▼
rebuildRenderData() → update pin/bucket render arrays
  │
  ▼
startNextTurn() → Player 1 of round N+1
```

## Validation Rules

- `bounceMultiplier` must be ≥ 1.0 (minimum is no bounces = rate^0 = 1.0)
- `bounceMultiplier` must be ≤ `bounceMultiplierCap` (10.0 by default)
- `bounceMultiplier` is immutable once set (never changes after initial settlement)
- `settledInBucket` must be a valid bucket index (0 to bucketCount-1) or null
- A puck can only be in one bucket at a time
- Player score = Σ(bucketScores[puck.settledInBucket] × puck.bounceMultiplier) for all of that player's settled pucks
- Pucks that fall off-board during repositioning have their score contribution set to 0 and are removed
