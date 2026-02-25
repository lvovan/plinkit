# Data Model: Collision & Interaction Updates

**Feature**: 003-collision-interaction-updates  
**Date**: 2026-02-25

## Entity Definitions

### ScoringConfig

Configuration for the bounce-based exponential scoring system.

| Field | Type | Description |
|-------|------|-------------|
| `bounceMultiplierRate` | `number` | Per-bounce exponential rate. Default: `1.15` |
| `bounceMultiplierCap` | `number` | Maximum multiplier value. Default: `10.0` |

**Relationships**: Lives within `GameConfig`. Used by `ScoringEngine`.
**Validation**: `bounceMultiplierRate > 1.0`, `bounceMultiplierCap >= 1.0`.

---

### ScoreBreakdown

Result of scoring a single round, showing the full calculation.

| Field | Type | Description |
|-------|------|-------------|
| `baseScore` | `number` | Score from the bucket index lookup |
| `bounceCount` | `number` | Total collisions during the round |
| `multiplier` | `number` | `min(rate^bounceCount, cap)` |
| `totalScore` | `number` | `floor(baseScore × multiplier)` |

**Relationships**: Produced by `ScoringEngine.calculateRoundScore()`. Consumed by `EffectsManager` (score breakdown display) and `TurnResult`.
**Validation**: `bounceCount >= 0`, `multiplier >= 1.0`, `totalScore >= baseScore`.

---

### CollisionFlash

A time-limited radial flash visual effect at a collision point.

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | World X coordinate of impact |
| `y` | `number` | World Y coordinate of impact |
| `startTime` | `number` | `performance.now()` when created |
| `duration` | `number` | Lifetime in ms. Default: `250` |
| `multiplierText` | `string` | Current bounce multiplier as text (e.g., `"1.3×"`) |

**Relationships**: Created from `CollisionEvent` data + current bounce counter. Managed as a pool in `EffectsManager`.
**State transitions**: Active → Expired (when `now - startTime > duration`). Expired items are removed from pool.
**Validation**: `duration > 0`, `duration <= 300` (FR-003).

---

### SlashEffect

A directional slash animation triggered on successful shove.

| Field | Type | Description |
|-------|------|-------------|
| `originX` | `number` | World X of the puck at shove time |
| `originY` | `number` | World Y of the puck at shove time |
| `directionX` | `number` | Normalized X component of shove direction |
| `directionY` | `number` | Normalized Y component of shove direction |
| `magnitude` | `number` | Force magnitude of the shove (0 to `maxForceMagnitude`) |
| `startTime` | `number` | `performance.now()` when created |
| `duration` | `number` | Lifetime in ms. Default: `400` |

**Relationships**: Created from shove vector + puck position. Managed as a pool in `EffectsManager`.
**State transitions**: Active → Expired (when `now - startTime > duration`). FR-018 constrains `duration <= 500`.
**Validation**: `magnitude > 0`, `duration <= 500`.

---

### DropIndicator

State for the pre-drop visual helper (ghost puck).

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | Current horizontal position in world coordinates |
| `style` | `PuckStyle` | Player's puck visual style (color, pattern) |
| `visible` | `boolean` | Whether the indicator is showing |

**Relationships**: Populated from `dropX` and current player's style. Passed to renderer via `RenderState`.
**State transitions**: 
- Round start → visible, defaults to center (`x = 0`)
- Player drags → x updates in real time
- Player releases (drop) → visible becomes false
- Round end → reset

**Validation**: `x` clamped to `[-boardWidth/2, boardWidth/2]` (FR-015).

---

### ScorePopEffect (extended)

Extension of the existing `ScorePopEffect` to support score breakdown display.

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | World X coordinate |
| `y` | `number` | World Y coordinate |
| `breakdown` | `ScoreBreakdown` | Full scoring breakdown for display |
| `startTime` | `number` | `performance.now()` when created |
| `duration` | `number` | Lifetime in ms. Changed from `1200` to `1800` |

**Relationships**: Created on bucket settlement. Replaces current `ScorePopEffect` (which only held a raw `score` number).
**Rendering**: Line 1: `"baseScore × multiplier×"` (smaller text). Line 2: `"= totalScore"` (larger, bold).

---

## Modified Existing Entities

### CollisionEvent (unchanged)

No changes to the physics-layer type. Collision events already carry `type`, `puckId`, `x`, `y`. The bounce counter lives in the game loop (main.ts), not in the event.

### GameConfig (extended)

Add `scoring: ScoringConfig` sub-object alongside existing `board`, `physics`, `shove`, `game` sections.

### RenderState (extended)

Add optional `dropIndicator?: DropIndicator` field. When present, the renderer draws the ghost puck.

### TurnResult (extended)

Add `bounceCount: number` and `scoreBreakdown: ScoreBreakdown` fields so downstream consumers (state machine, results display) have access to the full scoring data.

### Renderer interface (extended)

No new methods required — visual effects (flash, slash) are managed via `EffectsManager` and rendered in `drawFrame` via the effects pool. The `emitParticles` method behavior changes: only emits for `bucketLand` type, ignores others.

---

## Entity Relationship Diagram

```
GameConfig ─── ScoringConfig
                  │
                  ▼
CollisionEvent ──► BounceCounter (main.ts variable) ──► ScoringEngine.calculateRoundScore()
                                                              │
                                                              ▼
                                                        ScoreBreakdown
                                                         │         │
                                                         ▼         ▼
                                                    TurnResult   ScorePopEffect (extended)
                                                                      │
                                                                      ▼
                                                               EffectsManager.render()

CollisionEvent ──► CollisionFlash (pool in EffectsManager)
                        │
                        ▼
                   Renderer.drawFrame()

ShoveVector ──► SlashEffect (pool in EffectsManager)
                     │
                     ▼
                Renderer.drawFrame()

InputManager.dropX ──► DropIndicator (in RenderState)
                            │
                            ▼
                       Renderer.drawFrame()
```
