# Tasks: Multi-Player Plinko Game

**Input**: Design documents from `/specs/001-multiplayer-plinko/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-modules.md, quickstart.md

**Tests**: Required by Constitution Principle V — all game logic, physics, scoring, and state management tests MUST be written before implementation (Red-Green-Refactor).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1–US7) — omitted for Setup, Foundational, and Polish phases
- All paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding — Vite + TypeScript + Planck.js + testing tools

- [x] T001 Create project directory structure per plan.md (src/config/, src/core/, src/physics/, src/input/, src/rendering/, src/audio/, src/ui/, src/types/, public/assets/sprites/, public/assets/audio/, tests/unit/, tests/integration/, tests/e2e/)
- [x] T002 Initialize Vite TypeScript project, install planck.js, configure tsconfig.json with strict mode in tsconfig.json and vite.config.ts
- [x] T003 [P] Configure Vitest (vitest.config.ts), Playwright (playwright.config.ts), and ESLint (.eslintrc.cjs) with TypeScript strict rules

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, interfaces, and configuration that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Define all shared types and enums from data-model.md (GameSession, Player, PuckStyle, GameConfig, BoardLayout, PhysicsConfig, ShoveConfig, Turn, ShoveVector, GamePhase, TurnPhase, PuckPattern) in src/types/index.ts
- [x] T005 [P] Define all module contract interfaces from contracts/internal-modules.md (PhysicsSimulation, InputManager, Renderer, AudioManager, GameStateMachine, UIOverlayManager and supporting types) in src/types/contracts.ts
- [x] T006 Create game configuration defaults (GameConfig with BoardLayout 12×9, PhysicsConfig gravity/restitution/friction, ShoveConfig max 2 shoves, bucket scores [100,500,1000,5000,10000,5000,1000,500,100]) in src/config/game-config.ts
- [x] T007 Implement board geometry computation (pin positions with staggered offsets, bucket boundaries, shove-zone Y coordinate) from BoardLayout in src/config/board-geometry.ts

**Checkpoint**: Foundation ready — all types, contracts, and config available for user story implementation

---

## Phase 3: User Story 1 — Core Plinko Drop (Priority: P1) 🎯 MVP

**Goal**: A single puck drops through a pin field under realistic deterministic physics and lands in a scoring bucket.

**Independent Test**: Load the game, drop a puck from several horizontal positions, confirm gravity, pin bouncing, bucket landing, and correct score display.

### Tests for User Story 1

> **Write these tests FIRST — ensure they FAIL before implementation (Constitution §V)**

- [x] T008 [P] [US1] Unit tests for board builder (pin body count, wall boundaries, bucket divider positions) in tests/unit/physics/board-builder.test.ts
- [x] T009 [P] [US1] Unit tests for PhysicsSimulation (createWorld, dropPuck, step returns events, getSnapshot positions) in tests/unit/physics/simulation.test.ts
- [x] T010 [P] [US1] Unit tests for bucket detector (puck in each bucket zone, stall timeout, edge positions) in tests/unit/physics/bucket-detector.test.ts
- [x] T011 [P] [US1] Unit tests for scoring engine (bucket index → score lookup, cumulative scoring) in tests/unit/core/scoring.test.ts
- [x] T012 [P] [US1] Unit test for physics determinism (same drop position → same bucket, 10 repeated runs) in tests/unit/physics/determinism.test.ts

### Implementation for User Story 1

- [x] T013 [US1] Implement board builder (create static pin circle bodies, boundary walls, bucket divider bodies in Planck.js world) in src/physics/board-builder.ts
- [x] T014 [US1] Implement PhysicsSimulation (createWorld, dropPuck, step with fixed timestep, getSnapshot, getPuckState, clearPucks, destroy) in src/physics/simulation.ts
- [x] T015 [US1] Implement bucket detector (puck settling via isAwake + velocity threshold, bucket index by x-range, stall timeout force-assign) in src/physics/bucket-detector.ts
- [x] T016 [US1] Implement fixed-timestep game loop with accumulator pattern (accumulate dt, step at 1/60s, clamp to 250ms, max 4 steps/frame, interpolation alpha) in src/core/game-loop.ts
- [x] T017 [US1] Implement scoring engine (bucket score lookup from config, single-turn scoring, cumulative score tracking) in src/core/scoring.ts
- [x] T018 [US1] Implement basic InputManager (pointer events for horizontal puck positioning drag and release tap/click, no flick yet) in src/input/input-manager.ts
- [x] T019 [US1] Implement Renderer (init canvas, drawFrame with pins as circles, pucks with PuckStyle colors/patterns, bucket dividers, bucket score labels, interpolation alpha blending) in src/rendering/renderer.ts
- [x] T020 [P] [US1] Create index.html with full-viewport canvas element and overlay container div in public/index.html
- [x] T021 [US1] Wire game loop, PhysicsSimulation, InputManager, Renderer, and scoring into working single-drop flow in src/main.ts

**Checkpoint**: Single-puck drop works end-to-end — drop from any position, puck bounces off pins, lands in bucket, score displays. Physics is deterministic.

---

## Phase 4: User Story 2 — Multi-Player Session & Turns (Priority: P2)

**Goal**: 2–4 players register, take turns dropping pucks, scores accumulate over configurable rounds, winner is declared.

**Independent Test**: Register 2–4 players, play through all rounds, confirm turns alternate correctly, scores accumulate, correct winner declared, results screen offers Play Again / New Players / Quit.

### Tests for User Story 2

> **Write these tests FIRST — ensure they FAIL before implementation**

- [x] T022 [P] [US2] Unit tests for GameStateMachine (registration → playing → results transitions, startSession, completeTurn, evaluateRoundEnd) in tests/unit/core/state-machine.test.ts
- [x] T023 [P] [US2] Unit tests for TurnManager (turn cycling through players, round advancement, active player tracking) in tests/unit/core/turn-manager.test.ts
- [x] T024 [P] [US2] Integration test for full game session (register 3 players → 5 rounds → winner declared → Play Again resets) in tests/integration/game-session.test.ts

### Implementation for User Story 2

- [x] T025 [P] [US2] Implement Player factory (create Player from name, auto-assign PuckStyle from preset palette, validate name 1–16 chars) in src/core/player.ts
- [x] T026 [US2] Implement GameStateMachine (startSession, startTurn, completeTurn, evaluateRoundEnd, resetForReplay, resetFull, getState) in src/core/state-machine.ts
- [x] T027 [US2] Implement TurnManager (player turn cycling in registration order, round counter, current player tracking) in src/core/turn-manager.ts
- [x] T028 [P] [US2] Implement registration screen overlay (name inputs for 2–4 players, validation, Start button) in src/ui/registration.ts
- [x] T029 [P] [US2] Implement scoreboard overlay (all players with names, puck colors, running scores, highlight leader) in src/ui/scoreboard.ts
- [x] T030 [P] [US2] Implement turn indicator overlay (active player name, puck color, "Your Turn" prompt) in src/ui/turn-indicator.ts
- [x] T031 [US2] Implement results screen overlay (winner announcement, player rankings, Play Again / New Players / Quit buttons, farewell message on Quit) in src/ui/results.ts
- [x] T032 [US2] Implement UIOverlayManager coordinator (show/hide overlays by game phase, delegate to individual overlay modules) in src/ui/overlay-manager.ts
- [x] T033 [US2] Integrate GameStateMachine, TurnManager, UIOverlayManager with game loop — registration flow → turn-by-turn play → results in src/main.ts

**Checkpoint**: Full multiplayer game works — register players, play rounds, accumulate scores, declare winner, replay or restart.

---

## Phase 5: User Story 3 — Shove Mechanic (Priority: P3)

**Goal**: After dropping, the active player can flick to apply up to 2 directional shoves while the puck is in the top 2/3 of the board (rows 1–9).

**Independent Test**: Drop a puck and perform 0, 1, or 2 shoves. Confirm trajectory changes proportionally to flick vector, third shove is blocked, shoves below row 9 are ignored, same inputs produce same result.

### Tests for User Story 3

> **Write these tests FIRST — ensure they FAIL before implementation**

- [x] T034 [P] [US3] Unit tests for flick detector (velocity-window sampling, min speed threshold, vector quantization, zero-magnitude rejection) in tests/unit/input/flick-detector.test.ts
- [x] T035 [P] [US3] Unit tests for shove application (impulse applied, zone check, max 2 enforced, force cap, determinism with same vector) in tests/unit/physics/shove.test.ts

### Implementation for User Story 3

- [x] T036 [US3] Implement flick detector (pointer event ring buffer, 80ms velocity window, magnitude threshold 200px/s, quantize to 0.001 precision) in src/input/flick-detector.ts
- [x] T037 [US3] Extend InputManager with onFlick callback, setFlickEnabled toggle, and pointer capture for fast flicks in src/input/input-manager.ts
- [x] T038 [US3] Implement applyShove in PhysicsSimulation (apply linear impulse, shove-zone Y check, shove count enforcement, force magnitude cap) in src/physics/simulation.ts
- [x] T039 [US3] Render shove-zone boundary line (horizontal dashed line at row 9 Y position) in src/rendering/renderer.ts
- [x] T040 [US3] Implement shove counter UI overlay (remaining/total display, update on shove use and zone exit) in src/ui/shove-counter.ts
- [x] T041 [US3] Wire flick events → physics shove → shove counter update → zone exit disable in src/main.ts

**Checkpoint**: Shove mechanic works — flick gesture applies force, limited to 2 per turn, disabled below row 9, counter and zone line visible.

---

## Phase 6: User Story 4 — Turn Timer (Priority: P4)

**Goal**: Each player has 15 seconds to position and release their puck. Auto-drop on timeout with no shoves allowed.

**Independent Test**: Start a turn, wait 15 seconds without releasing. Confirm the puck auto-drops from its last position with no shove opportunity.

### Tests for User Story 4

> **Write these tests FIRST — ensure they FAIL before implementation**

- [x] T042 [P] [US4] Unit tests for turn timer (15s countdown, expiry fires callback, reset between turns, manual release stops timer, no shoves after timeout) in tests/unit/core/turn-timer.test.ts

### Implementation for User Story 4

- [x] T043 [US4] Implement turn timer logic (countdown from configurable seconds, expiry callback, pause/resume, reset) in src/core/turn-timer.ts
- [x] T044 [US4] Implement timer countdown UI overlay (seconds display, warning color at ≤5s) in src/ui/timer.ts
- [x] T045 [US4] Wire timer to game loop — start on turn begin, stop on release, auto-drop + disable shoves on expiry in src/main.ts

**Checkpoint**: Timer runs on each turn, auto-drops on expiry with shoves disabled, resets between turns.

---

## Phase 7: User Story 5 — Tie-Breaker Rounds (Priority: P5)

**Goal**: When players tie after the final round, tie-breaker rounds auto-start with only tied players until one leads or 10 rounds pass (co-winners).

**Independent Test**: Set up a game where 2 players finish with equal scores. Confirm tie-breaker round starts with only those players, repeats until winner emerges or 10-round cap.

### Tests for User Story 5

> **Write these tests FIRST — ensure they FAIL before implementation**

- [x] T046 [P] [US5] Unit tests for tie-breaker logic (detect tied players, filter active roster, repeat rounds, declare winner after 1 tie-break, co-winners at round 10) in tests/unit/core/tie-breaker.test.ts

### Implementation for User Story 5

- [x] T047 [US5] Implement tie detection in scoring engine (identify players sharing max score) in src/core/scoring.ts
- [x] T048 [US5] Implement tie-breaker phase in GameStateMachine (playing → tieBreaker transition, filter activePlayers, round cycling, max 10 cap → coWinners) in src/core/state-machine.ts
- [x] T049 [US5] Update results screen for tie-breaker announcements and co-winner display in src/ui/results.ts
- [x] T050 [US5] Wire tie-breaker phase transitions into game loop in src/main.ts

**Checkpoint**: Ties trigger tie-breaker rounds with correct player filtering, resolve to single winner or co-winners within 10 rounds.

---

## Phase 8: User Story 6 — Visual & Audio Feedback (Priority: P6)

**Goal**: Entertaining effects for all key events — drop animation, pin collision sparks, shove board-shake, bucket landing impact, winner fanfare. Audio cues for each event.

**Independent Test**: Play a full turn and verify each event triggers appropriate visual and audio effects. Repeat on mobile and desktop for consistency.

### Tests for User Story 6

> **Write these tests FIRST — ensure they FAIL before implementation**

- [x] T051 [P] [US6] Unit tests for AudioManager (unlock on gesture, load sprite sheet, play named sounds, pitch variation, volume set, mute toggle) in tests/unit/audio/audio-manager.test.ts

### Implementation for User Story 6

- [x] T052 [US6] Implement AudioManager (AudioContext unlock on first gesture, OGG+MP3 sprite loading, play by name with offset/duration, pitch variation, master volume, mute toggle) in src/audio/audio-manager.ts
- [x] T053 [P] [US6] Create audio sprite map configuration (sound names: drop, pinHit, shove, bucketLand, winner, tick, timeout with offsets and durations) in src/audio/sprite-map.ts
- [x] T054 [US6] Implement particle effects system (pinHit sparks, bucketLand burst, shove trail — lightweight canvas-drawn particles with lifetime decay) in src/rendering/particles.ts
- [x] T055 [US6] Implement visual effects (board-shake on shove with intensity/duration, score-pop animation on bucket landing) in src/rendering/effects.ts
- [x] T056 [US6] Wire PhysicsStepResult collision events and game events to AudioManager.play and particle/effect triggers in src/main.ts

**Checkpoint**: All gameplay events produce satisfying visual and audio feedback at 60fps on mobile.

---

## Phase 9: User Story 7 — Responsive Device Adaptation (Priority: P7)

**Goal**: Landscape on desktop, portrait on mobile. Full board visible on all screens. 44px touch targets. Responsive resize without reload.

**Independent Test**: Open game on phone (portrait) and laptop (landscape). Confirm board, pins, buckets, scores, and controls are fully visible and usable on both without scrolling.

### Tests for User Story 7

> **Write these tests FIRST — ensure they FAIL before implementation**

- [x] T057 [P] [US7] Unit tests for layout computation (landscape vs portrait dimensions, scale factor, touch target sizing, resize recalculation) in tests/unit/rendering/layout.test.ts

### Implementation for User Story 7

- [x] T058 [US7] Implement responsive canvas sizing with device-pixel-ratio handling and viewport-fit scaling in src/rendering/canvas-setup.ts
- [x] T059 [US7] Implement portrait/landscape layout calculator (board dimensions, UI overlay positions, scale factor per orientation) in src/rendering/layout.ts
- [x] T060 [US7] Ensure all UI overlay touch targets are ≥44×44 CSS pixels on mobile (buttons, input fields, interactive areas) in src/ui/ (all overlay files)
- [x] T061 [US7] Implement window resize handler with debounce — recalculate layout, resize canvas, reposition overlays without reload in src/rendering/renderer.ts

**Checkpoint**: Game renders correctly on mobile portrait and desktop landscape. Full board visible, touch targets accessible, resize adapts without reload.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Offline support, edge-case handling, accessibility, and verification

- [x] T062 [P] Implement service worker for offline caching (cache static assets, index.html, compiled JS/CSS on install; serve cache-first) in public/sw.js
- [x] T063 Register service worker from application entry point in src/main.ts
- [x] T064 [P] Implement tab visibility handler (pause physics simulation and turn timer on visibilitychange hidden, resume on visible) in src/core/visibility.ts
- [x] T065 [P] Add CSS base styles with reset, viewport meta, WCAG AA contrast (4.5:1 ratio) for all text and UI elements in public/styles.css
- [x] T066 E2E smoke test with Playwright (launch game, register 2 players, complete 2 rounds, verify winner screen appears) in tests/e2e/game-smoke.test.ts
- [x] T067 Performance verification — profile on mobile baseline (Snapdragon 680 equivalent), confirm ≥60fps during active gameplay with effects
- [x] T068 Bundle size verification — production build, confirm total gzipped output ≤1 MB

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — first playable increment
- **US2 (Phase 4)**: Depends on US1 (needs physics + board + scoring)
- **US3 (Phase 5)**: Depends on US1 (needs puck in flight for shoves)
- **US4 (Phase 6)**: Depends on US2 (needs turn structure for timer)
- **US5 (Phase 7)**: Depends on US2 (needs scoring and round completion)
- **US6 (Phase 8)**: Depends on US1 (needs physics events for effects). Can parallel with US2–US5.
- **US7 (Phase 9)**: Depends on US1 (needs renderer). Can parallel with US2–US5.
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependency Graph

```
Phase 1 (Setup) → Phase 2 (Foundation)
                         │
                         ▼
                   Phase 3 (US1) ─────────────────────────────┐
                    │    │    │                                │
                    ▼    │    ▼                                ▼
             Phase 4 (US2)   Phase 8 (US6)              Phase 9 (US7)
              │         │
              ▼         ▼
       Phase 6 (US4)  Phase 7 (US5)
                    │    │
                    ▼    ▼
              Phase 10 (Polish)
