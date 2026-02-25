# Implementation Plan: Gameplay Variety & Polish

**Branch**: `008-gameplay-variety` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-gameplay-variety/spec.md`

## Summary

Add six gameplay enhancements: (1) dynamically vary the pin layout (5–9 rows, 4–6 pins/row) at each round so no two rounds look the same; (2) detect stuck pucks and auto-shove them with a downward impulse before the existing stall-timeout fallback; (3) play a synthesized coin sound on every bucket landing; (4) render bucket widths proportional to score values so the center jackpot bucket is visually wider; (5) persist player names in localStorage for pre-filling the registration form; (6) show a "Did you know?" shove-guidance popup if no one shoves during Round 1.

## Technical Context

**Language/Version**: TypeScript (strict mode), ES2022 target  
**Primary Dependencies**: Vite 7.x (bundler), Planck.js (physics), Web Audio API (synthesized SFX/music)  
**Storage**: Browser localStorage (player names only)  
**Testing**: Vitest (unit/integration), Playwright (E2E)  
**Target Platform**: Browser SPA (Canvas-based game surface, DOM overlays for UI)  
**Project Type**: Client-side SPA game  
**Performance Goals**: 60 fps on mid-range 2022 mobile devices, <1 MB gzipped bundle  
**Constraints**: All rendering on canvas; DOM permitted for UI overlays only; all audio synthesized (no asset files); offline-capable  
**Scale/Scope**: Modifications to ~8 existing files, 2–4 new modules (~400–600 LOC total), no new npm dependencies

### Key Existing Infrastructure

- **Board geometry** (`src/config/board-geometry.ts`): `computePinPositions(layout)` uses `layout.pinRows` and `layout.bucketCount` to generate staggered grid. Even rows have `bucketCount` pins, odd rows have `bucketCount - 1`. `computeBucketBoundaries(layout)` splits board width evenly among buckets.
- **Board builder** (`src/physics/board-builder.ts`): `build(config)` creates Planck.js world with pin bodies, walls, and bucket dividers from `computePinPositions`. Called via `sim.createWorld(config)`.
- **Physics simulation** (`src/physics/simulation.ts`): `createWorld(config)` rebuilds entire physics board. `step(timeScale?)` processes physics tick. Already has OOB detection, collision events, and settled-puck detection.
- **Bucket detector** (`src/physics/bucket-detector.ts`): Stall detection at two levels — bucket zone (0.5s low-velocity → settle) and anywhere on board (10s `stalledTimeoutMs` → force-assign to nearest bucket). No intermediate auto-shove attempt.
- **Config** (`src/config/game-config.ts`): Static `DEFAULT_BOARD_LAYOUT` with `pinRows: 6`, `bucketCount: 5`, `pinSpacing: 2.0`. `computePinPositions` derives everything from `BoardLayout`.
- **Main game loop** (`src/main.ts`): Pre-computes `pinRenderData` and `bucketRenderData` once at startup. `startNextTurn()` doesn't rebuild the board — only `handleGameEnd`/`startGame` call `sim.createWorld()`. Round transitions just call `startNextTurn()`.
- **Render state** (`src/types/contracts.ts`): `RenderState.pins` is `Array<{x, y, radius}>`, `RenderState.buckets` is `Array<{x, width, score}>`. Both are passed each frame from pre-computed data.
- **Audio manager** (`src/audio/audio-manager.ts`): Routes `SoundName` to synth functions in `synth-effects.ts`. Currently 8 sounds: `drop`, `pinHit`, `shove`, `bucketLand`, `winner`, `tick`, `timeout`, `jackpotBucket`.
- **Registration overlay** (`src/ui/registration.ts`): Creates inputs dynamically. No localStorage interaction. Start button enabled when ≥1 name filled.
- **Tutorial indicator** (`src/ui/tutorial-indicator.ts`): Session-scoped "shown" flag. Shows on first turn of first round of first game only. Teaches puck positioning, not shove mechanic.
- **State machine** (`src/core/state-machine.ts`): `evaluateRoundEnd()` returns `nextRound | winner | tieBreaker | coWinners`. `TurnManager.isRoundComplete()` tracks round boundaries. No hook for "end of round" events.
- **Turn manager** (`src/core/turn-manager.ts`): Cycles through players, tracks `currentRound`. `advanceTurn()` sets `roundJustCompleted` flag when all players have played.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Impact | Status |
|-----------|--------|--------|
| **I. Browser-Only, Zero Backend** | All changes are client-side: pin layout randomization in-memory, localStorage for names only, no server calls. No network-dependent gameplay. | **PASS** |
| **II. Physics Realism** | Pin layout changes feed into `computePinPositions` → `BoardBuilder.build()` → Planck.js world. Physics engine remains the sole simulation. Auto-shove uses `body.applyLinearImpulse()` — standard Planck.js API, not hand-rolled physics. | **PASS** |
| **III. Cross-Device Responsive Play** | Proportional bucket widths and dynamic pin grids scale through existing world→canvas coordinate transform. "Did you know?" popup uses DOM overlay with ≥44px touch targets. No new layout concerns. | **PASS** |
| **IV. All-Ages Fun & Accessibility** | Coin sound adds positive feedback. Proportional buckets improve visual clarity. Shove guidance helps new players learn. All content age-appropriate. Contrast maintained. | **PASS** |
| **V. Test-First for Game Logic** | Layout randomization, auto-shove detection, bucket width calculation, and name persistence are all game/logic code → unit tests required. Coin sound synthesis and popup rendering are visual/audio → manual test scenarios documented. | **PASS** |
| **Technology: TypeScript strict** | All new code in TypeScript strict mode. No `any` types. | **PASS** |
| **Technology: Canvas rendering** | Proportional buckets rendered on canvas. Popup uses DOM overlay (permitted for UI). | **PASS** |
| **Technology: No native deps** | No new dependencies. All synth via Web Audio API. localStorage is browser-native. | **PASS** |
| **Technology: Bundle <1 MB** | No new libraries. ~400–600 LOC addition. Well under budget. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/008-gameplay-variety/
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
├── audio/
│   ├── audio-manager.ts       # Add 'coin' to SoundName routing
│   └── synth-effects.ts       # Add playCoin() synth function
├── config/
│   ├── board-geometry.ts      # computeProportionalBucketBoundaries()
│   └── game-config.ts         # Add autoShove config params
├── core/
│   └── state-machine.ts       # (minor) expose round-boundary signals
├── physics/
│   ├── bucket-detector.ts     # Add auto-shove impulse before stall fallback
│   └── simulation.ts          # Expose applyNudge / auto-shove API
├── rendering/
│   └── renderer.ts            # Use proportional bucket widths
├── types/
│   ├── contracts.ts           # Add 'coin' to SoundName, AutoShoveConfig
│   └── index.ts               # Add AutoShoveConfig interface
├── ui/
│   ├── registration.ts        # localStorage save/load for names
│   └── shove-guidance.ts      # NEW — "Did you know?" popup
└── main.ts                    # Round-transition board rebuild, shove tracking, guidance trigger

tests/
├── unit/
│   ├── config/
│   │   └── board-geometry.test.ts  # Proportional buckets, layout range validation
│   ├── physics/
│   │   └── bucket-detector.test.ts # Auto-shove impulse logic
│   └── ui/
│       └── registration.test.ts    # localStorage persistence
└── integration/
    └── game-session.test.ts        # Round layout changes, end-to-end auto-shove
```

**Structure Decision**: Single project structure (existing). No new directories; new files only in `src/ui/` (shove-guidance popup). All other changes modify existing modules.
