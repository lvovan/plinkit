# Implementation Plan: Microsoft Clarity Telemetry

**Branch**: `006-clarity-telemetry` | **Date**: 2025-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-clarity-telemetry/spec.md`

## Summary

Integrate Microsoft Clarity's telemetry SDK into the Plinkit SPA to capture session recordings, heatmaps, and engagement metrics. The integration uses cookieless mode, reads the Clarity project ID from `VITE_CLARITY_PROJECT_ID` at build time, and enriches sessions with custom game event tags (game_start, turn_complete, game_end, replay, new_session). The implementation must be fully resilient — no game degradation if Clarity is blocked or unavailable.

## Technical Context

**Language/Version**: TypeScript (strict mode), ES2022 target  
**Primary Dependencies**: Vite 7.x (bundler), Planck.js (physics), Microsoft Clarity JS SDK (new)  
**Storage**: N/A — all telemetry is sent to Clarity's cloud; no local persistence  
**Testing**: Vitest (unit/integration), Playwright (E2E)  
**Target Platform**: Browser SPA (latest 2 versions of Chrome, Safari, Firefox, Edge)  
**Project Type**: Client-side SPA game (Canvas-based rendering, DOM overlays)  
**Performance Goals**: 60 fps gameplay, <200ms additional startup latency from Clarity  
**Constraints**: Cookieless mode required; no backend; offline-capable (Clarity is non-critical); total bundle <1 MB gzipped  
**Scale/Scope**: Single new module (~100-150 LOC), integration points in main.ts game flow  
**Env Config**: Vite reads `.env` from root by default; CI writes to `./src/.env` — Vite config needs `envDir: 'src'` or CI adjustment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Impact | Status |
|-----------|--------|--------|
| **I. Browser-Only, Zero Backend** | Clarity SDK runs entirely client-side. Beacon data is sent to Clarity's CDN — this is not "dynamic server interaction" for gameplay. Game state stays browser-only. Asset loading from a static host is explicitly permitted. | **PASS** |
| **II. Physics Realism** | No impact. Telemetry module does not touch physics simulation. | **PASS** |
| **III. Cross-Device Responsive Play** | No impact. Clarity SDK is device-agnostic and does not modify UI layout or touch targets. | **PASS** |
| **IV. All-Ages Fun & Accessibility** | No impact. Clarity is invisible to users. No UI changes. No content changes. | **PASS** |
| **V. Test-First for Game Logic** | Clarity module is not game logic (no physics, scoring, or state). It is analogous to rendering/audio (exempt from TDD per constitution). Unit tests will verify the telemetry wrapper's guard logic (missing project ID, blocked SDK). | **PASS** |
| **Technology: TypeScript strict** | New module will be TypeScript strict. Type declarations for Clarity API needed. | **PASS** |
| **Technology: Bundle <1 MB** | Clarity SDK is ~6 KB gzipped. Well within budget. | **PASS** |
| **Technology: Offline capable** | Clarity is non-critical. If blocked/offline, the game works normally. Clarity's own script handles offline gracefully. | **PASS** |

**Gate result: ALL PASS** — no violations, no justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-clarity-telemetry/
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
├── telemetry/
│   └── clarity.ts       # NEW — Clarity SDK wrapper (init, event helpers, guard logic)
├── main.ts              # MODIFIED — import and wire telemetry at game lifecycle points
├── types/
│   └── clarity.d.ts     # NEW — Type declarations for Clarity global API
└── ...                  # Existing modules unchanged

tests/
└── unit/
    └── telemetry/
        └── clarity.test.ts  # NEW — Unit tests for guard logic, event dispatch
```

**Structure Decision**: Single new `src/telemetry/` module following the existing pattern (audio/, rendering/, input/ are all peer directories). A thin wrapper isolates all Clarity SDK calls behind a typed interface, making it easy to mock in tests and swap if needed.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
