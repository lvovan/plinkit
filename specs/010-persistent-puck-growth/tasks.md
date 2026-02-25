# Tasks: Persistent Puck Growth & Board Standardization

**Input**: Design documents from `/specs/010-persistent-puck-growth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-modules.md, quickstart.md

**Tests**: Included — constitution Principle V (Test-First for Game Logic) mandates automated tests before implementation.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US5)
- Exact file paths included in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add new types, config, and shared data structures that multiple user stories depend on

- [x] T001 Add `GrowthConfig` interface and `GrowthEvent`, `ScoreRevocationEvent` types to `src/types/index.ts`
- [x] T002 Extend `GameConfig` with `growth: GrowthConfig` field in `src/types/index.ts`
- [x] T003 Extend `RuntimePuck` with `currentRadius` and `growthCount` fields in `src/types/index.ts`
- [x] T004 Add `'puckGrowth'` to `SoundName` union and extend `RenderState` pucks with `growthAnimProgress` and add `scoreRevocations` array in `src/types/contracts.ts`
- [x] T005 Add `DEFAULT_GROWTH_CONFIG` constant and `growth` field to `DEFAULT_GAME_CONFIG` in `src/config/game-config.ts`
- [x] T006 Extend `PuckBody` interface with `currentRadius`, `growthCount`, `lastScoredBucket`, `scoreAwarded` fields in `src/physics/board-builder.ts`
- [x] T007 Initialize new `PuckBody` fields (`currentRadius: puckRadius`, `growthCount: 0`, `lastScoredBucket: null`, `scoreAwarded: 0`) in `dropPuck()` in `src/physics/simulation.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fix board layout to 8 rows (removes randomization) — ALL user stories assume a fixed board

**⚠️ CRITICAL**: User story work depends on a stable, non-randomized board layout

### Tests

- [x] T008 [P] Write unit test asserting `computePinPositions()` with `pinRows: 8` produces exactly 8 rows in `tests/unit/board-layout-fixed.test.ts`
- [x] T009 [P] Write unit test asserting no `randomizeLayout` function is exported from `src/main.ts` in `tests/unit/board-layout-fixed.test.ts`

### Implementation

- [x] T010 Set `pinRows: 8` in `DEFAULT_BOARD_LAYOUT` in `src/config/game-config.ts`
- [x] T011 Delete `randomizeLayout()` function and all its call sites in `src/main.ts`

**Checkpoint**: Board is always 8 rows, no randomization. All existing tests still pass. New board layout tests pass.

---

## Phase 3: User Story 1 — Fixed 8-Row Board Layout (Priority: P1) 🎯 MVP

**Goal**: Every game session uses a consistent board with exactly 8 staggered rows of pins. The layout never changes between rounds.

**Independent Test**: Start a 2+ player game, play 3+ rounds, confirm every round displays the same 8-row staggered pin grid with no variation.

> Note: The core board-fix implementation is in Phase 2 (foundational). This phase validates the behavioral change and ensures no randomization code paths remain.

### Tests

- [x] T012 [US1] Write integration test confirming pin layout is identical across 3 rounds in `tests/integration/persistent-pucks.test.ts`

### Implementation

- [x] T013 [US1] Remove any remaining references to dynamic `pinRows` values (verify no code path overrides the fixed `pinRows: 8`) in `src/config/game-config.ts` and `src/main.ts`

**Checkpoint**: US1 complete — 8-row board verified across multiple rounds with no variation.

---

## Phase 4: User Story 4 — Shove-Zone Boundary at Row 6 (Priority: P2)

**Goal**: Shove zone extends from top of board to the 6th row (inclusive). Below row 6, shoves are rejected. Visible boundary marks the transition.

**Independent Test**: Drop a puck and attempt shoves above and at row 6 (accepted), then below row 6 (rejected). Verify the boundary line renders correctly.

### Tests

- [x] T014 [P] [US4] Write unit test asserting `computeShoveZoneY()` with 8 rows and `shoveZoneRowLimit: 6` returns correct Y coordinate in `tests/unit/shove-zone.test.ts`

### Implementation

- [x] T015 [US4] Set `shoveZoneRowLimit: 6` in `DEFAULT_SHOVE_CONFIG` in `src/config/game-config.ts`

**Checkpoint**: US4 complete — shoves above row 6 accepted, below row 6 rejected. Visible boundary renders at correct Y position.

---

## Phase 5: User Story 5 — Persistent Pucks Across Rounds (Priority: P2)

