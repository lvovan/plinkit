# Implementation Plan: Round Persistence & Audio Tuning

**Branch**: `009-round-persistence-audio` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-round-persistence-audio/spec.md`

## Summary

Pucks persist on the board across rounds instead of being cleared. Pin layout re-randomizes only at round boundaries (before P1's turn), ensuring all players in a round face the same layout. When pins relocate, overlapping pucks are pushed to stable positions via animated physics settling, scores are recalculated (preserving original bounce multipliers), and floating score delta indicators are shown. Music volume is set to 30% of SFX volume.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode), target ES2022  
**Primary Dependencies**: Planck.js ^1.4.3 (physics), Vite ^7.3.1 (build)  
**Storage**: N/A (browser-only, in-memory state)  
**Testing**: Vitest ^4.0.18 (unit + integration), Playwright ^1.58.2 (e2e)  
**Target Platform**: Browser SPA (latest 2 versions of Chrome/Safari/Firefox/Edge), offline-capable  
**Project Type**: Client-side game (canvas-rendered)  
**Performance Goals**: 60 fps on mid-range mobile, puck repositioning < 2 seconds  
**Constraints**: Offline-capable after first load, no backend, no native dependencies, bundle < 1 MB gzipped  
**Scale/Scope**: 2–4 players, 5 rounds default, ~20 max pucks on board

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Browser-Only, Zero Backend | **PASS** | All changes are client-side. No server interaction. |
| II. Physics Realism | **PASS** | Uses Planck.js for repositioning (animated settling via physics engine). No hand-rolled collision resolution. Physics params remain config-driven. |
| III. Cross-Device Responsive Play | **PASS** | No new UI surfaces — score deltas are rendered on canvas. No touch target changes. No layout changes. |
| IV. All-Ages Fun & Accessibility | **PASS** | Score delta indicators use existing puck colors (4.5:1 contrast already ensured). No new text reading required. |
| V. Test-First for Game Logic | **PASS** | Puck persistence, pin-only-at-round-boundary, score recalculation, and bounce multiplier preservation are all testable game logic. Visual settling animation is exempt (rendering). |
| Tech: TypeScript strict | **PASS** | No `any` types needed. |
| Tech: Canvas rendering | **PASS** | Score delta indicators rendered on canvas, not DOM. |
| Tech: Proven physics library | **PASS** | Planck.js used for settling simulation. |
| Tech: Bundle size < 1 MB | **PASS** | No new dependencies. Minimal code additions. |
| Tech: Offline capable | **PASS** | No network calls added. |
| Workflow: Commit hygiene | **PASS** | Feature decomposable into logical commits per user story. |

**Gate result: PASS** — No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/009-round-persistence-audio/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main.ts                        # Game orchestration — round transitions, puck lifecycle
├── config/
│   └── game-config.ts             # Default config values (volume ratio)
├── core/
│   ├── state-machine.ts           # Round end evaluation, session lifecycle
│   ├── turn-manager.ts            # Turn rotation within rounds
│   └── scoring.ts                 # Score recalculation after repositioning
├── physics/
│   ├── board-builder.ts           # Board/PuckBody types, world construction
│   ├── simulation.ts              # Physics world management, puck creation/clearing
│   └── puck-settler.ts            # NEW: Puck repositioning/settling logic
├── audio/
│   ├── audio-manager.ts           # SFX volume
│   └── music-manager.ts           # Music volume (30% of SFX)
├── rendering/
│   └── renderer.ts                # Score delta indicator rendering
└── types/
    ├── index.ts                   # Type additions (bounce multiplier on PuckBody)
    └── contracts.ts               # PhysicsSimulation contract updates

tests/
├── unit/
│   ├── puck-persistence.test.ts   # FR-001, FR-002
│   ├── pin-randomization.test.ts  # FR-003, FR-004
│   ├── puck-settling.test.ts      # FR-005, FR-006, FR-007, FR-008
│   └── audio-volume.test.ts       # FR-009
└── integration/
    └── round-transition.test.ts   # Full round flow with persistence + settling
```

**Structure Decision**: Single existing project structure. No new directories except `puck-settler.ts` in `src/physics/`. Test files added to existing `tests/unit/` and `tests/integration/` directories.

## Complexity Tracking

> No violations detected. This section is intentionally empty.
