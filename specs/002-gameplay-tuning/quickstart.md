# Quickstart: Gameplay Tuning

**Feature**: 002-gameplay-tuning  
**Date**: 2026-02-24

## What This Feature Changes

1. **Board layout**: 12→6 pin rows, 9→5 buckets, pin spacing 1.0→2.0, puck radius 0.25→0.5
2. **Pin stagger fix**: Removes a bug where pins in consecutive rows align vertically (no stagger)
3. **Out-of-bounds detection**: Pucks flying above the top edge end the round with 0 points
4. **Particle effects**: Pin-hit particles reduced from 6→3 per collision

## Files to Modify

| File | Change |
|------|--------|
| `src/config/game-config.ts` | Update `DEFAULT_BOARD_LAYOUT` and `DEFAULT_SHOVE_CONFIG` values |
| `src/config/board-geometry.ts` | Remove `rowOffset` from `computePinPositions()` to fix stagger bug |
| `src/types/contracts.ts` | Add `OutOfBoundsEvent` type, extend `PhysicsStepResult`, add `showOutOfBounds()` to `UIOverlayManager` |
| `src/physics/simulation.ts` | Add OOB detection in `step()` with grace period (30-tick timer) |
| `src/rendering/particles.ts` | Change `PARTICLE_CONFIG.pinHit.count` from 6 to 3 |
| `src/ui/overlay-manager.ts` | Implement `showOutOfBounds()` — transient 2s notification |
| `src/main.ts` | Handle `outOfBoundsPucks` in game loop: complete turn with 0 score, show notification |

## How to Verify

```bash
# Run unit tests (should pass after implementation)
npm run test:unit

# Run integration tests
npm run test:integration

# Start dev server and play
npm run dev
```

### Manual Verification Steps

1. **Board layout**: Start a game → visually confirm 6 rows of pins and 5 buckets
2. **Pin stagger**: Look at the board — odd rows should be visibly offset from even rows
3. **Puck size**: Drop a puck — it should be visually larger than before, proportional to pin spacing
4. **Out-of-bounds**: Apply a strong upward shove near the top of the board → puck should fly off top → "Out of Bounds" notification appears → round ends with 0 points → game continues
5. **Particles**: Drop a puck and watch pin collisions — sparks should be subtle (2-3 particles), not explosive

## Implementation Order

1. **Config values** (`game-config.ts`) — all other changes depend on these
2. **Stagger fix** (`board-geometry.ts`) — independent, fixes existing bug
3. **Particle reduction** (`particles.ts`) — independent, one-line change
4. **OOB types** (`contracts.ts`) — needed before physics and UI changes
5. **OOB detection** (`simulation.ts`) — core new logic
6. **OOB notification** (`overlay-manager.ts`) — UI for the new event
7. **Game loop integration** (`main.ts`) — wires everything together
8. **Tests** — unit tests for OOB detection, updated board-builder tests, integration test for OOB round

## Key Design Decisions

- **OOB detection is top-edge only** — side/bottom walls physically contain the puck (clarified during spec review)
- **Grace period uses tick counter** (30 ticks = 0.5s) — matches existing `BucketDetector.stalledTimers` pattern
- **Pin stagger fix removes `rowOffset`** — the natural centering of N-1 pins already produces correct half-spacing offset
- See [research.md](research.md) for full analysis
