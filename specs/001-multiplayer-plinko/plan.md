# Implementation Plan: Multi-Player Plinko Game

**Branch**: `001-multiplayer-plinko` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-multiplayer-plinko/spec.md`

## Summary

Build a browser-based, local multiplayer (2–4 players) Plinko game as a
client-side SPA with deterministic physics. Players take turns dropping
pucks onto a 12-row pin board with 9 scoring buckets, using up to 2
directional shoves per turn to influence trajectory. Pucks persist as
physics bodies across turns. The game runs on both mobile (portrait,
touch) and desktop (landscape, mouse) at 60 fps. TypeScript + Canvas/WebGL
rendering + a proven 2D physics engine (Matter.js, Planck.js, or Rapier).

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode (`strict: true`)
**Primary Dependencies**: Planck.js (2D physics, ~56 KB gzip), Raw Canvas 2D (rendering, 0 KB), Web Audio API (audio, built-in), Vite (build tooling)
**Storage**: N/A — all state in-memory, no persistence
**Testing**: Vitest (unit + integration), Playwright (E2E visual smoke tests)
**Target Platform**: Modern browsers (Chrome, Safari, Firefox, Edge — latest 2 versions), desktop + mobile
**Project Type**: SPA (browser game)
**Performance Goals**: 60 fps on 2022-era budget smartphone, <100 ms feedback latency, deterministic physics
**Constraints**: ≤1 MB gzipped initial bundle, offline-capable after first load (service worker), zero backend
**Scale/Scope**: 2–4 players, 5 rounds default, 12×9 board, up to ~80 persistent puck physics bodies (4 players × 5 rounds × 4 potential tie-breakers)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Browser-Only, Zero Backend | ✅ PASS | SPA, static deploy, no server calls, in-memory state |
| II | Physics Realism | ✅ PASS | Planck.js (Box2D port), fixed-timestep 1/60s, 8 vel / 3 pos iterations, config-driven |
| III | Cross-Device Responsive Play | ✅ PASS | Pointer Events API (unified touch+mouse), responsive Canvas, 44px targets, 60 fps |
| IV | All-Ages Fun & Accessibility | ✅ PASS | Visual affordances, shove-zone boundary line, WCAG AA contrast, all-ages content |
| V | Test-First for Game Logic | ✅ PASS | Vitest TDD for physics, scoring, state machine; Playwright for visual smoke tests |
| TC | Bundle ≤1 MB gzip | ✅ PASS | Estimated 191–311 KB gzip (Planck.js ~56 KB + app code ~35–75 KB + assets ~100–180 KB) |
| TC | Offline-capable | ✅ PASS | Service worker planned for static asset caching |

**Gate result: PASS** — all principles satisfied. Bundle estimate (191–311 KB) is well within the 1 MB limit.

### Post-Design Re-evaluation (Phase 1 complete)

All NEEDS RESEARCH items resolved. Bundle size WATCH upgraded to PASS after research
confirmed Planck.js at ~56 KB gzip and Raw Canvas 2D at 0 KB. No new constitution
concerns introduced by the data model (in-memory only), contracts (internal modules,
no server API), or technology choices. Design is fully compliant.

## Project Structure

### Documentation (this feature)

```text
specs/001-multiplayer-plinko/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A — no external API)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── config/              # Physics params, board layout, scoring config
├── core/                # Game state machine, turn logic, scoring engine
├── physics/             # Physics engine wrapper, deterministic simulation
├── input/               # Gesture recognition (flick/shove), touch + mouse
├── rendering/           # Canvas/WebGL board rendering, effects, animations
├── audio/               # Sound manager, audio sprite playback
├── ui/                  # DOM overlays: registration, scoreboard, timer, results
├── types/               # Shared TypeScript interfaces and type definitions
└── main.ts              # Entry point, app bootstrap

public/
├── assets/
│   ├── sprites/         # Puck textures, pin graphics, board art
│   └── audio/           # Sound effects (drop, collision, shove, landing, win)
├── index.html
└── sw.js                # Service worker for offline support

tests/
├── unit/                # Game logic, scoring, state machine, physics calcs
├── integration/         # Full game flow (registration → play → winner)
└── e2e/                 # Playwright visual smoke tests
```

**Structure Decision**: Single-project SPA. No backend or separate frontend
directory needed. All game code lives under `src/`, static assets under
`public/`, tests under `tests/`. The `src/` subdirectories separate concerns
by domain (physics, input, rendering, audio, core logic, UI overlays).

## Complexity Tracking

> No constitution violations — this section is empty.
