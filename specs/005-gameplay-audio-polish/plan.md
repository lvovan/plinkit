# Implementation Plan: Gameplay Audio Polish

**Branch**: `005-gameplay-audio-polish` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-gameplay-audio-polish/spec.md`

## Summary

Four interrelated changes: (1) remove the per-turn shove count limit making shoves unlimited, (2) ensure all pucks have a visible non-solid pattern so rotation is perceivable, (3) add programmatically synthesized sound effects via Tone.js for game events (drop, pin hit, shove, bucket land), and (4) add two-track looping background music (calm lobby + upbeat carnival gameplay) with independent music/SFX mute toggles. All audio is generated at runtime — no pre-recorded files needed.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict mode)
**Primary Dependencies**: Planck.js ^1.4.3 (physics), Vite 7.3.1 (bundler) — no new runtime dependencies (raw Web Audio API for synthesis)
**Storage**: N/A — all state in browser runtime
**Testing**: Vitest 4.0.18 (unit/integration), Playwright 1.58.2 (E2E)
**Target Platform**: Browser SPA — Chrome, Safari, Firefox, Edge (latest 2 versions)
**Project Type**: Browser game (client-side SPA)
**Performance Goals**: 60 fps on mid-range mobile (2022-era budget phones)
**Constraints**: Offline-capable after first load, no backend, bundle <1 MB gzipped
**Scale/Scope**: 2–4 player local multiplayer, single screen/device

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Browser-Only, Zero Backend | ✅ PASS | All changes are client-side. Tone.js runs entirely in-browser. No network calls. |
| II | Physics Realism | ✅ PASS | Physics unchanged. Shove zone/force caps preserved. Only the count limit is removed. |
| III | Cross-Device Responsive Play | ✅ PASS | Two mute toggle buttons must be touch-friendly (≥44×44 CSS px). No layout changes otherwise. |
| IV | All-Ages Fun & Accessibility | ✅ PASS | Patterns aid visual differentiation. Mute toggles use icons (no text reading required). Music/SFX are additive polish. |
| V | Test-First for Game Logic | ✅ PASS | Unlimited shove logic and pattern assignment are testable game logic → TDD required. Audio synthesis is rendering-adjacent → manual test scenarios. |
| — | Bundle Size (<1 MB gzipped) | ✅ PASS | No new dependencies. Custom Web Audio wrapper adds ~2-5 KB. No impact on bundle budget. |
| — | Offline Capable | ✅ PASS | Tone.js is bundled, no runtime network calls. Service worker caches the bundle. |
| — | Asset Pipeline | ✅ PASS | No binary audio files. All audio synthesized at runtime from code. |

**Gate Result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-gameplay-audio-polish/
├── plan.md              # This file
├── research.md          # Phase 0: Tone.js integration, synthesis patterns
├── data-model.md        # Phase 1: Updated types and config entities
├── quickstart.md        # Phase 1: Developer onboarding for this feature
├── contracts/
│   └── internal-modules.md  # Phase 1: Module interfaces
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── audio/
│   ├── audio-manager.ts     # MODIFY: replace sprite-sheet playback with Web Audio synthesis, add SFX/music buses
│   ├── sprite-map.ts        # REMOVE: no longer needed (no sprite sheets)
│   ├── synth-effects.ts     # NEW: SFX factory functions using native OscillatorNode/GainNode
│   └── music-manager.ts     # NEW: step-sequencer for two procedural music tracks, crossfade
├── config/
│   └── game-config.ts       # MODIFY: remove maxShovesPerTurn, add audio/music config
├── core/
│   ├── player.ts            # INSPECT: pattern assignment may move here or stay in registration
│   └── state-machine.ts     # INSPECT: music transitions keyed to phase changes
├── rendering/
│   └── renderer.ts          # MODIFY: remove 'solid' pattern fallback path
├── types/
│   ├── index.ts             # MODIFY: update PuckStyle, remove 'solid' from PuckPattern union
│   └── contracts.ts         # MODIFY: update AudioManager interface, add MusicManager interface
├── ui/
│   ├── shove-counter.ts     # REMOVE: entire file (shove counter no longer exists)
│   ├── overlay-manager.ts   # MODIFY: remove shove counter integration, add music/SFX toggle buttons
│   └── registration.ts      # MODIFY: enforce non-solid pattern assignment (round-robin)
└── main.ts                  # MODIFY: remove shovesUsed tracking, wire music manager, wire new audio

tests/
├── unit/
│   ├── core/
│   │   └── shove-unlimited.test.ts  # NEW: verify unlimited shoves
│   ├── audio/
│   │   ├── synth-effects.test.ts    # NEW: verify synth definitions
│   │   └── music-manager.test.ts    # NEW: verify music state transitions
│   └── rendering/
│       └── pattern-assignment.test.ts # NEW: verify round-robin, no solid
└── integration/
    └── game-session.test.ts         # MODIFY: update for unlimited shoves
```

**Structure Decision**: Follows existing single-project layout. New files are added within the existing `src/audio/` and `tests/` directories. The `sprite-map.ts` and `shove-counter.ts` files are removed.

## Complexity Tracking

No constitution violations to justify. Bundle size monitoring is a caution, not a violation.
