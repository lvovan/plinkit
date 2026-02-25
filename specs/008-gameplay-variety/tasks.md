# Tasks: Gameplay Variety & Polish

**Input**: Design documents from `/specs/008-gameplay-variety/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Tests are omitted — manual verification via quickstart.md and acceptance scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend types, config, and SoundName to support all six user stories

- [X] T001 Add `pinsPerRow` to `BoardLayout` interface and `AutoShoveConfig` interface and `AutoShoveEvent` interface in src/types/index.ts
- [X] T002 Add `autoShoveVelocityThreshold` to `PhysicsConfig` and `autoShove: AutoShoveConfig` to `GameConfig` in src/types/index.ts
- [X] T003 [P] Add `'coinDing'` and `'autoShove'` to `SoundName` union in src/types/contracts.ts
- [X] T004 Add `pinsPerRow: 5` to `DEFAULT_BOARD_LAYOUT`, `autoShoveVelocityThreshold: 0.1` to physics config, and `DEFAULT_AUTO_SHOVE` config block in src/config/game-config.ts

**Checkpoint**: All new types compile. `pnpm typecheck` passes with the new interfaces and config defaults.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update board-geometry functions that multiple user stories depend on

**⚠️ CRITICAL**: US1 (pin layout) and US4 (proportional buckets) both depend on board-geometry changes. These must land before story phases begin.

- [X] T005 Update `computePinPositions()` to use `layout.pinsPerRow` instead of `layout.bucketCount` for pin count, with dynamic spacing formula `min(2.0, (boardWidth - 2*(pinRadius+puckRadius)) / (pinsPerRow-1))` and dynamic margins (1.5 for ≥8 rows, 2.0 otherwise) in src/config/board-geometry.ts
- [X] T006 Update `computeBucketBoundaries()` to use log₁₀(score) proportional widths with MIN_BUCKET_WIDTH=1.2 clamp in src/config/board-geometry.ts

**Checkpoint**: Board geometry functions produce correct pin positions for all (rows × pinsPerRow) combinations and proportional bucket widths summing to boardWidth. Existing game still renders correctly with default layout (`pinRows: 6`, `pinsPerRow: 5`).

---

## Phase 3: User Story 1 — Dynamic Pin Layout Per Round (Priority: P1) 🎯 MVP

**Goal**: Each round regenerates the pin grid with random row count (5–9) and pins-per-row (4–6), so no two rounds look the same while remaining identical for all players within a round.

**Independent Test**: Start a game with 2 players, play through 3+ rounds, and confirm that the pin grid visibly changes between rounds while remaining identical for both players within each round.

### Implementation for User Story 1

- [X] T007 [US1] Add round-transition board rebuild logic in src/main.ts — when `roundJustCompleted` is true, generate random `pinRows` ∈ [5,9] and `pinsPerRow` ∈ [4,6], compute new `pinSpacing`, update `config.boardLayout`, call `sim.createWorld(config)`
- [X] T008 [US1] Recompute `pinRenderData` and `bucketRenderData` after board rebuild in src/main.ts — move pre-computation from one-time startup into a `rebuildRenderData()` helper called at game start and each round transition
- [X] T009 [US1] Ensure the first round also gets a randomized layout by calling the layout randomization in `startGame()` before the initial `sim.createWorld()` in src/main.ts

**Checkpoint**: Pin grid visibly changes between rounds. Pucks interact correctly with all layout combinations. Both players in a round see the same grid.

---

## Phase 4: User Story 4 — Proportional Bucket Visuals (Priority: P2)

**Goal**: Bucket widths are proportional to score values — center jackpot bucket (10000) is visibly wider than side buckets (100). Physics dividers match visual boundaries.

**Independent Test**: Start a game and verify that the center (high-value) bucket is visibly wider than the side (low-value) buckets. Score labels scale proportionally.

### Implementation for User Story 4

- [X] T010 [US4] Verify renderer uses bucket `width` from `RenderState.buckets` for drawing — confirm no hardcoded equal-width assumptions in src/rendering/renderer.ts
- [X] T011 [US4] Verify bucket score label font size scales with bucket width in src/rendering/renderer.ts — if hardcoded, update to be proportional to `bucket.width`

**Checkpoint**: Center bucket is visually ~2× wider than side buckets (2.857 vs 1.429 units). Pucks landing visually in a bucket score correctly for that bucket.

---

## Phase 5: User Story 2 — Auto-Shove for Stuck Pucks (Priority: P1)

**Goal**: Stuck pucks (velocity < 0.1 u/s for 3s above bucket zone) are automatically nudged with a 1.5-magnitude impulse, retried up to 3 times with alternating directions, before falling back to nearest-bucket assignment.

**Independent Test**: Drop a puck and observe that if it becomes visually stuck (near-zero velocity outside the bucket zone), a visible nudge is applied within ~3 seconds to unstick it.

### Implementation for User Story 2

- [X] T012 [US2] Add auto-shove stall detection in `checkSettled()` — track per-puck tick counter, detect velocity < 0.1 u/s for 180 ticks above `bucketRegionTop`, return `AutoShoveEvent` in src/physics/bucket-detector.ts
- [X] T013 [US2] Add per-puck auto-shove attempt counter and direction strategy (alternating left/right/down per attempt) in src/physics/bucket-detector.ts
- [X] T014 [US2] Add `applyAutoShove(event: AutoShoveEvent)` method to apply impulse via `body.applyLinearImpulse()` in src/physics/simulation.ts
- [X] T015 [US2] Route `AutoShoveEvent` from bucket detector to simulation in game loop, play `'autoShove'` sound via audio manager in src/main.ts
- [X] T016 [P] [US2] Implement `playAutoShove()` synth function (~150 Hz sine, 100ms exponential decay) in src/audio/synth-effects.ts
- [X] T017 [P] [US2] Route `'autoShove'` sound name to `playAutoShove()` in src/audio/audio-manager.ts
- [X] T018 [US2] Add auto-shove warning visual (0.3s puck pulse/glow starting at 2.7s into stall) in src/rendering/renderer.ts

**Checkpoint**: A stuck puck receives up to 3 auto-shoves with alternating directions before fallback to nearest-bucket. Audio thunk plays on each auto-shove. Visual warning pulse precedes each nudge.

---

## Phase 6: User Story 3 — Coin Sound on Bucket Score (Priority: P2)

**Goal**: A metallic coin "ding" plays alongside the existing bucket-land arpeggio whenever a puck settles into a bucket and earns points.

**Independent Test**: Drop a puck, let it land in any bucket, and confirm a coin sound plays alongside the existing bucket-land sound.

### Implementation for User Story 3

- [X] T019 [P] [US3] Implement `playCoinDing()` synth function (2400 Hz + 3800 Hz inharmonic sine, ~150ms decay) with `pitchShift`/`stretchDuration` support in src/audio/synth-effects.ts
- [X] T020 [P] [US3] Route `'coinDing'` sound name to `playCoinDing()` in src/audio/audio-manager.ts
- [X] T021 [US3] Trigger `'coinDing'` sound on bucket landing event (alongside existing `'bucketLand'`) in src/main.ts

**Checkpoint**: Every bucket landing produces both the arpeggio and the coin ding. Coin sound respects SFX mute and slow-motion timeScale.

---

## Phase 7: User Story 5 — Player Name Persistence (Priority: P3)

**Goal**: Player names are saved to localStorage on registration and pre-filled on subsequent visits.

**Independent Test**: Register with names "Alice" and "Bob", reload the page, and confirm the registration form pre-fills with "Alice" and "Bob".

### Implementation for User Story 5

- [X] T022 [US5] Add `loadSavedNames()` and `saveNames()` helper functions using localStorage key `plinkit_player_names` with try/catch for silent degradation in src/ui/registration.ts
- [X] T023 [US5] Call `loadSavedNames()` after creating inputs to pre-fill values, and call `saveNames()` in submit handler before resolving the Promise in src/ui/registration.ts

**Checkpoint**: Names persist across page reloads. Form works normally when localStorage is unavailable. Editing a pre-filled name updates the saved value.

---

## Phase 8: User Story 6 — First-Round Shove Guidance Popup (Priority: P3)

**Goal**: If no player shoves during Round 1, a "Did you know?" popup appears at the end of that round explaining the flick/shove mechanic. Shown at most once per browser session.

**Independent Test**: Start a game with 2 players, complete Round 1 without performing any shove, and verify a popup appears after the last turn of Round 1.

### Implementation for User Story 6

- [X] T024 [P] [US6] Create `showShoveGuidance(container): Promise<void>` and `wasGuidanceShown(): boolean` in new file src/ui/shove-guidance.ts — DOM overlay with "Did you know?" text, ≥44px dismiss button, session-scoped shown flag
- [X] T025 [US6] Add `shoveOccurredInRound1` tracking flag in src/main.ts — set to true when `applyShove()` is called during round 1, reset on new game
- [X] T026 [US6] At end of Round 1 (when `roundJustCompleted && currentRound === 1`), check if no shoves occurred and guidance not yet shown, then await `showShoveGuidance()` before proceeding to Round 2 in src/main.ts

**Checkpoint**: Popup appears at end of Round 1 when no shoves occurred. Does not appear if at least one shove was made. Does not appear again in the same browser session. Does not appear during tie-breaker rounds.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all stories

- [ ] T027 Verify all 15 (rows × pinsPerRow) layout combinations render correctly — spot check (5,4), (7,5), (9,6) in the running game
- [ ] T028 Verify auto-shove fallback path — after 3 failed auto-shoves, puck is assigned to nearest bucket (existing behavior preserved)
- [ ] T029 Run `pnpm typecheck` to confirm zero TypeScript errors across all modified files
- [ ] T030 Run quickstart.md validation — follow each verification step in specs/008-gameplay-variety/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist first) — BLOCKS all user stories
- **US1 Dynamic Layout (Phase 3)**: Depends on Phase 2 (board-geometry functions)
- **US4 Proportional Buckets (Phase 4)**: Depends on Phase 2 (computeBucketBoundaries)
- **US2 Auto-Shove (Phase 5)**: Depends on Phase 2; independent of US1/US4
- **US3 Coin Sound (Phase 6)**: Depends on Phase 1 (SoundName type); independent of all other stories
- **US5 Name Persistence (Phase 7)**: No dependencies on other stories (only Phase 1 is optional — no type changes needed)
- **US6 Shove Guidance (Phase 8)**: Depends on Phase 3 (round transition logic in main.ts for tracking round completion)
- **Polish (Phase 9)**: Depends on all stories being complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no dependencies on other stories
- **US4 (P2)**: After Phase 2 — no dependencies on other stories
- **US2 (P1)**: After Phase 2 — independent of US1/US4
- **US3 (P2)**: After Phase 1 — fully independent
- **US5 (P3)**: Fully independent — can start anytime
- **US6 (P3)**: After US1 (needs round-transition logic in main.ts)

### Within Each User Story

- Types/config before logic
- Detection before application (US2: detector before simulation)
- Synth before routing (US3/US2: synth function before audio-manager routing)
- Core implementation before integration with main.ts

### Parallel Opportunities

- T001 + T003 (different files: index.ts vs contracts.ts)
- T005 + T006 (different functions in same file — can be done sequentially in one pass)
- T016 + T017 (synth-effects.ts + audio-manager.ts — different files)
- T019 + T020 (synth-effects.ts + audio-manager.ts — different files)
- T024 (new file) can start in parallel with any other story
- US3 (coin sound) and US5 (name persistence) can run entirely in parallel with each other and with US1/US2/US4

---

## Parallel Example: After Phase 2 Completes

```
# These three story streams can run in parallel:

