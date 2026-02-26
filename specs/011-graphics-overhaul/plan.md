# Implementation Plan: Graphics Overhaul — Wood Theme & Visual Polish

**Branch**: `011-graphics-overhaul` | **Date**: 2026-02-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/011-graphics-overhaul/spec.md`

## Summary

Replace the flat navy board background with a procedural wood-grain pattern, upgrade bucket dividers from thin edge lines to thick wood-styled rectangular posts (with matching physics bodies), add 3D shading to pucks, reposition collision flash effects to use the actual contact point from Planck.js contact manifolds instead of puck centres, and redistribute bucket widths to equal 20% each.

## Technical Context

**Language/Version**: TypeScript 5.9.3, strict mode  
**Primary Dependencies**: Planck.js ^1.4.3 (physics), Vite 7.3 (build), Canvas 2D (rendering)  
**Storage**: N/A (browser-only, all state in runtime)  
**Testing**: Vitest 4.x (unit/integration), Playwright 1.58 (E2E), happy-dom (DOM mocking)  
**Target Platform**: Browser SPA — Chrome, Safari, Firefox, Edge (latest 2 versions)  
**Project Type**: Client-side browser game (SPA, static deploy)  
**Performance Goals**: 60 fps on mid-range 2022-era mobile devices  
**Constraints**: ≤1 MB gzipped bundle, offline-capable, no server dependencies  
**Scale/Scope**: Single-page Plinko game, ~30 source files, 4-player couch multiplayer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Compliance | Notes |
|---|-----------|-----------|-------|
| I | Browser-Only, Zero Backend | **PASS** | All changes are client-side Canvas 2D rendering and config. No network calls added. |
| II | Physics Realism | **PASS** | Divider physics bodies updated to match new visual width (Box shapes replacing Edge shapes). Contact point extraction uses existing Planck.js manifold API — no hand-rolled physics. |
| III | Cross-Device Responsive Play | **PASS** | Procedural wood pattern scales with world-to-canvas transform. No fixed-pixel assets. Touch targets unaffected. |
| IV | All-Ages Fun & Accessibility | **PASS** | Wood theme is all-ages appropriate. Peg contrast against wood background must be verified (WCAG AA 4.5:1). Player colours remain distinguishable with 3D shading. |
| V | Test-First for Game Logic | **PASS** | Bucket width redistribution and contact-point extraction are testable game logic. Visual rendering is exempt per constitution but manual test scenarios documented in spec. |
| — | Technology Constraints | **PASS** | Canvas 2D rendering (permitted). No new dependencies. Bundle size impact negligible (procedural generation, no image assets). |
| — | Performance Budget | **CAUTION** | Wood-grain pattern must be pre-rendered to offscreen canvas (not per-frame). 3D puck shading uses radial gradients (GPU-accelerated in Canvas 2D). Must validate 60 fps post-implementation. |

**Gate result: PASS** — No violations. Performance caution addressed in design (offscreen canvas caching).

## Project Structure

### Documentation (this feature)

```text
specs/011-graphics-overhaul/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── main.ts                      # Entry point — collision event wiring
├── config/
│   ├── game-config.ts           # ← MODIFY: bucket widths [0.20 × 5]
│   └── board-geometry.ts        # ← MODIFY: divider width constant
├── physics/
│   ├── board-builder.ts         # ← MODIFY: Box bodies for dividers
│   └── simulation.ts            # ← MODIFY: extract contact point from manifold
├── rendering/
│   ├── renderer.ts              # ← MODIFY: wood board, thick dividers, 3D pucks
│   ├── effects.ts               # ← MODIFY: use contact-point coords for flashes
│   ├── background.ts            # (unchanged — countryside behind board)
│   ├── wood-pattern.ts          # ← NEW: procedural wood-grain offscreen canvas
│   └── particles.ts             # (unchanged)
├── types/
│   ├── index.ts                 # ← MODIFY: CollisionEvent adds contactX/contactY
│   └── contracts.ts             # (unchanged)
└── ...

tests/
├── unit/
│   ├── physics/
│   │   └── contact-point.test.ts     # ← NEW: contact point extraction tests
│   ├── config/
│   │   └── bucket-widths.test.ts     # ← NEW: bucket width configuration tests
│   └── rendering/
│       └── wood-pattern.test.ts      # ← NEW: wood pattern generation smoke test
└── ...
```

**Structure Decision**: Existing single-project layout. One new file (`wood-pattern.ts`) encapsulates the procedural wood generation as a reusable offscreen canvas module. All other changes modify existing files.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
