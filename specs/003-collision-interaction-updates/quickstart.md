# Quickstart: Collision & Interaction Updates

**Feature**: 003-collision-interaction-updates  
**Date**: 2026-02-25

## Prerequisites

- Node.js (latest LTS)
- npm

## Setup

```bash
git checkout 003-collision-interaction-updates
npm install
```

## Development

```bash
npm run dev        # Start Vite dev server with hot reload
npm run typecheck  # TypeScript strict mode check
npm run lint       # ESLint
```

## Testing

```bash
npm test           # Run all Vitest tests
npm run test:unit  # Unit tests only
npm run test:watch # Watch mode during development
npm run test:e2e   # Playwright end-to-end tests
```

## Key Files to Modify

| File | What Changes |
|------|-------------|
| `src/types/index.ts` | Add `ScoringConfig`, `ScoreBreakdown` types |
| `src/types/contracts.ts` | Extend `RenderState` with `dropIndicator`, extend `TurnResult` |
| `src/config/game-config.ts` | Add `DEFAULT_SCORING_CONFIG`, wire into `GameConfig` |
| `src/core/scoring.ts` | Add `calculateRoundScore()` method |
| `src/rendering/effects.ts` | Add `CollisionFlash`, `SlashEffect` pools; `addCollisionFlash()`, `addSlashEffect()`, `renderEffects()` methods; modify `triggerScorePop()` to accept `ScoreBreakdown` |
| `src/rendering/renderer.ts` | Render ghost puck from `RenderState.dropIndicator`; modify `emitParticles()` to only emit for `bucketLand`; call `effects.renderEffects()` in `drawFrame()` |
| `src/rendering/particles.ts` | Delete file (unused standalone system) |
| `src/main.ts` | Expand collision loop to all types, add bounce counter, wire ghost puck into `RenderState`, wire slash effect on shove, proportional shake, use `calculateRoundScore()`, fix score pop rendering |

## Key Files to Test

| Test File | What to Test |
|-----------|-------------|
| `tests/unit/core/scoring.test.ts` | `calculateRoundScore()`: zero bounces, normal bounces, cap at 17+, edge cases |
| `tests/unit/rendering/effects.test.ts` | Flash lifecycle (create, active, expire), slash lifecycle, score breakdown formatting |
| `tests/integration/game-session.test.ts` | Full round flow with bounce counting and multiplied scoring |

## Architecture Notes

- **No new dependencies** — all features use existing Canvas 2D API and Web Audio API
- **No backend changes** — everything runs client-side (Constitution I)
- **Performance budget**: all new effects must maintain 60fps on mid-range mobile
- **Test-first**: scoring logic and effect lifecycle must have unit tests before implementation (Constitution V)
- **Visual effects exempt from TDD**: radial flash, slash, ghost puck need manual test scenarios only

## Feature Verification Checklist

1. Drop a puck → every pin/puck/wall collision shows a radial flash + multiplier text + bounce sound
2. No particle spray effects on collisions or shoves (bucket-landing particles still appear)
3. Score shown as breakdown: "baseScore × multiplier× = totalScore"
4. Ghost puck visible at top of board before drop, follows horizontal input
5. Shove produces a directional slash animation + proportional board shake
6. 10 bounces into a bucket scores ≥2× more than 5 bounces into the same bucket
7. 60fps maintained on mobile during normal gameplay
