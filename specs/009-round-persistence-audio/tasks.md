# Tasks: Round Persistence & Audio Tuning

**Input**: Design documents from `/specs/009-round-persistence-audio/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required per Constitution Principle V (Test-First for Game Logic). Visual/rendering code is exempt from TDD but must have manual test scenarios.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)
- Exact file paths included in descriptions

---

## Phase 1: Setup

**Purpose**: Contract and type updates that establish the new interfaces

- [x] T001 Add `bounceMultiplier: number` field to `PuckBody` interface in src/physics/board-builder.ts
- [x] T002 Add `rebuildBoard(config: GameConfig): void` and `getAllPucks(): PuckBody[]` to `PhysicsSimulation` interface in src/types/contracts.ts
- [x] T003 [P] Add `ScoreDeltaEffect` interface to src/rendering/effects.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on — `rebuildBoard()` implementation and bounce multiplier stamping

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational

- [x] T004 [P] Write unit test: `rebuildBoard()` destroys old pins and creates new pins while preserving puck bodies in tests/unit/rebuild-board.test.ts
- [x] T005 [P] Write unit test: `rebuildBoard()` destroys and recreates bucket walls, recomputes shoveZoneY, and rebuilds BucketDetector in tests/unit/rebuild-board.test.ts
- [x] T006 [P] Write unit test: `rebuildBoard()` wakes all puck bodies after pin replacement in tests/unit/rebuild-board.test.ts
- [x] T007 [P] Write unit test: `getAllPucks()` returns current board.pucks array in tests/unit/rebuild-board.test.ts
- [x] T008 [P] Write unit test: `bounceMultiplier` defaults to 1.0 on puck creation in tests/unit/bounce-multiplier.test.ts
- [x] T009 [P] Write unit test: `bounceMultiplier` is stamped from `ScoreBreakdown.multiplier` when puck settles in tests/unit/bounce-multiplier.test.ts

### Implementation

- [x] T010 Implement `rebuildBoard(config)` method in src/physics/simulation.ts — destroy old pins/bucketWalls, create new pins and bucket dividers from config, recompute shoveZoneY, rebuild BucketDetector, wake all pucks
- [x] T011 Implement `getAllPucks()` method in src/physics/simulation.ts — return board.pucks array
- [x] T012 Initialize `bounceMultiplier: 1.0` in puck creation site in src/physics/simulation.ts (dropPuck method)
- [x] T013 Stamp `puckBody.bounceMultiplier = scoreBreakdown.multiplier` at settlement in src/main.ts (after calculateRoundScore call)

**Checkpoint**: `rebuildBoard()` and `getAllPucks()` working, bounce multiplier persisted on pucks. All T004–T009 tests pass.

---

## Phase 3: User Story 1 — Pucks Persist Between Rounds (Priority: P1) 🎯 MVP

**Goal**: Pucks remain on the board across round transitions as collidable objects. Only cleared at tie-breaker / play-again / new-players.

**Independent Test**: Play a 3-round, 2-player game. Verify pucks from round 1 are visible and collidable in rounds 2 and 3.

### Tests for User Story 1

- [x] T014 [P] [US1] Write unit test: pucks are NOT cleared during round transition in tests/unit/puck-persistence.test.ts
- [x] T015 [P] [US1] Write unit test: pucks ARE cleared on tie-breaker start in tests/unit/puck-persistence.test.ts
- [x] T016 [P] [US1] Write unit test: pucks ARE cleared on play-again and new-players in tests/unit/puck-persistence.test.ts
- [x] T017 [P] [US1] Write unit test: puckStyleMap entries persist across round transitions in tests/unit/puck-persistence.test.ts
- [x] T018 [P] [US1] Write integration test: full 2-round, 2-player game where pucks from round 1 remain collidable in round 2 in tests/integration/round-transition.test.ts

### Implementation

- [x] T019 [US1] Remove `sim.clearPucks()` call from `transitionToNextRound()` in src/main.ts
- [x] T020 [US1] Remove `puckStyleMap.clear()` call from `transitionToNextRound()` in src/main.ts
- [x] T021 [US1] Replace `sim.createWorld(config)` with `sim.rebuildBoard(config)` in `transitionToNextRound()` in src/main.ts
- [x] T022 [US1] Ensure `sim.clearPucks()` and `puckStyleMap.clear()` are still called in tie-breaker, play-again, and new-players flows in src/main.ts
- [x] T023 [US1] Verify `rebuildRenderData()` correctly reflects persistent pucks in render state construction in src/main.ts

**Checkpoint**: Pucks persist across rounds. Tie-breaker/play-again/new-players still clear pucks. T014–T018 tests pass.

---

## Phase 4: User Story 2 — Pin Randomization Only Before Player 1's Turn (Priority: P2)

**Goal**: Pin layout re-randomizes only at round boundaries (before P1's turn). All players within a round face the same layout.

**Independent Test**: Play a 2-player, 2-round game. Both players in round 1 see the same pins. Pins change at round 2 start.

### Tests for User Story 2

- [x] T024 [P] [US2] Write unit test: pin layout does NOT change between turns within the same round in tests/unit/pin-randomization.test.ts
- [x] T025 [P] [US2] Write unit test: pin layout DOES change at round boundary (before new round starts) in tests/unit/pin-randomization.test.ts
- [x] T026 [P] [US2] Write unit test: game initialization generates randomized pin layout before first turn in tests/unit/pin-randomization.test.ts

### Implementation

- [x] T027 [US2] Move `randomizeLayout()` call to occur only at round boundaries in `transitionToNextRound()` — verify it is NOT called between individual player turns within a round in src/main.ts
- [x] T028 [US2] Verify `randomizeLayout()` is called during game initialization (`startGame()`) before the first turn in src/main.ts

**Checkpoint**: Pin layout stable within rounds, changes between rounds. T024–T026 tests pass.

---

## Phase 5: User Story 3 — Automatic Puck Repositioning After Pin Relocation (Priority: P3)

**Goal**: After pin relocation, overlapping pucks are pushed to stable positions via animated physics settling. Scores are recalculated preserving original bounce multipliers. Floating score delta indicators show changes.

**Independent Test**: Play a multi-round game with pucks settled near where new pins land. Verify pucks animate to new positions, scores update, and delta indicators appear.

### Tests for User Story 3

- [x] T029 [P] [US3] Write unit test: displaced pucks (overlapping new pins) have `isSettled` reset to false and `settledInBucket` reset to null in tests/unit/puck-settling.test.ts
- [x] T030 [P] [US3] Write unit test: after physics stepping, displaced pucks reach stable positions with no pin overlaps in tests/unit/puck-settling.test.ts
- [x] T031 [P] [US3] Write unit test: score recalculation uses `puck.bounceMultiplier × bucketScores[newBucket]` for each settled puck in tests/unit/puck-settling.test.ts
- [x] T032 [P] [US3] Write unit test: puck that falls off-board during repositioning is removed with score set to 0 in tests/unit/puck-settling.test.ts
- [x] T033 [P] [US3] Write unit test: `recalculateAllScores()` returns correct per-player totals from all settled pucks in tests/unit/puck-settling.test.ts
- [x] T034 [P] [US3] Write integration test: full round transition with puck displacement → settling → score recalculation → delta indicators in tests/integration/round-transition.test.ts

### Implementation

- [x] T035 [US3] Implement `detectDisplacedPucks(board, config)` function in src/physics/puck-settler.ts — distance check each puck against new pin positions, return list of displaced puck IDs
- [x] T036 [US3] Implement `prepareSettling(board, displacedPuckIds)` function in src/physics/puck-settler.ts — reset `isSettled` and `settledInBucket` on displaced pucks, wake them
- [x] T037 [US3] Implement `recalculateAllScores(pucks, bucketScores, players)` helper in src/core/scoring.ts — iterate all settled pucks, compute `bucketScores[bucket] × puck.bounceMultiplier`, sum per player, return map of playerId → newScore
- [x] T038 [US3] Integrate settling phase into `transitionToNextRound()` in src/main.ts — after `rebuildBoard()`: detect displaced pucks, call `prepareSettling()`, enter a settling loop (game loop continues stepping physics until all pucks re-settle)
- [x] T039 [US3] Add settling-phase state management in src/main.ts — introduce a `settling` flag that prevents starting the next turn until all pucks are settled, handle the settling→ready transition
- [x] T040 [US3] After all pucks settle, compare old vs new bucket assignments and call `recalculateAllScores()` in src/main.ts — update player scores on session and scoreboard
- [x] T041 [US3] Implement `addScoreDelta(x, y, deltaText, color)` method and `renderScoreDeltas()` in src/rendering/effects.ts — following ScorePopEffect pattern with float-up + fade-out animation (~1200ms)
- [x] T042 [US3] Trigger `effects.addScoreDelta()` for each puck whose bucket assignment changed during repositioning in src/main.ts — pass puck world position, formatted delta text ("+X" / "−X"), and player puck color

**Checkpoint**: Displaced pucks animate to new positions, scores recalculated with preserved multipliers, delta indicators visible. T029–T034 tests pass.

---

## Phase 6: User Story 4 — Music Volume at 30% of SFX (Priority: P4)

**Goal**: Music volume is exactly 30% of SFX volume (0.7 × 0.30 = 0.21).

**Independent Test**: Start game, verify music is audibly quieter than SFX at the 30% ratio.

### Tests for User Story 4

- [x] T043 [P] [US4] Write unit test: music default volume is exactly `0.7 × 0.30 = 0.21` in tests/unit/audio-volume.test.ts

### Implementation

- [x] T044 [US4] Change default music volume from `0.3` to `0.21` in src/audio/music-manager.ts

**Checkpoint**: Music at 30% of SFX volume. T043 test passes.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge cases, and integration confidence

- [x] T045 [P] Write integration test: tie-breaker clears all persistent pucks and starts fresh in tests/integration/round-transition.test.ts
- [x] T046 [P] Write integration test: play-again resets board completely (no leftover pucks) in tests/integration/round-transition.test.ts
- [x] T047 Run `npm test` — all unit and integration tests pass
- [x] T048 Run `npx playwright test` — all e2e tests pass (no regressions)
- [x] T049 Manual test: play a 3-round, 2-player game, verify puck persistence, pin re-randomization at round boundaries, settling animation, score deltas, and music volume
- [x] T050 Run quickstart.md validation — verify setup instructions work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2)
- **US2 (Phase 4)**: Depends on Foundational (Phase 2). Can run in parallel with US1.
- **US3 (Phase 5)**: Depends on US1 (Phase 3) AND US2 (Phase 4) — needs puck persistence + pin rebuild
- **US4 (Phase 6)**: Depends on Foundational (Phase 2) only. Can run in parallel with US1/US2/US3.
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational → no dependencies on other stories
- **US2 (P2)**: After Foundational → no dependencies on other stories (can parallel with US1)
- **US3 (P3)**: After US1 + US2 → needs persistent pucks AND rebuildBoard
- **US4 (P4)**: After Foundational → fully independent, can parallel with everything

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution V)
- Type/model changes before service/logic
- Core logic before orchestration (main.ts)
- Visual effects after logic is working
- Story complete before moving to next priority (unless parallelizing)

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can all run in parallel (different files)
- **Phase 2**: T004–T009 (all tests) can run in parallel; T010–T013 sequential
- **Phase 3**: T014–T018 (tests) can run in parallel
- **Phase 4**: T024–T026 (tests) can run in parallel
- **Phase 5**: T029–T034 (tests) can run in parallel
- **Phase 6**: T043 independent
- **US1, US2, US4 can proceed in parallel** after Foundational completes
- **US3 must wait for US1 + US2**

---

## Parallel Example: After Foundational

```bash
# Three stories can start simultaneously:
# Developer A: US1 (puck persistence)
Task: T014–T018 (tests) → T019–T023 (implementation)

# Developer B: US2 (pin randomization timing)
Task: T024–T026 (tests) → T027–T028 (implementation)

# Developer C: US4 (music volume)
Task: T043 (test) → T044 (implementation)

# After US1 + US2 complete, US3 can begin:
Task: T029–T034 (tests) → T035–T042 (implementation)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (contracts + types)
2. Complete Phase 2: Foundational (rebuildBoard + bounceMultiplier)
3. Complete Phase 3: US1 (puck persistence)
4. **STOP and VALIDATE**: Pucks persist, game playable
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Pucks persist → Test independently (MVP!)
3. US2 → Pin randomization timing → Test independently
4. US3 → Auto repositioning + score deltas → Test independently
5. US4 → Music volume → Test independently
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Constitution V requires tests before implementation for all game logic
- Rendering tasks (T041 score delta rendering) are exempt from TDD — manual test in T049
- Commit after each task or logical group
- Total: 50 tasks across 7 phases