**Goal**: All pucks persist on the board across turns and rounds for the entire game session. Pucks physically interact with newly dropped pucks. The board becomes more crowded as the game progresses.

**Independent Test**: Play a 2-player game for 3+ rounds. After each turn, confirm previous pucks remain visible and physically interact with new drops.

### Tests

- [x] T016 [P] [US5] Write integration test: drop puck, advance round, assert puck body still exists in `board.pucks` in `tests/integration/persistent-pucks.test.ts`
- [x] T017 [P] [US5] Write integration test: drop 3 pucks across 3 turns, assert all 3 remain in `board.pucks` with correct `playerId` in `tests/integration/persistent-pucks.test.ts`

### Implementation

- [x] T018 [US5] Remove `sim.clearPucks()`, `puckStyleMap.clear()`, and `sim.createWorld(config)` from `transitionToNextRound()` in `src/main.ts`
- [x] T019 [US5] Ensure `startGame()` still calls `createWorld()` and `handleGameEnd()` (Play Again / New Players) still resets fully in `src/main.ts`

**Checkpoint**: US5 complete — pucks survive round transitions, board evolves with accumulated pucks. Full game reset still works correctly.

---

## Phase 6: User Story 3 — Score Multiplier Reset Per Turn (Priority: P2)

**Goal**: Bounce multiplier resets to 1.0× at the start of each player's turn. Each turn's score is self-contained.

**Independent Test**: Play a 2-player game. On Player 1's turn 1, note the final multiplier. On turn 2, confirm it starts at 1.0×.

### Tests

- [x] T020 [P] [US3] Write unit test: simulate two sequential turns, assert multiplier starts at 1.0× for each turn regardless of prior bounces in `tests/unit/multiplier-reset.test.ts`
- [x] T021 [P] [US3] Write unit test: verify `bounceCount` is 0 at the start of each turn in `tests/unit/multiplier-reset.test.ts`

### Implementation

- [x] T022 [US3] Verify and ensure `bounceCount` resets to 0 before `dropPuck()` at each turn start in `src/main.ts`

**Checkpoint**: US3 complete — multiplier confirmed 1.0× at every turn start regardless of prior bounces.

---

## Phase 7: User Story 2 — Same-Player Puck Growth on Contact (Priority: P1)

**Goal**: When two pucks from the same player make contact, both grow by 20% surface area (visually pop, potentially push neighbors). Capped at ~1.59× base area. Chain reactions supported with depth cap of 10.

**Independent Test**: Drop two pucks for the same player in positions where they come to rest near each other. Confirm both grow on contact with a popping animation. Verify nearby pucks from other players are pushed. Confirm cross-player contacts do NOT trigger growth.

> Note: This phase appears after US5 (persistent pucks) because growth depends on pucks remaining on the board across turns.

### Tests

- [x] T023 [P] [US2] Write unit test: `computeGrownRadius()` returns `currentRadius × √1.2` for 20% area increase in `tests/unit/puck-growth.test.ts`
- [x] T024 [P] [US2] Write unit test: `computeGrownRadius()` clamps at `maxPuckRadius` (0.631) in `tests/unit/puck-growth.test.ts`
- [x] T025 [P] [US2] Write unit test: `computeGrownRadius()` returns `maxPuckRadius` when already at cap in `tests/unit/puck-growth.test.ts`
- [x] T026 [P] [US2] Write unit test: `processGrowthQueue()` does not trigger growth for cross-player puck contacts in `tests/unit/puck-growth.test.ts`
- [x] T027 [P] [US2] Write unit test: `processGrowthQueue()` caps chain depth at `maxChainDepth` (10) in `tests/unit/puck-growth.test.ts`
- [x] T028 [P] [US2] Write unit test: `processGrowthQueue()` grows both pucks in a same-player contact pair in `tests/unit/puck-growth.test.ts`
- [x] T029 [P] [US2] Write unit test: `resizePuckFixture()` destroys old fixture and creates new fixture with correct radius in `tests/unit/puck-growth.test.ts`
- [x] T030 [P] [US2] Write unit test: one puck at cap and one below cap — only below-cap puck grows in `tests/unit/puck-growth.test.ts`

### Implementation

