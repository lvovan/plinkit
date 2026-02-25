# Implementation Plan: Puck Rotation & Friction Physics

**Branch**: `004-puck-rotation-friction` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-puck-rotation-friction/spec.md`

## Summary

Enable puck rotation physics by removing the `fixedRotation: true` constraint on puck bodies,
increasing friction values on pins and pucks, adding angular damping and angular velocity cap
configuration, propagating the puck angle through the snapshot → render state pipeline, and
applying Canvas 2D rotation transforms to puck pattern rendering. Shoves are modified to apply
force slightly off-center to impart spin. This is an enhancement to the existing physics,
rendering, and configuration modules — no new modules or external dependencies are required.

## Technical Context

**Language/Version**: TypeScript 5.9, strict mode (`strict: true`, `no-explicit-any: error`)
**Primary Dependencies**: Planck.js 1.4 (2D physics), Canvas 2D (rendering), Vite 7.3 (build), Web Audio API (audio)
**Storage**: N/A — all state in-memory
**Testing**: Vitest 4.0 (unit + integration), Playwright (E2E)
**Target Platform**: Modern browsers (Chrome, Safari, Firefox, Edge — latest 2 versions), desktop + mobile
**Project Type**: SPA (browser game)
**Performance Goals**: 60 fps on 2022-era budget phone, deterministic fixed-timestep physics
**Constraints**: ≤1 MB gzipped bundle, offline-capable, zero backend
**Scale/Scope**: Enhancement feature — touches ~6 existing files, 0 new source modules, ~3 new config fields

### Key Implementation Points

- **`simulation.ts` line 62**: `fixedRotation: true` → change to `false`, add `angularDamping` to body definition
- **`simulation.ts` line 113**: `applyLinearImpulse` at `getWorldCenter()` → offset application point for shove spin
- **`types/index.ts` PhysicsConfig**: Add `angularDamping`, `maxAngularVelocity` fields
- **`types/contracts.ts` RenderState.pucks**: Add `angle: number` field
- **`main.ts` line 339**: Snapshot-to-RenderState mapping must pass `p.angle`
- **`renderer.ts` line 300**: `drawPuckPattern()` needs `ctx.translate(cx, cy) + ctx.rotate(angle)` transform
- **`game-config.ts`**: Increase default `puckFriction` (0.1→0.4), `pinFriction` (0.05→0.3), add `angularDamping: 2.0`, `maxAngularVelocity: 12.57`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Browser-Only, Zero Backend | ✅ PASS | No new network calls. Pure physics + rendering changes. |
| II | Physics Realism | ✅ PASS | Enables real rotation via Planck.js (Box2D). Friction-based torque is physics-engine native. Config-driven parameters. |
| III | Cross-Device Responsive Play | ✅ PASS | Canvas rotation is lightweight. No touch input changes. Performance impact negligible (removing `fixedRotation` constraint). |
| IV | All-Ages Fun & Accessibility | ✅ PASS | Rotation is visual enhancement only. No content changes. Patterns remain distinguishable. |
| V | Test-First for Game Logic | ✅ PASS | New rotation behavior requires unit tests (spin direction, damping, cap, determinism). Rendering rotation is visual — manual test scenarios documented. |
| TC | Bundle ≤1 MB gzip | ✅ PASS | No new dependencies. ~50 lines of code changes across existing files. |
| TC | Offline-capable | ✅ PASS | No change — still pure client-side. |

**Gate result: PASS** — all principles satisfied. No violations.

### Post-Design Re-evaluation (Phase 1 complete)

All research items resolved (see [research.md](research.md)). Design uses only existing
Planck.js capabilities (angularDamping, friction, fixedRotation flag) — no custom physics
or new dependencies. Bundle impact is negligible (~50 lines changed across 6 existing files).
Friction value changes from `puckFriction: 0.1→0.4` and `pinFriction: 0.05→0.3` are
config-driven and tunable. Test-first approach maintained — new rotation tests required
before implementation. No constitution concerns introduced by data model (field additions
only), contracts (behavior changes, no signature changes), or technology choices. Design
is fully compliant.

## Project Structure

### Documentation (this feature)

```text
specs/004-puck-rotation-friction/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (files modified by this feature)

```text
src/
├── config/
│   └── game-config.ts          # New defaults: angularDamping, maxAngularVelocity, friction values
├── types/
│   ├── index.ts                # PhysicsConfig extended with angularDamping, maxAngularVelocity
│   └── contracts.ts            # RenderState.pucks adds angle field
├── physics/
│   └── simulation.ts           # fixedRotation: false, angular damping, angular velocity cap, off-center shove
├── rendering/
│   └── renderer.ts             # Rotation transform in drawPuckPattern(), ghost puck angle=0
└── main.ts                     # Pass angle from snapshot to RenderState

tests/
├── unit/
│   └── physics/
│       ├── simulation.test.ts  # Rotation tests: spin direction, damping, cap, determinism
│       └── shove.test.ts       # Off-center shove spin test
└── integration/
    └── game-session.test.ts    # Angle field in render state
```

**Structure Decision**: No new source modules. This feature modifies existing files only, consistent with the established project structure.