```

Note: US3 (Phase 5) depends on US1 only. It can run in parallel with US2.

### Within Each User Story

1. Tests MUST be written first and FAIL before implementation (Constitution §V)
2. Physics/model tasks before service/logic tasks
3. Service/logic tasks before UI/rendering tasks
4. Core implementation before main.ts wiring
5. Story complete before moving to next priority

### Parallel Opportunities

**Phase 2**: T004 and T005 are parallel (different files)
**US1 Tests**: T008, T009, T010, T011, T012 are all parallel (different test files)
**US2 Tests**: T022, T023, T024 are all parallel
**US2 Impl**: T028, T029, T030 are parallel (different UI overlay files)
**US3 Tests**: T034, T035 are parallel
**US6**: T052 and T053 are parallel (AudioManager vs sprite map config)
**Cross-story**: US3 (Phase 5) can run in parallel with US2 (Phase 4) since both only depend on US1
**Cross-story**: US6 (Phase 8) and US7 (Phase 9) can run in parallel with US2–US5

---

## Parallel Examples

### User Story 1 — Parallel Test Writing

```
# Launch all US1 tests simultaneously (5 files, no dependencies):
T008: tests/unit/physics/board-builder.test.ts
T009: tests/unit/physics/simulation.test.ts
T010: tests/unit/physics/bucket-detector.test.ts
T011: tests/unit/core/scoring.test.ts
T012: tests/unit/physics/determinism.test.ts
```

### User Story 2 — Parallel UI Overlays

```
# After T025-T027 (core logic), launch UI overlays simultaneously:
T028: src/ui/registration.ts
T029: src/ui/scoreboard.ts
T030: src/ui/turn-indicator.ts
```

### Cross-Story Parallelism

```
# After US1 complete, these can proceed simultaneously:
Stream A: US2 (Phase 4) → US4 (Phase 6) → US5 (Phase 7)
Stream B: US3 (Phase 5)
Stream C: US6 (Phase 8)
Stream D: US7 (Phase 9)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 — Core Plinko Drop
4. **STOP AND VALIDATE**: Drop pucks, verify physics, scoring, determinism
5. This is the minimum playable demo

### Incremental Delivery

1. Setup + Foundation → types and config ready
2. US1 → Single-puck drop with physics and scoring (**MVP**)
3. US2 → Multiplayer turns, registration, winner declaration
4. US3 → Shove mechanic adds player skill
5. US4 → Turn timer keeps pace lively
6. US5 → Tie-breakers ensure decisive outcomes
7. US6 → Audio and visual polish for fun factor
8. US7 → Responsive layout for all devices
9. Polish → Offline support, edge cases, verification

Each increment is independently testable and adds value without breaking previous stories.

---

## Notes

- Total tasks: 68
- All tasks follow `- [ ] [TaskID] [P?] [Story?] Description with file path` format
- [P] = different files, no dependencies on incomplete tasks
- [Story] label maps to spec.md user stories (US1–US7)
- Physics determinism is tested explicitly (T012) — Constitution §II
- Test-first enforced for all game logic — Constitution §V
- Visual/rendering code exempt from TDD but covered by E2E smoke test (T066) — Constitution §V
- Bundle budget verified in T068 — estimated 191–311 KB of 1 MB max
- Commit after each task or logical group