- [x] T031 [US2] Create `computeGrownRadius()` function in `src/physics/puck-growth.ts`
- [x] T032 [US2] Create `resizePuckFixture()` function (destroy old fixture, create new CircleShape, setAwake) in `src/physics/puck-growth.ts`
- [x] T033 [US2] Create `processGrowthQueue()` function with chain-reaction loop and depth cap in `src/physics/puck-growth.ts`
- [x] T034 [US2] Extend `begin-contact` listener to detect same-player puck-puck contacts and queue `GrowthEvent` in `src/physics/simulation.ts`
- [x] T035 [US2] Integrate `processGrowthQueue()` call after `world.step()` in `step()` method of `src/physics/simulation.ts`
- [x] T036 [US2] Extend `StepResult` with `growthEvents` and `scoreRevocations` arrays in `src/physics/simulation.ts`
- [x] T037 [US2] Update render state builder to use `PuckBody.currentRadius` for puck radius in `src/main.ts`
- [x] T038 [US2] Add `GrowthPopEffect` type and rendering logic (scale-up animation with overshoot) in `src/rendering/effects.ts`
- [x] T039 [US2] Render growth pop animation using `growthAnimProgress` on pucks in `src/rendering/renderer.ts`
- [x] T040 [US2] Wire growth events from `StepResult` to create `GrowthPopEffect` instances in `src/main.ts`

### Audio (part of US2 — pop sound)

- [x] T041 [P] [US2] Add `playPuckGrowth()` synth function (sine sweep 200→800Hz, 60ms + noise burst) in `src/audio/synth-effects.ts`
- [x] T042 [US2] Route `'puckGrowth'` sound name to `playPuckGrowth()` in `src/audio/audio-manager.ts`
- [x] T043 [US2] Play `'puckGrowth'` sound on each growth event in `src/main.ts`

**Checkpoint**: US2 complete — same-player pucks grow on contact, capped at 0.631 radius, chain reactions resolve within depth 10, pop animation and sound play, cross-player contacts do NOT trigger growth.

---

## Phase 8: Revocable Scoring & Negative Score Flash (US5 acceptance scenario 4 + FR-016–FR-018)

**Goal**: Pucks knocked out of buckets lose their score. Player scores never go negative (clamp ≥ 0). A brief negative score indicator (red "-X") flashes when a score is revoked.

**Independent Test**: Drop a puck into a bucket (it scores). Drop another puck that knocks the first one out. Confirm score is subtracted and a red "-X" flash appears. Confirm score never goes below 0.

### Tests

- [x] T044 [P] Write unit test: `revokeScore()` subtracts amount from player score and clamps at 0 in `tests/unit/scoring-revocable.test.ts`
- [x] T045 [P] Write unit test: `revokeScore()` returns actual amount subtracted (may be less if clamped) in `tests/unit/scoring-revocable.test.ts`
- [x] T046 [P] Write unit test: `checkDisplacement()` detects settled puck woken and moved outside bucket boundary in `tests/unit/bucket-displacement.test.ts`
- [x] T047 [P] Write unit test: `checkDisplacement()` does NOT unsettle a puck that is briefly jostled but stays in its bucket in `tests/unit/bucket-displacement.test.ts`

### Implementation

- [x] T048 Add `revokeScore()` method to `ScoringEngine` with clamp ≥ 0 in `src/core/scoring.ts`
- [x] T049 Add `checkDisplacement()` method to `BucketDetector` monitoring settled pucks for wakeup + position change in `src/physics/bucket-detector.ts`
- [x] T050 Integrate `checkDisplacement()` into `step()` method in `src/physics/simulation.ts` and populate `StepResult.scoreRevocations`
- [x] T051 Update `PuckBody.lastScoredBucket` and `PuckBody.scoreAwarded` on bucket settlement in `src/physics/bucket-detector.ts`
- [x] T052 Add `NegativeScoreFlash` type and rendering logic (red "-X" text, fade-out) in `src/rendering/effects.ts`
- [x] T053 Render negative score flashes from `RenderState.scoreRevocations` in `src/rendering/renderer.ts`
- [x] T054 Wire score revocation events from `StepResult`: call `revokeScore()`, create `NegativeScoreFlash`, update scoreboard in `src/main.ts`

**Checkpoint**: Revocable scoring complete — displaced pucks lose their score, scores clamp at 0, red "-X" flash displayed within 0.5s.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T055 [P] Verify all acceptance scenarios from spec.md pass via manual playtest (document results in `specs/010-persistent-puck-growth/checklists/`)
- [x] T056 [P] Run `pnpm typecheck` and fix any remaining type errors across all modified files
- [x] T057 [P] Run `pnpm test` and fix any failing unit/integration tests
- [x] T058 Run quickstart.md validation: full 4-player 5-round game with persistent pucks and growth mechanics
- [x] T059 Performance check: confirm 60 fps with 20 persistent pucks on board (mid-range device target)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 type changes (T001–T007)
- **Phase 3 (US1)**: Depends on Phase 2 (board fix is the foundation)
- **Phase 4 (US4)**: Depends on Phase 2 — independent of US1/US3/US5
- **Phase 5 (US5)**: Depends on Phase 2 — independent of US4
- **Phase 6 (US3)**: Depends on Phase 2 — independent of all other stories
- **Phase 7 (US2)**: Depends on Phase 5 (persistent pucks required for growth contacts)
- **Phase 8 (Revocable Scoring)**: Depends on Phase 5 (persistent pucks) and Phase 7 (growth displacement)
- **Phase 9 (Polish)**: Depends on all previous phases

