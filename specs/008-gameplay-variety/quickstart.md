# Quickstart: Gameplay Variety & Polish

**Feature Branch**: `008-gameplay-variety`  
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

Work on the six stories in this sequence to minimize rework:

### 1. Proportional Bucket Widths (US4 — P2)

**Why first**: Changes `computeBucketBoundaries()` which all other features depend on. No dependencies on other new features.

**Files to modify**:
- `src/config/board-geometry.ts` — replace equal-width calc with log₁₀ proportional widths
- No type changes needed (return type unchanged)

**Verify**: Run `pnpm dev`, observe center bucket is visibly wider than side buckets.

### 2. Dynamic Pin Layout (US1 — P1)

**Why second**: Requires `pinsPerRow` on `BoardLayout` and round-transition board rebuild. Bucket proportional widths are already in place.

**Files to modify**:
- `src/types/index.ts` — add `pinsPerRow` to `BoardLayout`
- `src/config/game-config.ts` — add `pinsPerRow: 5` to defaults
- `src/config/board-geometry.ts` — update `computePinPositions()` to use `pinsPerRow`
- `src/main.ts` — regenerate layout + rebuild board on round transition

**Verify**: Play 3+ rounds, confirm pin grid changes between rounds.

### 3. Auto-Shove for Stuck Pucks (US2 — P1)

**Why third**: Depends on the physics world rebuild from step 2 being correct. The auto-shove adds detection + impulse logic.

**Files to modify**:
- `src/types/index.ts` — add `AutoShoveConfig`, add `autoShove` to `GameConfig`, add `autoShoveVelocityThreshold` to `PhysicsConfig`
- `src/config/game-config.ts` — add default auto-shove config
- `src/physics/bucket-detector.ts` — add stall→auto-shove→fallback flow
- `src/physics/simulation.ts` — add `applyAutoShove()` method
- `src/main.ts` — route AutoShoveEvent from detector to simulation

**Verify**: Drop puck into a tight pin arrangement; if stuck, observe auto-shove within 3s.

### 4. Coin Sound Effect (US3 — P2)

**Why fourth**: Self-contained synth addition. No dependencies on other new features.

**Files to modify**:
- `src/types/contracts.ts` — add `'coinDing'` to `SoundName`
- `src/audio/synth-effects.ts` — add `playCoinDing()` function
- `src/audio/audio-manager.ts` — route `'coinDing'` to `playCoinDing()`
- `src/main.ts` (or bucket scoring callback) — trigger `'coinDing'` on bucket landing

**Verify**: Drop puck, hear coin ding on bucket landing alongside existing arpeggio.

### 5. Player Name Persistence (US5 — P3)

**Why fifth**: Isolated to registration UI. No impact on gameplay code.

**Files to modify**:
- `src/ui/registration.ts` — add `loadSavedNames()`, `saveNames()`, pre-fill on mount, save on submit

**Verify**: Enter names, reload page, confirm names are pre-filled.

### 6. First-Round Shove Guidance (US6 — P3)

**Why last**: Depends on round tracking (step 2) and shove detection (existing). New UI overlay module.

**Files to create**:
- `src/ui/shove-guidance.ts` — popup overlay (DOM)

**Files to modify**:
- `src/main.ts` — track shoves during round 1, show popup at round end
- `src/types/contracts.ts` — add `'autoShove'` to `SoundName` (if not done in step 3)

**Verify**: Play round 1 without shoving, confirm popup appears at end of round 1.

---

## Key Formulas Reference

### Pin spacing (dynamic)

```typescript
const spacing = Math.min(2.0, (boardWidth - 2 * (pinRadius + puckRadius)) / (pinsPerRow - 1));
```

### Bucket proportional widths

```typescript
const weights = scores.map(s => Math.log10(s));
const total = weights.reduce((a, b) => a + b, 0);
const widths = weights.map(w => (w / total) * boardWidth);
```

### Auto-shove direction

```typescript
const offsets = [-0.4, 0.4, 0.0];
const hx = offsets[attempt % 3];
const hy = -1.0;
const mag = Math.sqrt(hx * hx + hy * hy);
// direction = { x: hx/mag, y: hy/mag }
```

---

## Architecture Notes

- **Board rebuild**: `sim.createWorld(config)` destroys and recreates the entire Planck.js world. All pucks are cleared. This is intentional — it's called at round transitions where the board must reset anyway.
- **Render data**: `pinRenderData` and `bucketRenderData` in `main.ts` are currently computed once at startup. After this feature, they must be recomputed at every round transition.
- **No new dependencies**: Everything uses existing Planck.js, Web Audio API, DOM, and localStorage.
