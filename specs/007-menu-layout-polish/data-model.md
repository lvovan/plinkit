# Data Model: Menu System & Layout Polish

**Feature**: 007-menu-layout-polish  
**Date**: 2025-02-25  
**Source**: [spec.md](spec.md), [research.md](research.md)

## New Entities

### SlowMotionPhase (enum)

Represents the current phase of the slow-motion effect lifecycle.

| Value | Description |
|-------|-------------|
| `normal` | No slow-motion active. `timeScale = 1.0` |
| `entering` | Transitioning from normal to slow. Easing: `easeOutCubic` |
| `slow` | At target slow speed. `timeScale = targetScale` |
| `exiting` | Transitioning from slow to normal. Easing: `easeInCubic` |

### SlowMotionConfig (interface)

Static configuration for the slow-motion effect. Stored in `GameConfig`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `targetScale` | `number` | `0.3` | Physics time-scale during slow phase (0–1) |
| `enterDuration` | `number` | `0.25` | Seconds (real-time) to transition into slow-mo |
| `holdDuration` | `number` | `1.5` | Seconds (real-time) to stay in slow-mo |
| `exitDuration` | `number` | `0.4` | Seconds (real-time) to transition back to normal |

**Validation rules**:
- `0 < targetScale < 1`
- All durations > 0
- Total real-time ≈ enterDuration + holdDuration + exitDuration

### SlowMotionState (interface)

Runtime state for the slow-motion controller. Managed in `slow-motion.ts`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `phase` | `SlowMotionPhase` | `'normal'` | Current lifecycle phase |
| `timeScale` | `number` | `1.0` | Current effective time-scale (0.3–1.0) |
| `phaseElapsed` | `number` | `0` | Seconds elapsed in current phase (real-time) |
| `triggeredThisTurn` | `boolean` | `false` | Once-per-turn guard |

**State transitions**:
```
normal → entering   (puck crosses shoveZoneY, !triggeredThisTurn)
entering → slow     (phaseElapsed ≥ enterDuration)
slow → exiting      (phaseElapsed ≥ holdDuration)
exiting → normal    (phaseElapsed ≥ exitDuration)
```

**Reset**: On turn start → `phase='normal'`, `timeScale=1`, `triggeredThisTurn=false`, `phaseElapsed=0`

### BackgroundConfig (type)

Configuration for procedural background generation.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `skyTopColor` | `string` | `'#87CEEB'` | Top of sky gradient |
| `skyHorizonColor` | `string` | `'#E0F0FF'` | Bottom of sky gradient |
| `sunColor` | `string` | `'#FFE066'` | Sun fill color |
| `hillLayers` | `HillLayerConfig[]` | (see below) | Per-layer hill configuration |
| `cloudCount` | `number` | `5` | Number of cloud entities |
| `cloudSpeedRange` | `[number, number]` | `[3, 8]` | Cloud drift speed range (px/s) |
| `cloudRenderInterval` | `number` | `3` | Re-render cloud buffer every N frames |

### HillLayerConfig (interface)

Configuration for a single hill silhouette layer.

| Field | Type | Description |
|-------|------|-------------|
| `baseY` | `number` | Vertical offset as fraction of canvas height (0–1) |
| `amplitudes` | `number[]` | Sine wave amplitudes (px) |
| `frequencies` | `number[]` | Sine wave frequencies |
| `phases` | `number[]` | Sine wave phase offsets |
| `fillColor` | `string` | Fill color for this hill layer |

### CloudEntity (interface)

Runtime state for a single animated cloud.

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | Current horizontal position (px) |
| `y` | `number` | Vertical position (px, constant after generation) |
| `scale` | `number` | Size scale factor (0.5–1.3) |
| `speed` | `number` | Drift speed (px/s) |

### ScoreboardRowState (interface)

Runtime state for a single scoreboard DOM row. Keyed by player ID.

| Field | Type | Description |
|-------|------|-------------|
| `element` | `HTMLElement` | Persistent DOM element for this row |
| `currentRank` | `number` | Current visual rank (0-based, used for `translateY`) |
| `displayedScore` | `number` | Last rendered score value |

**Note**: Not a new type definition file — this is internal state within the refactored `Scoreboard` class. Included here because it replaces the current innerHTML pattern.

---

## Modified Entities

### GameConfig (existing, `src/types/index.ts`)

**Addition**: New `slowMotion` field.

| Field | Type | Description |
|-------|------|-------------|
| `slowMotion` | `SlowMotionConfig` | Slow-motion effect configuration |

### PhysicsConfig → simulation.step() signature

**Change**: `step()` gains an optional `timeScale` parameter.

| Before | After |
|--------|-------|
| `step(): PhysicsStepResult` | `step(timeScale?: number): PhysicsStepResult` |

Internally: `this.board.world.step(fixedTimestep * (timeScale ?? 1.0))`

### CollisionFlash (existing, `src/types/index.ts`)

**Change**: `multiplierText` format changes from `"N.N×"` to `"×N.N"`.

No structural change — the `multiplierText` field remains `string`. The change is in the `formatMultiplier()` function output.

### AudioManager.play() signature

**Change**: Options gain optional `timeScale` field.

| Before | After |
|--------|-------|
| `play(name, { pitchVariation? })` | `play(name, { pitchVariation?, timeScale? })` |

### GameMusicManager

**Addition**: `setTimeScale(scale: number)` method + internal `timeScale` property.

Affects scheduler tick rate and note generation (frequency × `timeScale^0.5`, duration × `1/timeScale`).

---

## Unchanged Entities

- **Player**: No changes. Score field is read by scoreboard; sort is a display concern.
- **GameSession**: No changes. Slow-motion is a rendering/audio effect, not persisted.
- **Turn**: No changes. Slow-motion trigger is ephemeral.
- **RuntimePuck**: No changes. Used to detect shove-line crossing via position.
- **PuckStyle**: No changes.
- **BoardLayout**: No changes. `shoveZoneY` already computed from existing layout data.
- **ScoreBreakdown**: No changes. `multiplier` field is a number; formatting is a view concern.

---

## Entity Relationships

```
GameConfig ──has──▸ SlowMotionConfig
                    (static configuration)

SlowMotionState ──reads──▸ SlowMotionConfig
                 ──triggers from──▸ RuntimePuck position vs shoveZoneY
                 ──controls──▸ Simulation.step(timeScale)
                 ──controls──▸ AudioManager.play(timeScale)
                 ──controls──▸ GameMusicManager.setTimeScale()

BackgroundConfig ──has many──▸ HillLayerConfig (3 layers)
                 ──has many──▸ CloudEntity (4–6 runtime instances)

ScoreboardRowState ──keyed by──▸ Player.id
                   ──reads──▸ Player.score (for sort + display)
                   ──reads──▸ Player.name, Player.puckStyle (for display)
```
