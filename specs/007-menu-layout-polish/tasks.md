# Tasks: Menu System & Layout Polish

**Input**: Design documents from `/specs/007-menu-layout-polish/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-modules.md, quickstart.md

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in all task descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and configuration that multiple user stories depend on

- [x] T001 Add `SlowMotionPhase` type, `SlowMotionConfig` interface, and `SlowMotionState` interface to `src/types/index.ts`
- [x] T002 Add `slowMotion: SlowMotionConfig` field to `GameConfig` interface in `src/types/index.ts`
- [x] T003 Add `SlowMotionConfig` default values to `src/config/game-config.ts` (targetScale: 0.3, enterDuration: 0.25, holdDuration: 1.5, exitDuration: 0.4)
- [x] T004 Add `timeScale?: number` to `play()` options in `AudioManager` interface and `setTimeScale(scale: number): void` to `MusicManager` interface in `src/types/contracts.ts`
- [x] T005 Add `initAnimationToggle()` and `updateAnimationToggleState()` methods to `UIOverlayManager` interface in `src/types/contracts.ts`

**Checkpoint**: All shared types and config ready — user story implementation can begin

---

## Phase 2: User Story 1 — Scoreboard Ranked Display (Priority: P1) 🎯 MVP

**Goal**: Scoreboard displays players sorted by score descending with smooth rank-change animations via CSS `transform: translateY()` transitions

**Independent Test**: Start a 3–4 player game, play several rounds. Verify scores always sorted highest-first and rank changes animate smoothly.

### Tests for User Story 1

- [x] T006 [US1] Write unit tests for scoreboard sort logic (descending order, stable tie-breaking, no-rank-change update) in `tests/unit/ui/scoreboard.test.ts`

### Implementation for User Story 1

- [x] T007 [US1] Refactor `Scoreboard` class to use persistent DOM elements keyed by player ID with `position: absolute` rows and `transform: translateY()` positioning, replacing innerHTML approach in `src/ui/scoreboard.ts`
- [x] T008 [US1] Implement sort-by-score-descending with stable tie-breaking (preserve previous relative order) in `updateScoreboard()` method in `src/ui/scoreboard.ts`
- [x] T009 [US1] Add CSS transitions for rank-change animation (`transition: transform 300ms ease; will-change: transform`) and fade-in for new rows in `src/ui/scoreboard.ts`
- [x] T010 [US1] Set container to `position: relative` with explicit height based on player count × `ROW_HEIGHT` in `src/ui/scoreboard.ts`

**Checkpoint**: Scoreboard sorts and animates — verify with quickstart.md US1 steps

---

## Phase 3: User Story 2 — Sound Controls Repositioned (Priority: P1) 🎯 MVP

**Goal**: Move audio toggle buttons from upper-right to upper-left to eliminate overlap with scoreboard

**Independent Test**: Load game on multiple screen sizes. Confirm sound buttons are upper-left, no overlap with scoreboard.

### Implementation for User Story 2

- [x] T011 [P] [US2] Update `.audio-toggles` CSS position from `right: 8px` to `left: 8px` in `public/styles.css`

**Checkpoint**: Sound controls repositioned — verify with quickstart.md US2 steps

---

## Phase 4: User Story 3 — Welcome Attribution (Priority: P2)

**Goal**: Add copyright subtitle "©️ Luc Vo Van, 2026 – Built with AI" at the bottom of the registration overlay

**Independent Test**: Open fresh app, verify copyright text at bottom of registration panel on mobile/desktop/ultra-wide.

### Implementation for User Story 3

- [x] T012 [P] [US3] Add copyright subtitle element anchored to the bottom of the registration panel in `src/ui/registration.ts` with responsive styling (centered, wraps on narrow viewports, never overflows)

**Checkpoint**: Attribution visible — verify with quickstart.md US3 steps

---

## Phase 5: User Story 4 — Collision Multiplier Format (Priority: P2)

**Goal**: Change multiplier popup format from trailing "N.N×" to prefix "×N.N"

**Independent Test**: Drop puck, observe collision popups display "×1.0", "×1.2", etc.

### Tests for User Story 4

- [x] T013 [P] [US4] Write unit test for `formatMultiplier()` verifying output format "×N.N" (prefix multiplication sign, no trailing characters) in `tests/unit/format-multiplier.test.ts`

### Implementation for User Story 4

- [x] T014 [US4] Change `formatMultiplier()` in `src/main.ts` from `` `${multiplier.toFixed(1)}×` `` to `` `×${multiplier.toFixed(1)}` ``

**Checkpoint**: Multiplier format correct — verify with quickstart.md US4 steps

---

## Phase 6: User Story 5 — Slow-Motion Effect (Priority: P3)

**Goal**: When the active puck crosses below the shove line, physics/music/SFX slow down briefly with smooth easing transitions. UI elements unaffected.

**Independent Test**: Drop puck, watch it cross shove line. Puck slows for ~2s, music/SFX pitch-drop, timer/scoreboard normal speed, smooth return.

### Tests for User Story 5

- [x] T015 [US5] Write unit tests for slow-motion state machine in `tests/unit/core/slow-motion.test.ts`: createSlowMotionState, triggerSlowMotion (once-per-turn guard, phase gate), updateSlowMotion (entering→slow→exiting→normal transitions, easing values, phaseElapsed tracking), resetSlowMotion

### Implementation for User Story 5

- [x] T016 [US5] Implement `createSlowMotionState()`, `triggerSlowMotion()`, `updateSlowMotion()`, `resetSlowMotion()` pure functions with `easeOutCubic`/`easeInCubic` easing in `src/core/slow-motion.ts`
- [x] T017 [US5] Add optional `timeScale` parameter to `step()` method in `src/physics/simulation.ts` — internally compute `world.step(fixedTimestep * (timeScale ?? 1.0))`
- [x] T018 [P] [US5] Add `timeScale` support to `play()` in `src/audio/audio-manager.ts` — pass `timeScale` option through to synth functions
- [x] T019 [P] [US5] Add `timeScale` parameter to all synth functions in `src/audio/synth-effects.ts` — stretch durations by `1/timeScale`, pitch-shift frequencies by `Math.pow(timeScale, 0.5)`
- [x] T020 [US5] Add `setTimeScale(scale: number)` method to `GameMusicManager` in `src/audio/music-manager.ts` — apply to scheduler beat interval (`beatDuration / timeScale`) and note generation (freq × `timeScale^0.5`, duration × `1/timeScale`)
- [x] T021 [US5] Wire slow-motion into game flow in `src/main.ts`: import slow-motion functions, call `updateSlowMotion()` in `onStep()`, pass `timeScale` to `sim.step()` / `audioManager.play()` / `musicManager.setTimeScale()`, trigger on puck crossing `shoveZoneY`, reset on turn start

**Checkpoint**: Slow-motion works end-to-end — verify with quickstart.md US5 steps

---

## Phase 7: User Story 6 — Countryside Background Art (Priority: P3)

**Goal**: Procedurally generated countryside background (sky gradient, hills, clouds, sun) rendered on offscreen canvases, composited into game canvas. Subtle cloud animation with toggle button.

**Independent Test**: Load game, verify background visible behind board, clouds drift, toggle button stops/starts animation.

### Implementation for User Story 6

- [x] T022 [US6] Implement `BackgroundManager` class in `src/rendering/background.ts` — offscreen canvas layers (sky gradient, far hills, near hills via sine-wave superposition, cloud ellipse clusters, sun glow), `init()`, `rebuild()`, `update(dt)`, `composite(ctx)`, `toggleAnimation()`, `isAnimationEnabled()`
- [x] T023 [US6] Integrate `BackgroundManager` into `CanvasRenderer` in `src/rendering/renderer.ts` — instantiate in `init()`, call `update(dt)` + `composite(ctx)` at start of `drawFrame()` before board fill, call `rebuild()` in `resize()`
- [x] T024 [US6] Implement animation toggle button in `src/ui/overlay-manager.ts` — create 44×44px button following audio toggle pattern, add to toggle wrapper in upper-left, wire `initAnimationToggle()` and `updateAnimationToggleState()`
- [x] T025 [US6] Wire animation toggle in `src/main.ts` — call `overlayManager.initAnimationToggle()` with callback that invokes `renderer.background.toggleAnimation()`, update toggle button state

**Checkpoint**: Background renders with animation and toggle — verify with quickstart.md US6 steps

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories

- [x] T026 [P] Run full unit test suite (`npm test`) and verify all tests pass including new scoreboard, slow-motion, and format tests
- [x] T027 [P] Run quickstart.md full verification flow across all 6 user stories
- [x] T028 Verify no UI overlap on 4 viewport widths (320px, 768px, 1440px, 3440px) — sound controls, scoreboard, animation toggle, timer, turn indicator

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1)** and **Phase 3 (US2)**: Depend on Phase 1. Can run in parallel with each other.
- **Phase 4 (US3)**: No dependency on Phase 1 — can run in parallel with Phases 2/3
- **Phase 5 (US4)**: No dependency on Phase 1 — can run in parallel with Phases 2/3/4
- **Phase 6 (US5)**: Depends on Phase 1 (types + config). Can run in parallel with US1/US2/US3/US4.
- **Phase 7 (US6)**: No dependency on Phase 1. Depends on US2 completion (audio toggles repositioned before adding animation toggle nearby). Can otherwise run in parallel.
- **Phase 8 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Scoreboard)**: Independent after Phase 1. Modifies `src/ui/scoreboard.ts` only.
- **US2 (Sound Controls)**: Fully independent. Modifies `public/styles.css` only.
- **US3 (Attribution)**: Fully independent. Modifies `src/ui/registration.ts` only.
- **US4 (Multiplier Format)**: Fully independent. Modifies `src/main.ts` (`formatMultiplier` only).
- **US5 (Slow-Motion)**: Depends on Phase 1 (types). Touches `src/core/slow-motion.ts` (new), `src/physics/simulation.ts`, `src/audio/audio-manager.ts`, `src/audio/synth-effects.ts`, `src/audio/music-manager.ts`, `src/main.ts`.
- **US6 (Background)**: Independent for rendering. Toggle button should be added after US2 repositions audio toggles. Touches `src/rendering/background.ts` (new), `src/rendering/renderer.ts`, `src/ui/overlay-manager.ts`, `src/main.ts`.

### Within Each User Story

- Tests written and failing BEFORE implementation (constitution principle V)
- Implementation tasks follow dependency order (models → services → integration)
- Story complete and independently testable before moving to next priority

### Parallel Opportunities

**Maximum parallelism after Phase 1 completes:**
- US1 (scoreboard.ts) + US2 (styles.css) + US3 (registration.ts) + US4 (main.ts formatMultiplier) — all touch different files
- US5 can run in parallel with US1/US2/US3 (different files except main.ts wiring at end)
- US6 rendering (background.ts, renderer.ts) can run in parallel with US1–US5

---

## Parallel Example: After Phase 1

```
# These can all start simultaneously (different files):
T011 [US2] Update .audio-toggles CSS in public/styles.css
T012 [US3] Add copyright subtitle in src/ui/registration.ts
T013 [US4] Write formatMultiplier test in tests/unit/format-multiplier.test.ts
T006 [US1] Write scoreboard sort tests in tests/unit/ui/scoreboard.test.ts
T015 [US5] Write slow-motion tests in tests/unit/core/slow-motion.test.ts
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (types + config)
2. Complete Phase 2: US1 — Scoreboard ranked display
3. Complete Phase 3: US2 — Sound controls repositioned
4. **STOP and VALIDATE**: Test US1 + US2 independently via quickstart.md
5. Deploy/demo — core UX improvements live

### Incremental Delivery

1. Setup → Types ready
2. US1 + US2 (P1) → Scoreboard + sound controls fixed → Deploy
3. US3 + US4 (P2) → Attribution + multiplier format → Deploy
4. US5 + US6 (P3) → Slow-motion + background art → Deploy
5. Polish → Full validation → Final deploy

### Notes

- [P] tasks = different files, no dependencies — safe to parallelize
- [US] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution requires tests for game logic (sort, slow-motion, format) — visual/rendering has manual verification via quickstart.md
- Commit after each task or logical group
- Total: 28 tasks across 8 phases
