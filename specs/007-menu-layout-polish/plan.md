# Implementation Plan: Menu System & Layout Polish

**Branch**: `007-menu-layout-polish` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-menu-layout-polish/spec.md`

## Summary

Polish the game's UI, visual effects, and audio experience across eight areas: (1) sort the scoreboard by rank with animated transitions, (2) unify all in-game HUD elements (toggle buttons, turn indicator, countdown timer, scoreboard) into a single upper-left panel component that never overlaps the playfield, (3) add copyright subtitle to the welcome overlay, (4) fix collision multiplier popup format to "×N.N", (5) add a slow-motion effect when the puck crosses the shove line with synchronized physics/music/SFX slowdown, (6) render a procedurally generated countryside background with subtle animation and a toggle button, (7) show a first-round tutorial indicator with device-aware icon (hand or mouse) that auto-dismisses on interaction, and (8) play a special victory/jackpot sound effect when a puck lands in the center (highest-scoring) bucket.

## Technical Context

**Language/Version**: TypeScript (strict mode), ES2022 target  
**Primary Dependencies**: Vite 7.x (bundler), Planck.js (physics), Web Audio API (synthesized SFX/music)  
**Storage**: N/A — no persistent state  
**Testing**: Vitest (unit/integration), Playwright (E2E)  
**Target Platform**: Browser SPA (Canvas-based game surface, DOM overlays for HUD)  
**Project Type**: Client-side SPA game  
**Performance Goals**: 60 fps on mid-range 2022 mobile devices, <1 MB gzipped bundle  
**Constraints**: All rendering on canvas; DOM permitted for UI overlays only; all audio synthesized (no asset files); offline-capable  
**Scale/Scope**: Modifications to ~8 existing files, 1–2 new modules (~300–500 LOC total), no new npm dependencies

### Key Existing Infrastructure

- **Unified Game HUD** (`src/ui/game-hud.ts`): Single upper-left panel containing toggle buttons row, turn indicator + timer, and scoreboard. Class `.game-hud` at `top:8px; left:8px; z-index:60`, vertical flex layout. Toggle buttons in `.hud-toggle-row`, scoreboard in `.scoreboard` section. All gameplay HUD in one component.
- **Overlay manager** (`src/ui/overlay-manager.ts`): Delegates toggle, timer, and scoreboard operations to `GameHUD`. Manages registration + results overlays independently.
- **Turn indicator** (within `GameHUD`): Player name + color swatch + countdown timer section, positioned between toggles and scoreboard within the unified panel.
- **Registration overlay** (`src/ui/registration.ts`): Flex-centered panel with inline styles. No subtitle/copyright element. Panel children: `<h1>`, `<h2>`, `.player-inputs`, `.reg-controls`
- **Collision flash** (`src/rendering/effects.ts`): `addCollisionFlash(x, y, multiplierText)` — receives pre-formatted text string. Gold text over radial gradient, 250ms linear fade
- **formatMultiplier** (`src/main.ts`): Returns `"N.N×"` (e.g., `"1.2×"`) — trailing `×`
- **Physics simulation** (`src/physics/simulation.ts`): `step()` calls `world.step(fixedTimestep)` with constant `1/60`. No timeScale concept. `shoveZoneY` stored on `Board` object
- **Music manager** (`src/audio/music-manager.ts`): OscillatorNode-based synthesis. `readonly` beat durations. No `playbackRate` — oscillators use frequency, not buffers. Tempo adjustable by modifying beat duration
- **Audio manager** (`src/audio/audio-manager.ts`): `play(name, options?)` routes to synth functions. All SFX are OscillatorNode-based. Pitch variation via frequency offset, not playbackRate
- **Renderer** (`src/rendering/renderer.ts`): `drawFrame()` pipeline: clear → board fill → shove line → pins → buckets → ghost → pucks → particles → effects. Background layer would go between clear and board fill
- **Game loop** (`src/core/game-loop.ts`): Fixed timestep accumulator (1/60s). `onStep()` for physics, `onRender(alpha)` for drawing. Max 4 steps/frame
- **Effects system** (`src/rendering/effects.ts`): All animations use linear interpolation. No easing functions. Durations hardcoded (250ms flash, 400ms slash, 1800ms score pop, etc.)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Impact | Status |
|-----------|--------|--------|
| **I. Browser-Only, Zero Backend** | All changes are client-side: DOM manipulation, canvas rendering, Web Audio API. No server calls, no data persistence. Procedural background generated on canvas, no asset CDN. | **PASS** |
| **II. Physics Realism** | Slow-motion modifies the effective timestep temporarily. Physics engine (Planck.js) still used for all simulation — no hand-rolled physics. Gravity/collision behavior unchanged, only step frequency affected. This preserves determinism within each slow-motion window. | **PASS** |
| **III. Cross-Device Responsive Play** | Sound controls repositioned to avoid overlap on all viewports. Background scales to canvas size. Scoreboard animation uses CSS transitions (hardware accelerated). Copyright subtitle responsive. All touch targets remain ≥44px. | **PASS** |
| **IV. All-Ages Fun & Accessibility** | No content changes. Multiplier format is more readable ("×3.5" vs "3.5×"). Scoreboard ranking aids comprehension. Background subtle and non-distracting. No text-reading required for gameplay. Contrast ratios maintained. | **PASS** |
| **V. Test-First for Game Logic** | Scoreboard sorting is game logic → needs unit tests. Slow-motion state transitions → needs unit tests. Multiplier formatting → needs unit test. Visual/rendering changes (background, animations, CSS) exempt from TDD per constitution — manual scenarios documented. | **PASS** |
| **Technology: TypeScript strict** | All new code in TypeScript strict mode. No `any` types. | **PASS** |
| **Technology: Canvas rendering** | Procedural background rendered on canvas. DOM only for UI overlays (scoreboard, toggles, registration). | **PASS** |
| **Technology: Bundle <1 MB** | No new dependencies. Procedural background is ~100–200 LOC. Total addition well under budget. | **PASS** |
| **Technology: Offline capable** | No new network calls. Procedural generation means no asset fetching. | **PASS** |

**Gate result: ALL PASS** — no violations, no justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-menu-layout-polish/
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
├── rendering/
│   ├── renderer.ts          # MODIFIED — integrate background layer into drawFrame()
│   ├── effects.ts           # MODIFIED — no format changes, receives corrected text
│   └── background.ts        # NEW — procedural countryside scene + animation
├── ui/
│   ├── game-hud.ts          # NEW — unified HUD panel (toggles + turn indicator + timer + scoreboard)
│   ├── overlay-manager.ts   # MODIFIED — delegates to GameHUD for all in-game HUD
│   ├── registration.ts      # MODIFIED — add copyright subtitle
│   └── tutorial-indicator.ts # NEW — first-round tutorial with device-aware icon + auto-dismiss
├── core/
│   ├── slow-motion.ts       # NEW — slow-motion state machine (timeScale, duration, easing)
│   └── game-loop.ts         # MODIFIED — apply timeScale to step accumulator
├── audio/
│   ├── music-manager.ts     # MODIFIED — tempo scaling API
│   ├── audio-manager.ts     # MODIFIED — SFX speed/pitch scaling API + jackpot bucket sound
│   └── synth-effects.ts     # MODIFIED — added playJackpotBucket synth function
├── physics/
│   └── simulation.ts        # MODIFIED — accept timeScale for step()
├── main.ts                  # MODIFIED — wire slow-motion, fix formatMultiplier, animation toggle, tutorial indicator
└── config/
    └── game-config.ts       # MODIFIED — add slow-motion config values

tests/
└── unit/
    ├── ui/
    │   └── scoreboard.test.ts  # NEW — sort order + stable tie-breaking
    ├── core/
    │   └── slow-motion.test.ts # NEW — state transitions, once-per-turn guard
    └── rendering/
        └── background.test.ts  # NEW — procedural generation config tests
```

