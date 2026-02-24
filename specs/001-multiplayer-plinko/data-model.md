# Data Model: Multi-Player Plinko Game

**Date**: 2026-02-24
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

## Entities

### GameSession

The top-level container for one play session from registration through
results.

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Unique session identifier (UUID) |
| players | `Player[]` | Registered players (2–4), ordered by registration |
| config | `GameConfig` | Board layout, physics params, round count, scoring |
| phase | `GamePhase` | Current lifecycle phase |
| currentRound | `number` | 1-based current round index |
| currentTurnIndex | `number` | Index into the active player list for the current turn |
| turns | `Turn[]` | Ordered record of all completed turns |
| tieBreakersPlayed | `number` | Count of tie-breaker rounds completed |
| activePlayers | `Player[]` | Players participating in the current round (all players during regular rounds, tied players during tie-breakers) |

**State transitions** (GamePhase):

```
registration → playing → tieBreaker → results
                  ↑                       │
                  └───────────────────────┘  (Play Again)
results → registration  (New Players)
results → ended         (Quit)
```

**Validation rules**:
- `players.length` must be 2–4
- `currentRound` must be ≥ 1 and ≤ `config.totalRounds + tieBreakersPlayed`
- `tieBreakersPlayed` must be ≤ 10 (hard cap, then co-winners declared)

---

### Player

A registered participant in the game session.

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Unique player identifier (UUID) |
| name | `string` | Display name (1–16 non-whitespace-trimmed chars) |
| puckStyle | `PuckStyle` | Assigned color + pattern combination |
| score | `number` | Cumulative score across all rounds |
| turnOrder | `number` | 0-based position in the turn cycle |
| isActive | `boolean` | Whether the player participates in the current round (false = eliminated from tie-breaker) |

**Validation rules**:
- `name` must have ≥ 1 non-whitespace character and ≤ 16 characters after trimming
- `puckStyle` must be unique within the session
- `score` ≥ 0

---

### PuckStyle

Visual identity for a player's puck.

| Field | Type | Description |
|-------|------|-------------|
| color | `string` | Primary fill color (hex, e.g., `#E63946`) |
| pattern | `PuckPattern` | Visual pattern overlay |
| label | `string` | Human-readable name (e.g., "Red Stripes") for accessibility |

**PuckPattern enum**: `solid | stripes | dots | rings`

**Preset palette** (4 combinations, color-blind accessible):

| Slot | Color | Pattern | Label |
|------|-------|---------|-------|
| 0 | `#E63946` (red) | solid | Red Solid |
| 1 | `#457B9D` (blue) | stripes | Blue Stripes |
| 2 | `#2A9D8F` (teal) | dots | Teal Dots |
| 3 | `#E9C46A` (gold) | rings | Gold Rings |

---

### GameConfig

Configurable game parameters set before the session starts.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| totalRounds | `number` | 5 | Number of regular rounds |
| boardLayout | `BoardLayout` | (see below) | Pin grid and bucket setup |
| physics | `PhysicsConfig` | (see below) | Simulation parameters |
| shoveConfig | `ShoveConfig` | (see below) | Shove mechanic parameters |
| turnTimerSeconds | `number` | 15 | Seconds per turn before auto-drop |
| maxTieBreakers | `number` | 10 | Max tie-breaker rounds before co-winners |

---

### BoardLayout

Static board geometry.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| pinRows | `number` | 12 | Number of pin rows |
| bucketCount | `number` | 9 | Number of scoring buckets |
| pinSpacing | `number` | — | Horizontal distance between pins (world units) |
| pinRadius | `number` | — | Radius of each pin (world units) |
| puckRadius | `number` | — | Radius of each puck (world units) |
| bucketScores | `number[]` | `[100, 500, 1000, 5000, 10000, 5000, 1000, 500, 100]` | Score values left-to-right |
| boardWidth | `number` | — | Total board width (world units) |
| boardHeight | `number` | — | Total board height (world units) |

**Derived geometry**:
- Pin positions are computed from `pinRows`, `pinSpacing`, and the
  staggered offset pattern (even rows offset by `pinSpacing / 2`).
- Bucket positions are computed from `bucketCount` and `boardWidth`.
- Shove zone boundary Y = pin row 9's Y position.

**Validation rules**:
- `bucketScores.length` must equal `bucketCount`
- `bucketScores` must be symmetric (index `i` === index `bucketCount - 1 - i`)

---

### PhysicsConfig

Parameters for the Planck.js simulation.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| gravity | `{ x: number, y: number }` | `{ x: 0, y: -10 }` | World gravity vector |
| fixedTimestep | `number` | `1/60` | Seconds per physics step |
| velocityIterations | `number` | 8 | Solver velocity iterations per step |
| positionIterations | `number` | 3 | Solver position iterations per step |
| puckRestitution | `number` | 0.5 | Puck bounce coefficient |
| puckFriction | `number` | 0.1 | Puck surface friction |
| puckDensity | `number` | 1.0 | Puck mass density |
| pinRestitution | `number` | 0.4 | Pin bounce coefficient |
| pinFriction | `number` | 0.05 | Pin surface friction |
| stalledVelocityThreshold | `number` | 0.01 | Below this speed ≈ stalled (world units/s) |
| stalledTimeoutMs | `number` | 10000 | Force-score a puck after this timeout |

