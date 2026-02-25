# Quickstart: Persistent Puck Growth & Board Standardization

**Feature Branch**: `010-persistent-puck-growth`  
**Date**: 2026-02-25

---

## Prerequisites

- Node.js ≥ 18
- pnpm (or npm)

```bash
pnpm install
```

---

## Dev Server

```bash
pnpm dev
```

Opens at `http://localhost:5173`. Hot-reload is active.

---

## Test Commands

```bash
# Unit & integration tests
pnpm test

# Unit tests in watch mode
pnpm test:watch

# E2E tests (Playwright)
pnpm test:e2e

# Type checking
pnpm typecheck
```

---

## Feature Implementation Order

Work on the stories in this sequence to minimize rework:

### 1. Fixed 8-Row Board Layout (US1 — P1)

**Why first**: All other changes depend on a stable, fixed board. Removing randomization is a subtraction — fewer code paths, simpler testing.

**Files to modify**:
- `src/config/game-config.ts` — set `pinRows: 8` in `DEFAULT_BOARD_LAYOUT`
- `src/main.ts` — delete `randomizeLayout()` function and all call sites

**Tests to write first**:
- `tests/unit/board-layout-fixed.test.ts` — assert `computePinPositions()` with `pinRows: 8` produces exactly 8 rows, assert no randomization function exists

**Verify**: Run `pnpm dev`, start a 2-player game, play 3+ rounds, confirm pin layout never changes.

### 2. Shove-Zone Boundary at Row 6 (US4 — P2)

**Why second**: Simple config change, no dependencies on other new features. Combined with step 1 to lock down the board configuration.

**Files to modify**:
- `src/config/game-config.ts` — set `shoveZoneRowLimit: 6` in `DEFAULT_SHOVE_CONFIG`

**Tests to write first**:
- `tests/unit/shove-zone.test.ts` — assert `computeShoveZoneY()` with 8 rows and limit 6 returns the Y coordinate of row 6

**Verify**: Drop a puck, shove above row 6 (accepted), attempt shove below row 6 (rejected). Confirm boundary line renders at the correct position.

### 3. Persistent Pucks Across Rounds (US5 — P2)

**Why third**: Enables the growth mechanic (step 5). Requires removing `clearPucks()` and `createWorld()` from round transitions.

**Files to modify**:
- `src/main.ts` — remove `sim.clearPucks()`, `puckStyleMap.clear()`, and `sim.createWorld(config)` from `transitionToNextRound()`
- `src/physics/simulation.ts` — no changes (clearPucks still exists for game-end reset)

**Tests to write first**:
- `tests/integration/persistent-pucks.test.ts` — start game, drop puck, advance round, assert puck body still exists in `board.pucks`

**Verify**: Play a 2-player game for 3 rounds. After each round, confirm all previous pucks remain visible and physically interact with new drops.

### 4. Score Multiplier Reset Per Turn (US3 — P2)

**Why fourth**: Independent fix. Verify the existing `bounceCount = 0` reset occurs at the correct point in the turn lifecycle.

**Files to modify**:
- `src/main.ts` — verify/ensure `bounceCount` resets at turn start (before `dropPuck()`)

**Tests to write first**:
- `tests/unit/multiplier-reset.test.ts` — simulate two sequential turns, assert multiplier starts at 1.0× for each turn regardless of prior bounces

**Verify**: Play 2 turns. On turn 1, note the multiplier. On turn 2, confirm it starts at 1.0×.

### 5. Same-Player Puck Growth on Contact (US2 — P1)

**Why fifth**: Depends on persistent pucks (step 3) and fixed board (step 1). This is the core new mechanic.

**Files to create**:
- `src/physics/puck-growth.ts` — growth logic: `computeGrownRadius()`, `resizePuckFixture()`, `processGrowthQueue()`
- `tests/unit/puck-growth.test.ts` — growth factor, cap enforcement, chain depth limiting