### User Story Dependencies

```
Phase 2 (Foundation: 8-row board fix)
   │
   ├── US1 (Phase 3) — validates fixed board
   ├── US4 (Phase 4) — shove zone config ──────────────────────┐
   ├── US3 (Phase 6) — multiplier reset (independent) ────────┤
   └── US5 (Phase 5) — persistent pucks ──┐                    │
                                            │                    │
                                            ▼                    │
                                    US2 (Phase 7) — growth ─────┤
                                            │                    │
                                            ▼                    │
                                 Revocable Scoring (Phase 8) ───┤
                                                                 │
                                                                 ▼
                                                        Polish (Phase 9)
```

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Core logic before integration wiring
3. Audio/visual effects after core logic

### Parallel Opportunities

- **Phase 1**: T001–T007 modify different sections of different files — T001/T002/T003 can be batched (same file), T004 separate file, T005 separate file, T006/T007 separate files
- **Phase 2**: T008 and T009 (tests) run in parallel; T010 and T011 are sequential
- **Phase 4**: Runs in parallel with Phase 3 and Phase 5 (independent stories)
- **Phase 6**: Runs in parallel with Phases 3–5 (independent story)
- **Phase 7**: T023–T030 (all tests) run in parallel; T031–T033 (puck-growth.ts functions) are sequential; T041 (audio) runs in parallel with T038/T039 (rendering)
- **Phase 8**: T044–T047 (all tests) run in parallel; T048/T049 independent implementations in parallel

---

## Parallel Example: User Story 2 (Phase 7)

```
# Step 1 — Write all tests in parallel (they will all fail):
T023: computeGrownRadius() basic test
T024: computeGrownRadius() cap test
T025: computeGrownRadius() at-cap test
T026: processGrowthQueue() cross-player rejection
T027: processGrowthQueue() chain depth cap
T028: processGrowthQueue() both pucks grow
T029: resizePuckFixture() fixture replacement
T030: one-at-cap growth test

# Step 2 — Implement core growth logic (sequential):
T031: computeGrownRadius()
T032: resizePuckFixture()
T033: processGrowthQueue()

# Step 3 — Integrate with physics (sequential):
T034: Contact listener extension
T035: processGrowthQueue() in step()
T036: StepResult extension

# Step 4 — Visual + audio in parallel:
T038 + T041: GrowthPopEffect type + playPuckGrowth() synth (parallel — different files)
T039 + T042: Renderer animation + audio routing (parallel — different files)

# Step 5 — Wire into main.ts (sequential):
T037: Render state radius
T040: Growth effect wiring
T043: Growth sound wiring
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 4 + 5 + 3)

1. Complete Phase 1: Setup (type/config additions)
2. Complete Phase 2: Foundational (8-row board fix)
3. Complete Phase 3: US1 (validate fixed board)
4. Complete Phases 4–6: US4, US5, US3 (can be parallelized)
5. **STOP and VALIDATE**: Board is fixed, pucks persist, multiplier resets, shove zone correct
6. Deploy/demo basic persistent-puck experience

### Full Feature (Add Growth + Revocable Scoring)

7. Complete Phase 7: US2 (same-player growth — the headline mechanic)
8. Complete Phase 8: Revocable scoring (knock-out penalty)
9. Complete Phase 9: Polish & cross-cutting validation

### Incremental Delivery

1. Setup + Foundation → Fixed board ready
2. US1 + US4 + US5 + US3 → Persistent pucks with correct scoring and shove zone
3. US2 → Growth mechanic with pop animation and sound
4. Revocable scoring → Score knock-out penalty with negative flash
5. Each increment is independently testable and shippable

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story
- Each user story independently completable and testable
- Tests MUST fail before implementation (Red-Green-Refactor per constitution)
- Commit after each task or logical group
- Growth logic (puck-growth.ts) is a new file — no merge conflicts with existing code
- No new npm dependencies — all implementation uses existing Planck.js, Web Audio API, Canvas 2D
