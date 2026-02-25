# Research: Round Persistence & Audio Tuning

**Feature**: 009-round-persistence-audio  
**Date**: 2026-02-25

## R1: Selective Pin Replacement in Planck.js (without destroying pucks)

### Decision
Replace pins and bucket dividers in-place using `world.destroyBody()` per body, while puck bodies remain untouched in the same world.

### Rationale
Planck.js `world.destroyBody(body)` removes a single body and all its fixtures/joints. Other bodies in the world are unaffected. The existing `clearPucks()` method already demonstrates this pattern — it destroys each puck body while leaving pins/walls intact. The pin replacement is the mirror image.

### Key findings
- `board.pins[]` holds planck.Body references. Destroy each, clear the array, create new pin bodies at new positions. Same for `board.bucketWalls[]`.
- The `begin-contact` listener is on the `world` object, not on individual bodies, so new pins with `{type: 'pin'}` userData will fire collision events correctly.
- Boundary walls (`board.walls[]` — left, right, bottom) do NOT need rebuilding since boardWidth/boardHeight stay fixed.
- After pin replacement, sleeping puck bodies won't interact with new pins unless woken. Must call `puck.body.setAwake(true)` on all pucks.
- `BucketDetector` must be rebuilt with the new `BoardLayout` since bucket boundaries may change if `pinsPerRow` changes.
- `shoveZoneY` must be recomputed from the new pin layout.

### Alternatives considered
- **Full world rebuild** (current approach): Destroys everything including pucks, creates a fresh world. Rejected because it's incompatible with puck persistence.
- **Second world for pucks**: Maintain pucks in a separate physics world and sync positions. Rejected — massive complexity, Planck.js doesn't support cross-world collisions.

---

## R2: Puck-Pin Overlap Detection & Settling After Pin Relocation

### Decision
Let the physics engine resolve overlaps naturally by stepping the world. Use distance-based checks only to identify which pucks were displaced (for score delta indicators).

### Rationale
Planck.js's contact solver handles penetration resolution automatically. With `positionIterations: 3`, overlaps are resolved within 1-3 world steps. This is simpler, more robust (handles chain reactions automatically), and produces the visible animated settling the spec requires.

### Key findings
- **Distance check** (circle-circle): `distance² < (puckRadius + pinRadius)²` identifies overlapping pucks. O(pucks × pins) but both counts are small (≤20 pucks, ≤54 pins).
- **Planck.js `testOverlap()`**: Available in v1.x for precise shape overlap testing. Useful but overkill for circle-circle.
- **Settlement detection**: Reuse existing `BucketDetector` logic. Wake all pucks (`setAwake(true)`), reset `isSettled = false` and `settledInBucket = null` on displaced pucks. The game loop's `step()` already runs `bucketDetector.checkSettled()` every tick.
- **All-settled check**: `board.pucks.every(p => p.isSettled)` — already the pattern used by the game loop.
- **Settlement thresholds**: `stalledVelocityThreshold = 0.01` u/s, `BUCKET_SETTLE_TICKS = 30` (0.5s), absolute `stalledTimeoutMs = 10000` (10s).
- **Performance**: At 60 fps with 20 pucks and 54 pins, settling within 2 seconds (120 frames) is easily achievable.

### Alternatives considered
- **Teleport pucks to nearest valid position**: Calculate positions analytically. Rejected — doesn't produce the animated settling the spec requires, and chain reactions are hard to compute without physics.
- **Dedicated micro-simulation**: Run settling at accelerated speed behind the scenes, replay as animation. Rejected — unnecessary complexity; real-time physics stepping is fast enough and provides built-in animation.

---

## R3: Bounce Multiplier Persistence on PuckBody

### Decision
Add `bounceMultiplier: number` field to the `PuckBody` interface. Set it when puck settles. Default to `1.0` at creation.

### Rationale
The bounce multiplier is currently a transient module-level `let bounceCount` in main.ts that is reset to 0 after each turn's `completeTurn()`. The `PuckBody` — which persists in the physics world — has no record of the multiplier. Since pucks now persist across rounds, the multiplier must be stored on the puck itself so that score recalculation after repositioning can use `baseScore × puck.bounceMultiplier` instead of recomputing from collisions.

