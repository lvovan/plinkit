# Tasks: Gameplay Audio Polish

**Input**: Design documents from `/specs/005-gameplay-audio-polish/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-modules.md

**Tests**: Constitution V mandates TDD for game logic (shove limits, pattern assignment, music state transitions). Audio synthesis and rendering are exempt from TDD but have manual test scenarios in quickstart.md.

**Organization**: Tasks grouped by user story. Each story is independently implementable and testable after the Foundational phase completes.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Setup/Foundational phases have no story label
- Exact file paths included in each task description

---

## Phase 1: Setup

**Purpose**: No project initialization needed — this is an existing codebase. Skip directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared type/contract/config changes that affect multiple user stories. MUST complete before any story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [P] Remove `'solid'` from `PuckPattern` union type and update `PUCK_PALETTE` to all non-solid patterns (stripes→dots→rings cycling) in `src/types/index.ts`
- [x] T002 [P] Remove `maxShovesPerTurn` from `ShoveConfig` interface in `src/types/index.ts`
- [x] T003 [P] Update `AudioManager` interface: replace `load()` with `init()`, rename `setVolume()`→`setSfxVolume()`, `toggleMute()`→`toggleMuteSfx()`, add `isSfxMuted()`, `getContext()`, `getMasterGain()`; remove `SpriteMap` interface; add `MusicTrack` type and `MusicManager` interface in `src/types/contracts.ts`
- [x] T004 [P] Remove `shovesRemaining` from `TurnContext` interface; remove `updateShoveCounter()` from `UIOverlayManager` interface; add `initAudioToggles()` and `updateAudioToggleState()` to `UIOverlayManager` interface in `src/types/contracts.ts`
- [x] T005 Remove `maxShovesPerTurn` from default config in `src/config/game-config.ts`
- [x] T006 Remove `shovesRemaining` assignment from `startTurn()` in `src/core/state-machine.ts`

**Checkpoint**: All shared types, interfaces, and config updated. User story implementation can begin.

---

## Phase 3: User Story 1 — Unlimited Shoves (Priority: P1) 🎯 MVP

**Goal**: Remove the per-turn shove count limit. Players can shove unlimited times while puck is in the shove zone. Remove shove counter UI entirely.

**Independent Test**: Drop a puck, perform 5+ shove gestures — all apply force. No shove counter visible on screen.

### Tests for User Story 1

> **TDD required by Constitution V — write tests FIRST, verify they FAIL, then implement.**

- [x] T007 [P] [US1] Write unit test: unlimited shoves are allowed (no count rejection) in `tests/unit/core/shove-unlimited.test.ts`
- [x] T008 [P] [US1] Write unit test: shoves still blocked when puck is outside shove zone in `tests/unit/core/shove-unlimited.test.ts`
- [x] T009 [P] [US1] Write unit test: shoves still blocked when turn timer has expired in `tests/unit/core/shove-unlimited.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Delete `src/ui/shove-counter.ts` entirely (ShoveCounterOverlay class removed)
- [x] T011 [US1] Remove shove counter integration from `src/ui/overlay-manager.ts`: remove import of ShoveCounterOverlay, remove `updateShoveCounter()` method, remove shove counter DOM element creation
- [x] T012 [US1] Remove shove count limit logic from `src/main.ts`: delete `shovesUsed` variable, remove `shovesUsed < config.shoveConfig.maxShovesPerTurn` guard (keep `activePuckId && !shovesDisabled` guard), remove `shovesUsed++` increment, remove `shovesUsed = 0` resets, remove all `overlays.updateShoveCounter()` calls
- [x] T013 [US1] Update `tests/integration/game-session.test.ts` to remove references to `shovesRemaining` and shove count limits

**Checkpoint**: Shoves are unlimited. No shove counter on screen. Zone/timer guards still work. All tests pass.

---

## Phase 4: User Story 2 — Visible Puck Rotation Patterns (Priority: P2)

**Goal**: All pucks display a non-solid pattern (stripes, dots, or rings) automatically assigned via round-robin. The 'solid' pattern is eliminated from the codebase.

**Independent Test**: Start a game, observe Player 1 has stripes, Player 2 has dots. Patterns rotate visibly on pin bounces.

### Tests for User Story 2

> **TDD required by Constitution V — pattern assignment is game logic.**

