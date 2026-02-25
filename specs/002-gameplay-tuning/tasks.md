# Tasks: Gameplay Tuning — Board Layout, Particles & Out-of-Bounds

**Input**: Design documents from `/specs/002-gameplay-tuning/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-modules.md, quickstart.md

**Tests**: Included — the project constitution (Principle V) requires test-first for all game logic. Visual changes (particles) are exempt from TDD.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: No project setup needed — this is an existing codebase. Skip to Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions and configuration changes that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Add `OutOfBoundsEvent` interface and extend `PhysicsStepResult` with `outOfBoundsPucks: OutOfBoundsEvent[]` in `src/types/contracts.ts`
- [x] T002 Add `showOutOfBounds(): void` to `UIOverlayManager` interface in `src/types/contracts.ts`
- [x] T003 [P] Update `DEFAULT_BOARD_LAYOUT` in `src/config/game-config.ts`: `pinRows: 6`, `bucketCount: 5`, `pinSpacing: 2.0`, `puckRadius: 0.5`, `bucketScores: [100, 1000, 10000, 1000, 100]`
- [x] T004 Update `DEFAULT_SHOVE_CONFIG.shoveZoneRowLimit` from 9 to 5 in `src/config/game-config.ts`
- [x] T005 [P] Fix pin stagger bug: remove `rowOffset` variable and `+ rowOffset` from position calculation in `computePinPositions()` in `src/config/board-geometry.ts`

**Checkpoint**: Foundation ready — types extended, config updated, stagger fixed. User story implementation can begin.

---

## Phase 3: User Story 1 — Out-of-Bounds Puck Ends the Round (Priority: P1) 🎯 MVP

**Goal**: Detect pucks escaping above the top edge and end the round with 0 points + notification

**Independent Test**: Launch a puck with extreme upward force → puck flies off top → "Out of Bounds" notification → round ends with 0 points → game continues normally

### Tests for User Story 1

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Write unit test: puck above top boundary for 30+ ticks triggers OOB event in `tests/unit/physics/simulation.test.ts`
- [x] T007 [P] [US1] Write unit test: puck above top boundary for <30 ticks does NOT trigger OOB (grace period) in `tests/unit/physics/simulation.test.ts`
- [x] T008 [P] [US1] Write unit test: puck that returns below boundary within grace period resets OOB timer in `tests/unit/physics/simulation.test.ts`
- [x] T009 [P] [US1] Write unit test: OOB event includes correct puckId and last position in `tests/unit/physics/simulation.test.ts`
- [x] T010 [P] [US1] Write integration test: OOB round completes with 0 score and game advances to next turn in `tests/integration/game-session.test.ts`

### Implementation for User Story 1

- [x] T011 [US1] Add `oobTimers: Map<string, number>` and OOB detection logic in `step()` of `src/physics/simulation.ts` — check `pos.y > boardHeight/2 + puckRadius`, 30-tick grace period, emit `OutOfBoundsEvent`
- [x] T012 [US1] Clear OOB timers in `clearPucks()` and `destroy()` methods of `src/physics/simulation.ts`
- [x] T013 [US1] Implement `showOutOfBounds()` in `src/ui/overlay-manager.ts` — transient "Out of Bounds" overlay, auto-dismiss after ~2 seconds
- [x] T014 [US1] Handle `result.outOfBoundsPucks` in game loop `onStep()` in `src/main.ts` — call `stateMachine.completeTurn()` with `scoreEarned: 0`, call `overlays.showOutOfBounds()`, advance to next turn

**Checkpoint**: Out-of-bounds detection fully functional. Pucks flying off the top edge end the round with 0 points and a notification.

---

## Phase 4: User Story 2 — Halved Pin Count with Staggered Layout (Priority: P2)

**Goal**: Board displays 6 rows of staggered pins with proper half-spacing offset

**Independent Test**: Start a game → visually confirm 6 pin rows → verify odd rows are offset from even rows → drop pucks and confirm varied landing buckets

### Tests for User Story 2

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US2] Write unit test: `computePinPositions()` with new config returns exactly 6 rows of pins in `tests/unit/physics/board-builder.test.ts`
- [x] T016 [P] [US2] Write unit test: no two consecutive pin rows have vertically aligned pins (stagger verification) in `tests/unit/physics/board-builder.test.ts`
- [x] T017 [P] [US2] Write unit test: even rows have 5 pins and odd rows have 4 pins with new config in `tests/unit/physics/board-builder.test.ts`

### Implementation for User Story 2

- [x] T018 [US2] Update `BoardBuilder.build()` pin count assertion in `tests/unit/physics/board-builder.test.ts` to expect new total pin count (5+4+5+4+5+4 = 27 pins)

**Checkpoint**: Board displays 6 staggered pin rows. Config values from Phase 2 flow through existing `computePinPositions()` and `BoardBuilder` without additional code changes.

---

## Phase 5: User Story 3 — Reduced Bucket Count (Priority: P2)

**Goal**: Board displays 5 scoring buckets with symmetric scores [100, 1000, 10000, 1000, 100]

**Independent Test**: Start a game → visually confirm 5 buckets → land pucks in each bucket → verify correct scores awarded

### Tests for User Story 3

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T019 [P] [US3] Write unit test: `computeBucketBoundaries()` returns 5 buckets with correct scores in `tests/unit/physics/board-builder.test.ts`
- [x] T020 [P] [US3] Write unit test: `ScoringEngine.getScoreForBucket()` returns correct values for 5-bucket layout in `tests/unit/core/scoring.test.ts`
- [x] T021 [P] [US3] Write unit test: bucket scores are symmetric (index i == index bucketCount-1-i) in `tests/unit/core/scoring.test.ts`

### Implementation for User Story 3

- [x] T022 [US3] Update existing scoring tests that hardcode 9-bucket expectations to use new 5-bucket config in `tests/unit/core/scoring.test.ts`

**Checkpoint**: 5 buckets with symmetric scores. Config values from Phase 2 flow through existing `computeBucketBoundaries()` and `ScoringEngine` without additional code changes.

---

## Phase 6: User Story 4 — Adjusted Puck Size (Priority: P2)

**Goal**: Puck radius scaled to 0.5 to match doubled pin spacing

**Independent Test**: Start a game → drop puck → visually confirm puck is proportionally sized → confirm it collides with pins naturally

### Implementation for User Story 4

- [x] T023 [US4] Verify puck radius 0.5 flows through `BoardBuilder.build()` and `dropPuck()` in `src/physics/board-builder.ts` and `src/physics/simulation.ts` — run existing tests to confirm physics work with new size

**Checkpoint**: Puck radius 0.5 applied via config. All physics interactions work correctly with the larger puck. No code changes required beyond Phase 2 config.

---

## Phase 7: User Story 5 — Reduced Collision Particle Effects (Priority: P3)

**Goal**: Pin-hit particle count reduced from 6 to 3 per collision

**Independent Test**: Start a game → drop puck → watch pin collisions → sparks are subtle (2-3 particles), still visible

### Implementation for User Story 5

- [x] T024 [US5] Change `PARTICLE_CONFIG.pinHit.count` from 6 to 3 in `src/rendering/particles.ts`

**Checkpoint**: Pin-hit effects produce 3 particles — visually subtle but clearly visible. No tests required (visual rendering exempt per constitution Principle V).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all stories

- [x] T025 [P] Run full unit test suite (`npm run test:unit`) and fix any failures from updated config values
- [x] T026 [P] Run integration test suite (`npm run test:integration`) and fix any failures
- [x] T027 Run quickstart.md manual verification steps (board layout, stagger, puck size, OOB, particles)
- [x] T028 Run TypeScript type check (`npm run typecheck`) — ensure no type errors from contract changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No dependencies — can start immediately. **BLOCKS all user stories.**
- **Phase 3 (US1 — OOB)**: Depends on Phase 2 (needs `OutOfBoundsEvent` type and `showOutOfBounds` interface)
- **Phase 4 (US2 — Pins)**: Depends on Phase 2 (needs updated `DEFAULT_BOARD_LAYOUT` and stagger fix)
- **Phase 5 (US3 — Buckets)**: Depends on Phase 2 (needs updated `DEFAULT_BOARD_LAYOUT`)
- **Phase 6 (US4 — Puck)**: Depends on Phase 2 (needs updated `puckRadius` in config)
- **Phase 7 (US5 — Particles)**: Independent — can run in parallel with any phase
- **Phase 8 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (OOB)**: Independent of US2–US5. Can be the MVP increment.
- **US2 (Pins)**: Independent. Config values drive all changes.
- **US3 (Buckets)**: Independent. Config values drive all changes.
- **US4 (Puck)**: Independent. Config values drive all changes.
- **US5 (Particles)**: Fully independent. One constant change.
- **US2, US3, US4** share config changes in Phase 2 but have no cross-dependencies.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (US1, US2, US3)
- US4 and US5 have no new logic requiring test-first (config/constant changes only)

### Parallel Opportunities

After Phase 2 completes, all user stories (Phases 3–7) can proceed in parallel:

```
Phase 2 (Foundation) ─┬─→ Phase 3 (US1: OOB)         ─┐
                      ├─→ Phase 4 (US2: Pins)         ─┤
                      ├─→ Phase 5 (US3: Buckets)      ─┼─→ Phase 8 (Polish)
                      ├─→ Phase 6 (US4: Puck)         ─┤
                      └─→ Phase 7 (US5: Particles)    ─┘
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (config + types + stagger fix)
2. Complete Phase 3: User Story 1 (OOB detection)
3. **STOP and VALIDATE**: Test OOB independently — puck off top = 0 points + notification
4. Game is now resilient to pucks escaping the board

### Incremental Delivery

1. Phase 2 → Foundation ready
2. Phase 3 (US1: OOB) → MVP — game handles escaped pucks
3. Phases 4+5+6 (US2+US3+US4: Board layout) → Board redesigned with fewer, larger elements
4. Phase 7 (US5: Particles) → Visual polish
5. Phase 8 → Final validation
6. Each story adds value without breaking previous stories

---

## Notes

- **28 total tasks** across 8 phases
- Tasks per user story: US1=9, US2=4, US3=4, US4=1, US5=1, Foundational=5, Polish=4
- US2, US3, and US4 require minimal code changes because the foundational config update (Phase 2) drives all behavior through existing abstractions
- The stagger bug fix (T005) is included in Phase 2 as it affects all board layouts and is a prerequisite for correct pin arrangement
- `[P]` marked tasks within the same phase can run in parallel
- All test tasks are `[P]` within their phase since they write to the same file but different `describe`/`it` blocks