### Key findings
- `bounceCount` declared at main.ts L132, incremented at L275 (per collision), used at L342 (settlement scoring), reset at L370.
- `ScoreBreakdown` already has `multiplier: number` — this is the value to persist.
- `PuckBody` interface at board-builder.ts L21-29 currently has: `id, body, playerId, turnIndex, isSettled, settledInBucket, createdAtTick`.
- At settlement, after `scoring.calculateRoundScore()` returns `ScoreBreakdown`, stamp `puckBody.bounceMultiplier = scoreBreakdown.multiplier`.
- During score recalculation after repositioning: `newScore = bucketScores[newBucket] × puck.bounceMultiplier` per puck.

### Alternatives considered
- **Store bounceCount instead of multiplier**: Would require re-running the multiplier calculation (rate^count, capped). Multiplier is pre-computed and capped — storing it directly is simpler and avoids rounding differences.
- **Side-map (puckId → multiplier)**: Parallels the `puckStyleMap` pattern. Rejected — the multiplier is intrinsic to the puck and doesn't change once set. Adding to the type is cleaner.

---

## R4: Score Delta Indicators (Floating Text Effect)

### Decision
Add a `ScoreDeltaEffect` type to the existing `EffectsManager`. Follows the same float-up-and-fade pattern as `ScorePopEffect`.

### Rationale
The codebase already has `ScorePopEffect` — a floating two-line text effect that floats upward and fades over 1800ms via canvas `strokeText`/`fillText`. Score delta indicators need the same behavior with different content ("+X" / "−X"). Adding a new effect type to `EffectsManager` reuses the entire lifecycle (create → store → render → auto-expire).

### Key findings
- `EffectsManager` holds arrays per effect type, renders all in `renderEffects()`, auto-expires by filtering on `now - startTime >= duration`.
- `ScorePopEffect` structure: `{x, y, startTime, duration(1800ms), breakdown: ScoreBreakdown}`.
- Rendering: `ctx.strokeText` + `ctx.fillText` with black outline, floats upward (`yOffset = progress * -40px`), alpha fades 1→0.
- All effects are canvas-drawn — no DOM overlay needed. World-to-canvas transform is already passed to `renderEffects()`.

### Suggested structure
```typescript
interface ScoreDeltaEffect {
  x: number;           // world coords (puck position)
  y: number;
  deltaText: string;   // e.g., "+1,000" or "−500"
  color: string;       // player's puck color for visual association
  startTime: number;
  duration: number;    // ~1200ms (shorter than ScorePop's 1800ms)
}
```

### Alternatives considered
- **DOM overlay**: Would require world-to-screen coordinate sync, DPR handling, z-index management. Every other visual effect is canvas-drawn. Rejected.
- **Reuse ScorePopEffect**: Similar but semantically different (score pop = earned score, delta = change after repositioning). Different text format and potentially different duration/color. A separate type is cleaner.

---

## R5: Music Volume as Ratio of SFX Volume

### Decision
Set music volume to `sfxVolume × 0.30`. With default SFX volume of 0.7, music becomes 0.21.

### Rationale
Straightforward config change. Music and SFX gain nodes are independent paths from `masterGain`, so changing music volume doesn't affect SFX.

### Key findings
- SFX default: `sfxVolume = 0.7` in `GameAudioManager`.
- Music default: `volume = 0.3` in `GameMusicManager` (currently 43% of SFX — needs to become 30%).
- New music volume: `0.7 × 0.30 = 0.21`.
- Audio bus: `masterGain → sfxGain (SFX path)` and `masterGain → musicGain (music path)`. Independent.
- `setVolume(v)` on MusicManager sets `musicGain.gain.value`. Simple constant change.
- No config-driven volume system exists — values are hardcoded in manager constructors. The fix is a one-line constant change.

### Alternatives considered
- **Config-driven volume ratio**: Add `musicToSfxRatio` to `GameConfig` and compute at runtime. Rejected for now — overkill for a single constant. Can be added later if volume becomes user-configurable.