Stream A (US1 + US4 — board visuals):
  T007 → T008 → T009 (dynamic layout)
  T010 → T011 (proportional buckets — can interleave)

Stream B (US2 — auto-shove):
  T012 → T013 → T014 → T015 (detection + impulse chain)
  T016 + T017 in parallel (audio)
  T018 (visual warning)

Stream C (US3 + US5 — independent):
  T019 + T020 → T021 (coin sound)
  T022 → T023 (name persistence — fully parallel with coin sound)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T006)
3. Complete Phase 3: US1 Dynamic Pin Layout (T007–T009)
4. **STOP and VALIDATE**: Play 3+ rounds, confirm pin grid changes
5. This alone delivers the core value — round-to-round variety

### Incremental Delivery

1. Setup + Foundational → Types, config, board-geometry ready
2. Add US1 → Dynamic pin layout per round → Validate (MVP!)
3. Add US4 → Proportional bucket visuals → Validate
4. Add US2 → Auto-shove for stuck pucks → Validate
5. Add US3 → Coin sound on bucket score → Validate
6. Add US5 → Player name persistence → Validate
7. Add US6 → First-round shove guidance → Validate
8. Polish → Final cross-cutting validation

---

## Notes

- All audio is synthesized via Web Audio API — no audio files
- No new npm dependencies
- `sim.createWorld(config)` destroys and recreates the entire Planck.js world — called at round transitions
- `pinRenderData` and `bucketRenderData` in `main.ts` must be recomputed on every round transition (currently computed once at startup)
- localStorage key: `plinkit_player_names`
- Shove guidance uses session-scoped flag (module-level variable), NOT localStorage