**Structure Decision**: New modules follow existing peer-directory pattern. `slow-motion.ts` in `core/` alongside other game state modules. `background.ts` in `rendering/` alongside renderer and effects. Unit tests mirror source paths.

## Constitution Re-Check (Post-Design)

All principles re-verified after Phase 1 design:

| Principle | Post-Design Status |
|-----------|-------------------|
| I. Browser-Only | **PASS** — BackgroundManager uses offscreen canvas (no CDN/asset fetch). SlowMotionController is pure JS state. |
| II. Physics Realism | **PASS** — `world.step(fixedTimestep * timeScale)` still uses Planck.js at 60 Hz step rate. Collision quality improves with smaller dt. |
| III. Cross-Device | **PASS** — Audio toggles relocated to avoid overlap. Animation toggle follows 44×44px pattern. Background rebuilds on resize. |
| IV. All-Ages | **PASS** — No content changes. Pastoral countryside theme. Improved multiplier readability. |
| V. Test-First | **PASS** — Game logic (slow-motion state, scoreboard sort, formatMultiplier) has unit tests. Visual rendering has manual scenarios in quickstart.md. |
| Bundle <1 MB | **PASS** — ~300-500 LOC addition, no new npm dependencies. |
| Offline capable | **PASS** — Procedural generation, no runtime fetches. |

**Gate result: ALL PASS** — no new violations introduced by design.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