---

### ShoveConfig

Parameters for the shove mechanic.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| maxShovesPerTurn | `number` | 2 | Maximum shoves allowed per turn |
| maxForceMagnitude | `number` | — | Cap on shove impulse magnitude |
| minFlickSpeed | `number` | 200 | Minimum pointer velocity (px/s) to register as a flick |
| flickSampleWindowMs | `number` | 80 | Time window (ms) for velocity calculation from pointer samples |
| quantizationPrecision | `number` | 0.001 | Rounding precision for deterministic flick vectors |
| shoveZoneRowLimit | `number` | 9 | Shoves allowed only while puck is above this row |

---

### Turn

Record of a single player's drop.

| Field | Type | Description |
|-------|------|-------------|
| playerId | `string` | The player who took this turn |
| roundNumber | `number` | Which round (regular or tie-breaker) |
| dropPositionX | `number` | Horizontal drop position (world units) |
| shoves | `ShoveVector[]` | Ordered list of shove impulses applied (0–2) |
| resultBucketIndex | `number` | Which bucket the puck landed in (0-based) |
| scoreEarned | `number` | Points awarded for this turn |
| wasTimeout | `boolean` | Whether the drop was triggered by timer expiry |
| simulationTicks | `number` | Total physics ticks elapsed during this turn |

---

### ShoveVector

A single shove impulse.

| Field | Type | Description |
|-------|------|-------------|
| dx | `number` | Horizontal impulse component (quantized) |
| dy | `number` | Vertical impulse component (quantized) |
| appliedAtTick | `number` | Simulation tick at which the impulse was applied |

---

### Puck (runtime physics entity)

Represents a puck's live state in the physics simulation. Not
persisted as data — exists as a Planck.js Body in the physics world.

| Property | Type | Description |
|----------|------|-------------|
| body | `planck.Body` | Planck.js dynamic circle body |
| playerId | `string` | Owning player |
| turnIndex | `number` | Which turn created this puck |
| isSettled | `boolean` | Whether the puck has come to rest |
| settledInBucket | `number \| null` | Bucket index if settled, null if in flight |

**Lifecycle**:
1. Created at drop position when the turn begins
2. Falls under gravity, collides with pins and prior pucks
3. Shove impulses applied during the shove window (rows 1–9)
4. Settles in a bucket → `isSettled = true`, score awarded
5. Remains as a sleeping physics body for the rest of the game
6. Removed only on "Play Again" (board clear) or "New Players"

---

### Board (runtime entity)

The physical board in the Planck.js world. Created once at game start.

| Property | Type | Description |
|----------|------|-------------|
| world | `planck.World` | The Planck.js physics world |
| pins | `planck.Body[]` | Static circle bodies for all pins |
| walls | `planck.Body[]` | Static edge/box bodies for boundaries |
| bucketWalls | `planck.Body[]` | Static bodies forming bucket dividers |
| pucks | `Puck[]` | All pucks dropped so far (persist across turns) |
| shoveZoneY | `number` | Y coordinate of the shove-zone boundary |

---

## Entity Relationships

```
GameSession 1──* Player
GameSession 1──1 GameConfig
GameSession 1──* Turn
GameConfig   1──1 BoardLayout
GameConfig   1──1 PhysicsConfig
GameConfig   1──1 ShoveConfig
Player       1──1 PuckStyle
Turn         *──1 Player
Turn         1──* ShoveVector
Board        1──* Puck (runtime)
Puck         *──1 Player (via playerId)
```

## State Transitions

### GamePhase

| From | Event | To | Side effects |
|------|-------|----|-------------|
| `registration` | All players registered, "Start" pressed | `playing` | Board created, round 1 begins |
| `playing` | All players complete current round, rounds remain | `playing` | Advance to next round |
| `playing` | All rounds complete, no tie | `results` | Declare winner |
| `playing` | All rounds complete, tie exists | `tieBreaker` | Filter to tied players |
| `tieBreaker` | Tie-breaker round complete, no tie | `results` | Declare winner |
| `tieBreaker` | Tie-breaker round complete, tie persists, < 10 rounds | `tieBreaker` | Another round |
| `tieBreaker` | Tie-breaker round complete, tie persists, = 10 rounds | `results` | Declare co-winners |
| `results` | "Play Again" | `playing` | Reset scores, clear pucks, keep players |
| `results` | "New Players" | `registration` | Full reset |
| `results` | "Quit" | `ended` | Show farewell |

### TurnPhase (within a single turn)

| From | Event | To |
|------|-------|----|
| `aiming` | Player positions puck horizontally | `aiming` |
| `aiming` | Player releases puck / timer expires | `falling` |
| `falling` | Puck in shove zone, shove received | `falling` (shove applied) |
| `falling` | Puck exits shove zone | `falling` (shoves disabled) |
| `falling` | Puck settles in bucket / stall timeout | `scored` |
| `scored` | Score recorded, advance turn | (next turn's `aiming`) |