**Files to modify**:
- `src/types/index.ts` — add `GrowthConfig`, `GrowthEvent`, extend `RuntimePuck`
- `src/types/contracts.ts` — add `'puckGrowth'` to `SoundName`, extend `RenderState`
- `src/config/game-config.ts` — add `DEFAULT_GROWTH_CONFIG`, add `growth` to `DEFAULT_GAME_CONFIG`
- `src/physics/board-builder.ts` — extend `PuckBody` with growth fields
- `src/physics/simulation.ts` — add contact listener for same-player detection, integrate growth queue processing into `step()`
- `src/main.ts` — wire growth events to audio + rendering

**Tests to write first**:
- `computeGrownRadius()` — assert 20% surface area increase (radius × √1.2)
- `computeGrownRadius()` — assert cap at 0.631 world units
- `processGrowthQueue()` — assert chain depth cap at 10
- `processGrowthQueue()` — assert cross-player contacts do NOT trigger growth

**Verify**: Drop two pucks for the same player near each other. Confirm both grow visibly when they touch. Drop a puck for a different player near them — confirm no growth.

### 6. Pop Sound Effect (part of US2)

**Why sixth**: Self-contained audio addition. Growth visuals (step 5) should already work.

**Files to modify**:
- `src/audio/synth-effects.ts` — add `playPuckGrowth()` function
- `src/audio/audio-manager.ts` — route `'puckGrowth'` to `playPuckGrowth()`
- `src/main.ts` — play `'puckGrowth'` sound on growth events

**Verify**: Trigger a same-player puck contact, hear the pop sound alongside the visual animation.

### 7. Revocable Scoring + Negative Score Flash (US5-sc4, FR-016–FR-018)

**Why last**: Most complex scoring change. Depends on persistent pucks (step 3) and growth displacement (step 5).

**Files to modify**:
- `src/physics/board-builder.ts` — add `lastScoredBucket`, `scoreAwarded` to `PuckBody`
- `src/physics/bucket-detector.ts` — add `checkDisplacement()` method, monitor settled pucks
- `src/core/scoring.ts` — add `revokeScore()` method with clamp ≥ 0
- `src/rendering/effects.ts` — add `NegativeScoreFlash` effect type
- `src/rendering/renderer.ts` — render negative score flash
- `src/main.ts` — wire score revocation events

**Tests to write first**:
- `tests/unit/scoring-revocable.test.ts` — assert score subtraction on displacement, clamp ≥ 0
- `tests/unit/bucket-displacement.test.ts` — assert settled puck waking + moving outside bucket triggers unsettlement

**Verify**: Drop a puck into a bucket (scores). Drop another puck that hits the first one out of the bucket. Confirm score is subtracted and a red "-X" flash appears.

---

## Key Formulas Reference

### Growth radius calculation

```typescript
// Surface area grows by factor → radius grows by √factor
const newRadius = Math.min(
  currentRadius * Math.sqrt(growthFactor),
  maxPuckRadius,
);
```

### Maximum puck radius (from 8-row geometry)

```typescript
// Diagonal pin-center distance in 8-row layout
const rowSpacing = (14.0 - 2 * 1.5) / (8 - 1);  // ≈ 1.571
const diagonal = Math.sqrt((2.0 / 2) ** 2 + rowSpacing ** 2);  // ≈ 1.863
const edgeGap = diagonal - 2 * 0.30;  // ≈ 1.263
const maxPuckRadius = edgeGap / 2;    // ≈ 0.631
```

### Score revocation

```typescript
player.score = Math.max(0, player.score - revokedScore);
```

---

## Architecture Notes

- **No world rebuild on round transition**: The Planck.js world persists for the entire game session. `createWorld()` is only called at game start and full game reset (Play Again / New Players).
- **Growth between steps**: Fixture modifications are forbidden during `world.step()`. Growth events are queued in the contact listener and processed afterwards. Chain reactions use micro-steps.
- **Rendering dynamic radii**: `RenderState.pucks[].radius` already exists. It now pulls from `PuckBody.currentRadius` instead of the fixed `boardLayout.puckRadius`.
- **No new dependencies**: Everything uses existing Planck.js, Web Audio API, and Canvas 2D.
