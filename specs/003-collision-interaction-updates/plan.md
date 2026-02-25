# Implementation Plan: Collision & Interaction Updates

**Branch**: `003-collision-interaction-updates` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-collision-interaction-updates/spec.md`

## Summary

Replace particle spray effects with precise radial flash collision cues (plus per-hit multiplier text), add bounce-based exponential scoring (1.15× per bounce, 10× cap), add pre-drop ghosted puck positioning helper, and add Fruit Ninja-style slash animation on shoves — all while retaining bucket-landing particles and proportional board shake on shoves. Performance target: 60fps on mid-range mobile.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode)
**Primary Dependencies**: Planck.js 1.4 (physics), Vite 7.3 (build), Vitest 4.0 (test), Playwright 1.58 (e2e)
**Storage**: N/A (browser-only, all state in runtime)
**Testing**: Vitest (unit + integration), Playwright (e2e)
**Target Platform**: Browser SPA — latest 2 versions of Chrome/Safari/Firefox/Edge, mobile-first
**Project Type**: Browser-based game (Canvas rendering, Planck.js physics)
**Performance Goals**: 60fps on mid-range mobile (2022-era budget phones)
**Constraints**: <1MB gzipped bundle, offline-capable after first load, no backend
**Scale/Scope**: Single-page game, 2-player local multiplayer, ~20 source modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Browser-Only, Zero Backend | PASS | Feature is purely client-side: visual effects, scoring logic, input handling — no network calls |
| II | Physics Realism | PASS | No physics engine changes; feature reads existing collision events and adds visual/scoring layers on top |
| III | Cross-Device Responsive Play | PASS | FR-021 requires 60fps on mid-range mobile; visual helper uses same pointer events as existing input; touch targets unchanged |
| IV | All-Ages Fun & Accessibility | PASS | Radial flash + multiplier text provide clear visual feedback; slash animation is age-appropriate; WCAG 4.5:1 contrast required for multiplier text |
| V | Test-First for Game Logic | PASS | Scoring (bounce multiplier, cap) and bounce counting are pure game logic → must have unit tests before implementation. Visual effects (flash, slash, ghost puck) are rendering → exempt from TDD but need manual test scenarios |

**Gate result**: PASS — no violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/003-collision-interaction-updates/
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
│   ├── audio-manager.ts      # MODIFY: extend bounce sound to puckHit/wallHit collisions
│   └── sprite-map.ts
├── config/
│   ├── board-geometry.ts
│   └── game-config.ts        # MODIFY: add scoring multiplier config (rate, cap)
├── core/
│   ├── game-loop.ts
│   ├── player.ts
│   ├── scoring.ts             # MODIFY: add bounce multiplier calculation
│   ├── state-machine.ts
│   ├── turn-manager.ts
│   ├── turn-timer.ts
│   └── visibility.ts
├── input/
│   ├── flick-detector.ts
│   └── input-manager.ts
├── physics/
│   ├── board-builder.ts
│   ├── bucket-detector.ts
│   └── simulation.ts         # READ: collision events (no changes needed)
├── rendering/
│   ├── canvas-setup.ts
│   ├── effects.ts             # MODIFY: add radial flash, multiplier text, slash effect, score breakdown
│   ├── layout.ts
│   ├── particles.ts           # MODIFY/REMOVE: strip collision/shove particles, keep bucket-landing
│   └── renderer.ts            # MODIFY: render ghost puck, wire up flash/slash/breakdown rendering
├── types/
│   ├── contracts.ts
│   └── index.ts               # MODIFY: add BounceCounter, SlashEffect, DropIndicator types
├── ui/
│   ├── overlay-manager.ts
│   ├── registration.ts
│   ├── results.ts
│   ├── scoreboard.ts
│   ├── shove-counter.ts
│   ├── timer.ts
│   └── turn-indicator.ts
└── main.ts                    # MODIFY: wire collision→flash/sound, integrate bounce counter, ghost puck, slash

tests/
├── unit/
│   ├── core/
│   │   └── scoring.test.ts    # MODIFY: add bounce multiplier tests
│   ├── physics/
│   │   └── (existing tests)
│   └── rendering/
│       └── effects.test.ts    # NEW: test radial flash lifecycle, slash lifecycle
├── integration/
│   └── game-session.test.ts   # MODIFY: add bounce-scoring integration test
└── e2e/
    └── game-smoke.test.ts
```

**Structure Decision**: No new directories needed. All changes fit within the existing module structure. New types go in `types/index.ts`, new visual effects go in `effects.ts`, scoring changes go in `scoring.ts`, and wiring occurs in `main.ts`.


## Complexity Tracking

> No constitution violations detected. No complexity justifications needed.

## Constitution Re-Check (Post-Design)

*Re-evaluated after Phase 1 design completion.*

| # | Principle | Status | Post-Design Notes |
|---|-----------|--------|-------------------|
| I | Browser-Only, Zero Backend | PASS | All new code is client-side Canvas/Web Audio. No network calls. No new dependencies added. |
| II | Physics Realism | PASS | Physics engine untouched. Feature reads existing collision events — no physics behavior changes. |
| III | Cross-Device Responsive Play | PASS | Ghost puck uses same pointer events. Effects render via existing `worldToCanvas` transform → responsive. FR-021 enforces 60fps. |
| IV | All-Ages Fun & Accessibility | PASS | Multiplier text requires 4.5:1 contrast (gold on dark bg meets this). Slash is age-appropriate. No violence. |
| V | Test-First for Game Logic | PASS | `calculateRoundScore()` pure logic → TDD required. Effect lifecycle → unit testable. Visual rendering → exempt, manual scenarios in quickstart. |

**Post-design gate result**: PASS — no violations.
