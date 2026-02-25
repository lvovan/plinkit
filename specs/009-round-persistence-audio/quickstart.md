# Quickstart: Round Persistence & Audio Tuning

**Feature**: 009-round-persistence-audio  
**Date**: 2026-02-25

## Prerequisites

- Node.js (LTS)
- npm

## Setup

```bash
git checkout 009-round-persistence-audio
npm install
```

## Development

```bash
npm run dev          # Vite dev server on http://localhost:5173
```

## Testing

```bash
npm test             # Vitest unit + integration tests
npx playwright test  # E2E tests (requires browsers installed)
```

## Architecture Overview

### Key files to modify

| File | What changes |
|------|-------------|
| `src/physics/board-builder.ts` | Add `bounceMultiplier` to `PuckBody` interface |
| `src/physics/simulation.ts` | Add `rebuildBoard()` method, add `getAllPucks()` |
| `src/main.ts` | Change `transitionToNextRound()` to skip `clearPucks()`/`createWorld()`, call `rebuildBoard()` instead. Stamp `bounceMultiplier` at settlement. Add score recalculation + delta indicators after settling. |
| `src/rendering/effects.ts` | Add `ScoreDeltaEffect` type and `addScoreDelta()` method |
| `src/audio/music-manager.ts` | Change default volume from 0.3 to 0.21 |
| `src/core/scoring.ts` | Add `recalculateAllScores()` helper using persisted bounce multipliers |

### Key concepts

1. **Puck persistence**: Remove `sim.clearPucks()` and `sim.createWorld()` from round transitions. Pucks stay in the physics world.
2. **Pin-only rebuild**: New `sim.rebuildBoard(config)` destroys pins + bucket walls, creates new ones, wakes pucks.
3. **Bounce multiplier**: Stored on `PuckBody` at settlement time. Used for score recalculation after repositioning.
4. **Settling phase**: After pin rebuild, physics engine runs visibly. Displaced pucks settle naturally via collision resolution.
5. **Score deltas**: After all pucks re-settle, compare old vs new bucket assignments. Show floating "+X"/"-X" indicators via `EffectsManager`.

### Test strategy

- **Unit tests**: Test `rebuildBoard()` preserves pucks, test score recalculation with persisted multipliers, test `bounceMultiplier` is set correctly at settlement.
- **Integration tests**: Full round transition with puck persistence → pin rebuild → settling → score recalculation.
- **E2E tests**: Play a multi-round game, verify pucks visible across rounds.
- **Manual tests**: Visual verification of settling animation and score delta indicators.