- [x] T014 [P] [US2] Write unit test: round-robin pattern assignment (player 0→stripes, 1→dots, 2→rings, 3→stripes) in `tests/unit/rendering/pattern-assignment.test.ts`
- [x] T015 [P] [US2] Write unit test: no puck in PUCK_PALETTE has `'solid'` pattern in `tests/unit/rendering/pattern-assignment.test.ts`
- [x] T016 [P] [US2] Write unit test: all players have visually distinct color+pattern combinations in `tests/unit/rendering/pattern-assignment.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Update registration UI to use updated `PUCK_PALETTE` (no solid option) in `src/ui/registration.ts`
- [x] T018 [US2] Remove `'solid'` case from `drawPuckPattern()` in `src/rendering/renderer.ts` (make it unreachable or delete the no-op branch)

**Checkpoint**: All pucks show a visible rotating pattern. No 'solid' pucks exist. Pattern assignment is deterministic via round-robin. All tests pass.

---

## Phase 5: User Story 3 — Sound Effects (Priority: P2)

**Goal**: Programmatically synthesized sound effects play on game events (drop, pin hit, shove, bucket land, winner, tick, timeout) using the native Web Audio API. Independent SFX mute toggle.

**Independent Test**: Drop a puck with audio on — hear drop clunk, pin-hit taps, and bucket-land chime. Toggle SFX mute — sounds stop.

### Tests for User Story 3

> **Synth factory outputs can be unit tested (node creation, parameter values). Audio is rendering-adjacent per Constitution V so testing is partial — manual scenarios in quickstart.md cover the rest.**

- [x] T019 [P] [US3] Write unit test: each SFX factory function creates expected oscillator/gain nodes with correct parameters in `tests/unit/audio/synth-effects.test.ts`
- [x] T020 [P] [US3] Write unit test: AudioManager.toggleMuteSfx() toggles muted state and isSfxMuted() returns correct value in `tests/unit/audio/audio-manager.test.ts`

### Implementation for User Story 3

- [x] T021 [P] [US3] Create SFX factory functions (playDrop, playPinHit, playShove, playBucketLand, playWinner, playTick, playTimeout) using OscillatorNode + GainNode patterns from research.md in `src/audio/synth-effects.ts`
- [x] T022 [US3] Rewrite `GameAudioManager` to use Web Audio synthesis: replace sprite-sheet `load()` with `init()` that creates AudioContext + sfxGain bus, implement `play()` to dispatch to synth-effects factories, implement `setSfxVolume()`, `toggleMuteSfx()`, `isSfxMuted()`, `getContext()`, `getMasterGain()` in `src/audio/audio-manager.ts`
- [x] T023 [US3] Delete `src/audio/sprite-map.ts` (no longer needed — sprite-sheet approach removed)
- [x] T024 [US3] Update `src/main.ts` audio initialization: replace `audioManager.load(url, spriteMap)` with `audioManager.init()`, remove sprite-map import
- [x] T025 [US3] Add SFX mute toggle button to overlay manager: implement `initAudioToggles()` (SFX toggle portion) and `updateAudioToggleState()` in `src/ui/overlay-manager.ts`
- [x] T026 [US3] Wire SFX toggle in `src/main.ts`: call `overlays.initAudioToggles()` with callback that invokes `audioManager.toggleMuteSfx()` and updates toggle state via `overlays.updateAudioToggleState()`
- [x] T027 [US3] Add SFX toggle button styles (≥44×44 CSS px touch target, icon-based) in `public/styles.css`

**Checkpoint**: All 7 SFX play on their respective game events. SFX mute toggle works independently. No audio files loaded. All tests pass.

---

## Phase 6: User Story 4 — Background Music (Priority: P3)

**Goal**: Two procedural looping music tracks (calm lobby + upbeat carnival gameplay) with crossfade transitions on game state changes. Independent music mute toggle.

**Independent Test**: Open game → hear lobby music. Drop first puck → music crossfades to carnival. Game ends → music crossfades back to lobby. Toggle music mute → music stops, SFX continues.

### Tests for User Story 4

> **TDD required by Constitution V — music state transitions are game logic.**

- [x] T028 [P] [US4] Write unit test: MusicManager state transitions (lobby→gameplay on drop, gameplay→lobby on results) in `tests/unit/audio/music-manager.test.ts`
- [x] T029 [P] [US4] Write unit test: MusicManager.toggleMute() toggles muted state independently of SFX in `tests/unit/audio/music-manager.test.ts`
- [x] T030 [P] [US4] Write unit test: crossfadeTo() transitions between tracks with correct gain ramp scheduling in `tests/unit/audio/music-manager.test.ts`

### Implementation for User Story 4

- [x] T031 [US4] Implement lobby music track: step-sequencer with Cmaj7 pad chords (sine+triangle), sparse pentatonic melody, ~65 BPM, seamless loop in `src/audio/music-manager.ts`
- [x] T032 [US4] Implement gameplay music track: step-sequencer with pentatonic melody, root-fifth bass, filtered-noise percussion, ~130 BPM, seamless loop in `src/audio/music-manager.ts`
- [x] T033 [US4] Implement MusicManager class: init() with AudioContext + musicGain bus, startTrack(), crossfadeTo() with GainNode ramp, stop(), setVolume(), toggleMute(), isMuted(), getCurrentTrack() in `src/audio/music-manager.ts`
- [x] T034 [US4] Wire music toggle into overlay: complete `initAudioToggles()` (music toggle portion) and update `updateAudioToggleState()` for music button in `src/ui/overlay-manager.ts`
- [x] T035 [US4] Wire music manager in `src/main.ts`: create MusicManager instance, call init() with audioManager.getContext() and audioManager.getMasterGain(), start lobby track after first user interaction
- [x] T036 [US4] Wire music transitions in `src/main.ts`: crossfadeTo('gameplay') on first puck drop of round, crossfadeTo('lobby') on results screen shown
- [x] T037 [US4] Add music toggle button styles (≥44×44 CSS px touch target, icon-based, next to SFX toggle) in `public/styles.css`

**Checkpoint**: Lobby music plays on registration/results screens. Gameplay music plays during active rounds. Crossfade transitions work. Music mute toggle is independent of SFX toggle. All tests pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and cross-story refinements.

- [x] T038 [P] Verify all existing tests pass with the shove/pattern/audio changes: run full `npm test` suite
- [x] T039 [P] Run E2E smoke test via `npx playwright test` to verify game still loads and plays through
- [x] T040 Run quickstart.md manual test scenarios (unlimited shoves, puck patterns, SFX, background music) and verify all pass
- [x] T041 [P] Clean up any remaining references to `sprite-map`, `maxShovesPerTurn`, `shovesRemaining`, `updateShoveCounter`, or `'solid'` pattern across the codebase
- [x] T042 Verify bundle size remains under 1 MB gzipped via `npm run build` and inspect `dist/` output

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately. BLOCKS all user stories.
- **US1 — Unlimited Shoves (Phase 3)**: Depends on Phase 2 (types/config changes).
- **US2 — Puck Patterns (Phase 4)**: Depends on Phase 2 (PuckPattern type change). Independent of US1.
- **US3 — Sound Effects (Phase 5)**: Depends on Phase 2 (AudioManager contract change). Independent of US1, US2.
- **US4 — Background Music (Phase 6)**: Depends on Phase 2 AND Phase 5 (needs AudioManager.getContext() and getMasterGain() from US3 implementation).
- **Polish (Phase 7)**: Depends on all user stories being complete.

### User Story Dependencies

```
Phase 2 (Foundational)
  ├─→ US1 (Unlimited Shoves)     ─────────────────────→ Phase 7 (Polish)
  ├─→ US2 (Puck Patterns)        ─────────────────────→ Phase 7
  ├─→ US3 (Sound Effects)        ─→ US4 (Background Music) → Phase 7
  └────────────────────────────────→ US4 (if US3 done)  → Phase 7
