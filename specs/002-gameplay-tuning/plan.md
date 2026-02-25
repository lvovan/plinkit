# Implementation Plan: Gameplay Tuning — Board Layout, Particles & Out-of-Bounds

**Branch**: `002-gameplay-tuning` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-gameplay-tuning/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Tune the Plinko board for better gameplay: halve pin rows (12→6) with doubled spacing (~2.0), reduce buckets (9→5) with symmetric scores, scale puck radius proportionally (0.25→~0.5), reduce pin-hit particle count (6→2–3), and add out-of-bounds detection for pucks escaping above the top edge (grace period, zero-score round termination, "Out of Bounds" notification).

## Technical Context

**Language/Version**: TypeScript (strict mode), ES2022 target  
**Primary Dependencies**: Planck.js ^1.4.3 (physics), Vite (bundler)  
**Storage**: N/A (all state in-memory, browser-only SPA)  
**Testing**: Vitest (unit + integration), Playwright (E2E)  
**Target Platform**: Browser SPA — latest 2 versions of Chrome/Safari/Firefox/Edge  
**Project Type**: Client-side browser game (SPA)  
**Performance Goals**: 60 fps on mid-range mobile (2022-era), <1 MB gzipped bundle  
**Constraints**: Zero backend, offline-capable, canvas-based rendering, no hand-rolled physics  
**Scale/Scope**: Single-page game, 4 max players, local multiplayer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Browser-Only, Zero Backend | PASS | All changes are config/logic changes in the client SPA. No server interaction. |
| II | Physics Realism | PASS | Using Planck.js (proven 2D physics engine). Config changes only — pinRows, pinSpacing, puckRadius, bucketCount. Physics parameters remain tunable via `GameConfig`. Out-of-bounds detection reads puck position from the physics engine (no hand-rolled physics). |
| III | Cross-Device Responsive Play | PASS | Board dimensions unchanged (10×14). Layout adapts via existing responsive renderer. Touch targets unaffected. |
| IV | All-Ages Fun & Accessibility | PASS | Particle reduction improves visual clarity. Pin stagger preserves fun randomness. "Out of Bounds" notification uses existing overlay pattern. No mature content. |
| V | Test-First for Game Logic | PASS | New logic (out-of-bounds detection, board config changes) will have unit tests. Visual changes (particles) exempt from TDD per constitution but tested manually. |

**Technology Constraints Check**:
- TypeScript strict mode: PASS (no changes to tsconfig)
- Canvas rendering: PASS (existing canvas renderer used)
- Physics engine: PASS (Planck.js, no hand-rolled physics)
- Bundle size: PASS (config changes, negligible impact)
- Offline: PASS (no network changes)

**All gates pass. No violations to justify.**

## Project Structure

### Documentation (this feature)

```text
specs/002-gameplay-tuning/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── config/
│   ├── board-geometry.ts   # MODIFY: computePinPositions, computeBucketBoundaries unchanged algorithm, new defaults flow through
│   └── game-config.ts      # MODIFY: DEFAULT_BOARD_LAYOUT (pinRows, bucketCount, pinSpacing, puckRadius, bucketScores), DEFAULT_SHOVE_CONFIG (shoveZoneRowLimit)
├── core/
│   ├── game-loop.ts        # NO CHANGE
│   ├── state-machine.ts    # NO CHANGE (TurnResult already supports zero-score turns)
│   └── turn-manager.ts     # NO CHANGE
├── physics/
│   ├── board-builder.ts    # NO CHANGE (reads from config)
│   ├── bucket-detector.ts  # NO CHANGE (reads from config)
│   └── simulation.ts       # MODIFY: add out-of-bounds check in step(), new OutOfBoundsEvent type
├── rendering/
│   ├── particles.ts        # MODIFY: reduce pinHit count from 6 to 2–3
│   └── renderer.ts         # NO CHANGE
├── types/
│   ├── contracts.ts        # MODIFY: add OutOfBoundsEvent to PhysicsStepResult
│   └── index.ts            # NO CHANGE (BoardLayout, GameConfig types are generic)
├── ui/
│   └── overlay-manager.ts  # MODIFY: add showOutOfBounds() notification
└── main.ts                 # MODIFY: handle OutOfBoundsEvent in game loop onStep()

tests/
├── unit/
│   ├── physics/
│   │   ├── simulation.test.ts  # MODIFY: add out-of-bounds detection tests
│   │   └── board-builder.test.ts # MODIFY: update for new pin/bucket counts
│   └── core/
│       └── scoring.test.ts     # MODIFY: update bucket count expectations
├── integration/
│   └── game-session.test.ts    # MODIFY: add out-of-bounds round scenario
└── e2e/
    └── game-smoke.test.ts      # NO CHANGE (smoke test structure unchanged)
```

**Structure Decision**: Single project (existing structure). No new directories needed. Changes are configuration updates, a new physics check, and a UI notification — all within existing modules.

## Complexity Tracking

No constitution violations — this section is intentionally empty.

No new abstractions, layers, or dependencies are introduced. All changes modify existing configuration values, add a position-check in the physics step loop, and adjust a particle count constant.
