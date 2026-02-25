# Implementation Plan: Persistent Puck Growth & Board Standardization

**Branch**: `010-persistent-puck-growth` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-persistent-puck-growth/spec.md`

## Summary

Fix the board to 8 staggered pin rows with no randomization, move the shove-zone boundary to row 6, make all pucks persist across turns and rounds, reset the bounce multiplier each turn, and implement same-player puck growth on contact (20% surface area per event, capped at ~1.59× base, with pop animation/SFX and chain-reaction support). Scoring is revocable — pucks knocked out of buckets lose their score (clamped ≥ 0) with negative-score UI feedback.

## Technical Context

**Language/Version**: TypeScript (strict mode), ES2022 target  
**Primary Dependencies**: Planck.js (Box2D physics), Web Audio API (synth SFX), Vite (bundler)  
**Storage**: N/A (all state in browser runtime; no localStorage needed for this feature)  
**Testing**: Vitest (unit/integration), Playwright (E2E)  
**Target Platform**: Browser SPA — latest 2 versions of Chrome, Safari, Firefox, Edge  
**Project Type**: Browser game (client-side SPA, canvas-rendered)  
**Performance Goals**: 60 fps on mid-range mobile (2022-era), max 20 persistent pucks in a 4-player 5-round game  
**Constraints**: <1 MB gzipped bundle, offline-capable after first load, no server calls  
**Scale/Scope**: Up to 4 players, 5 rounds, 20 pucks max on board simultaneously

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Browser-Only, Zero Backend | **PASS** | All changes are client-side. No network calls, no server logic. |
| II. Physics Realism | **PASS** | Uses Planck.js for puck bodies, growth via fixture replacement, chain reactions resolved by the physics engine. Puck radius cap derived from pin geometry ensures physical consistency. |
| III. Cross-Device Responsive Play | **PASS** | No new input patterns. Shove zone boundary rendering uses existing responsive coordinate transform. Growth animation is visual-only (no new touch targets). |
| IV. All-Ages Fun & Accessibility | **PASS** | Pop animation + sound provides multi-modal feedback. Negative score flash uses red color which already meets 4.5:1 contrast in existing palette. No text-heavy UI added. |
| V. Test-First for Game Logic | **PASS** | Growth logic, multiplier reset, revocable scoring, and size cap are all pure game logic requiring unit tests before implementation. Visual effects exempt per constitution. |
| Technology: TypeScript strict | **PASS** | All new types and logic in strict TypeScript. |
| Technology: Canvas rendering | **PASS** | Puck growth animation rendered on existing canvas pipeline. |
| Technology: Proven physics lib | **PASS** | Planck.js — growth implemented via `destroyFixture` / `createFixture` with new radius. |
| Technology: Bundle <1 MB | **PASS** | No new dependencies. Growth logic is ~200 lines. |
| Technology: Offline capable | **PASS** | No network requirements. |

**Gate result: PASS** — No violations. Proceed to Phase 0.

### Post-Design Re-Evaluation (after Phase 1)

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Browser-Only, Zero Backend | **PASS** | All design artifacts (puck-growth.ts, revocable scoring, growth config) purely client-side. No network calls. |
| II. Physics Realism | **PASS** | Fixture destroy+recreate is engine-sanctioned. Chain reactions resolved via world steps. Radius cap from pin geometry ensures physical plausibility. |
| III. Cross-Device Responsive Play | **PASS** | Fixed 8-row board simplifies layout. No new input mechanisms. Existing canvas coordinate transform used. |
| IV. All-Ages Fun & Accessibility | **PASS** | Pop animation is playful; negative score flash is brief/informative. No mature content. Contrast maintained. |
| V. Test-First for Game Logic | **PASS** | Quickstart mandates tests-first for every step. 4 new test files planned. Visual effects exempt per constitution. |
| Technology: TypeScript strict | **PASS** | All new types fully typed, no `any`. |
| Technology: Canvas rendering | **PASS** | Growth pop via existing canvas pipeline. |
| Technology: Proven physics lib | **PASS** | Planck.js only. No hand-rolled physics. |
| Technology: Bundle <1 MB | **PASS** | Zero new dependencies. ~200 lines of growth logic. |
| Technology: Offline capable | **PASS** | No network requirements added. |
| Dev: Performance budget | **PASS** | Max 20 pucks, chain depth cap 10, growth queue outside world.step(). 60fps maintained. |

**Post-design gate result: PASS** — No violations introduced during detailed design.

## Project Structure

### Documentation (this feature)

```text
specs/010-persistent-puck-growth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── internal-modules.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── audio/
│   ├── audio-manager.ts     # Route new 'puckGrowth' sound
│   └── synth-effects.ts     # Add playPuckGrowth() synth
├── config/
│   ├── board-geometry.ts    # Remove randomization; fixed 8-row computations
│   └── game-config.ts       # Fix pinRows=8, shoveZoneRowLimit=6, add growth config
├── core/
│   ├── scoring.ts           # Revocable scoring: subtract on bucket exit, clamp ≥ 0
│   ├── turn-manager.ts      # (no changes expected)
│   └── state-machine.ts     # (no changes expected)
├── physics/
│   ├── board-builder.ts     # PuckBody: add ownerPlayerId tracking, surfaceArea field
│   ├── bucket-detector.ts   # Track bucket occupancy; detect bucket exit events
│   ├── simulation.ts        # Growth detection in contact listener; fixture resize; chain cap
│   └── puck-growth.ts       # NEW — growth logic: detect, resize, chain, cap
├── rendering/
│   ├── effects.ts           # Add GrowthPopEffect, NegativeScoreFlash
│   └── renderer.ts          # Render pucks at dynamic radii; growth animations
├── types/
│   ├── index.ts             # Add GrowthConfig, extend PuckBody, RuntimePuck
│   └── contracts.ts         # Add 'puckGrowth' to SoundName; extend RenderState
├── ui/
│   └── (no changes expected)
└── main.ts                  # Remove randomizeLayout(); wire growth events; multiplier reset

tests/
├── unit/
│   ├── puck-growth.test.ts           # NEW — growth logic, cap, chain depth
│   ├── scoring-revocable.test.ts     # NEW — revocable scoring, clamp ≥ 0
│   └── multiplier-reset.test.ts      # NEW — per-turn reset verification
└── integration/
    └── persistent-pucks.test.ts      # NEW — pucks survive round transitions
```

**Structure Decision**: Single project (existing), no new directories beyond `src/physics/puck-growth.ts`. All modifications fit existing module boundaries.