```

- **US1, US2, US3** can all proceed in parallel after Phase 2
- **US4** requires US3 to be complete (uses AudioManager context + master gain)
- **Phase 7** requires all stories to be complete

### Within Each User Story

1. Tests written FIRST (TDD) — verify they FAIL
2. Implementation tasks in listed order
3. Verify tests PASS after implementation
4. Story checkpoint before proceeding

### Parallel Opportunities

**After Phase 2 completes, three independent work streams can run simultaneously:**

```
Stream A: US1 (T007–T013) — Unlimited Shoves
Stream B: US2 (T014–T018) — Puck Patterns
Stream C: US3 (T019–T027) — Sound Effects
```

**Within each story, [P] tasks can run in parallel:**

```
US1 tests:  T007 ║ T008 ║ T009  (all parallel, same file but independent test cases)
US2 tests:  T014 ║ T015 ║ T016  (all parallel, same file)
US3 tasks:  T019 ║ T020          (parallel test files)
            T021 ║               (parallel with T022 start — different files)
US4 tests:  T028 ║ T029 ║ T030  (all parallel, same file)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational types/config changes
2. Complete Phase 3: User Story 1 — Unlimited Shoves
3. **STOP and VALIDATE**: Drop puck, perform 5+ shoves, verify all work, no counter shown
4. This alone delivers meaningful gameplay improvement

### Incremental Delivery

1. **Phase 2** → Foundation ready (types, interfaces, config)
2. **US1** → Unlimited shoves working → Test → ✅ MVP
3. **US2** → All pucks show patterns → Test → ✅ Visual polish
4. **US3** → Sound effects on game events → Test → ✅ Audio feedback
5. **US4** → Background music with crossfade → Test → ✅ Full atmosphere
6. **Phase 7** → Polish, cleanup, validation → ✅ Feature complete

Each increment adds value without breaking previous work.

---

## Notes

- [P] tasks touch different files with no incomplete-task dependencies
- All `src/audio/sprite-map.ts` references must be cleaned up after deletion (T023)
- All `src/ui/shove-counter.ts` references must be cleaned up after deletion (T010)
- Music volume should be lower than SFX volume (~0.3 vs ~0.7) to avoid masking gameplay audio
- Rate-limiting for pin-hit sounds (max 4 per 50ms) remains unchanged — adequate for unlimited shoves
- Total task count: 42 tasks across 6 phases
