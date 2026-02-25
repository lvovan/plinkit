# Tasks: Puck Rotation & Friction Physics

**Input**: Design documents from `/specs/004-puck-rotation-friction/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required — Constitution Principle V mandates test-first for game logic.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Type Definitions & Configuration)

**Purpose**: Extend interfaces and config defaults so all downstream code compiles

- [X] T001 [P] Add `angularDamping` and `maxAngularVelocity` fields to `PhysicsConfig` interface in `src/types/index.ts`
- [X] T002 [P] Add `shoveOffsetFraction` field to `ShoveConfig` interface in `src/types/index.ts`
- [X] T003 [P] Add `angle: number` field to `RenderState.pucks[]` in `src/types/contracts.ts`
- [X] T004 Update `DEFAULT_PHYSICS_CONFIG` in `src/config/game-config.ts`: set `puckFriction: 0.4`, `pinFriction: 0.3`, add `angularDamping: 3.0`, `maxAngularVelocity: 12.57`
- [X] T005 Add `shoveOffsetFraction: 0.25` to `DEFAULT_SHOVE_CONFIG` in `src/config/game-config.ts`

---

## Phase 2: Foundational (Snapshot → Render Pipeline)

**Purpose**: Wire angle through the data pipeline so rendering can consume it. MUST complete before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Pass `angle: p.angle` in the snapshot-to-RenderState mapping in `src/main.ts` (line ~339)

**Checkpoint**: Types compile, angle flows from physics snapshot to render state. All existing tests still pass.

---

## Phase 3: User Story 1 — Puck Rotation on Pin Contact (Priority: P1) 🎯 MVP

**Goal**: Pucks spin on pin contact with friction-driven torque and angular damping decay

**Independent Test**: Drop a puck off-center so it grazes pins. Pattern rotates visibly.

### Tests for User Story 1 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US1] Add rotation test: puck created with `fixedRotation: false` in `tests/unit/physics/simulation.test.ts`
- [X] T008 [P] [US1] Add rotation test: puck hitting left side of pin gains positive angular velocity in `tests/unit/physics/simulation.test.ts`
- [X] T009 [P] [US1] Add rotation test: puck hitting right side of pin gains negative angular velocity in `tests/unit/physics/simulation.test.ts`
- [X] T010 [P] [US1] Add damping test: spinning puck's angular velocity decays toward zero over ~60 steps in `tests/unit/physics/simulation.test.ts`
- [X] T011 [P] [US1] Add angular velocity cap test: puck angular velocity never exceeds `maxAngularVelocity` after step in `tests/unit/physics/simulation.test.ts`
- [X] T012 [P] [US1] Add determinism test: same drop position produces same final angle across 10 runs in `tests/unit/physics/determinism.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Change `fixedRotation: true` to `false` and add `angularDamping` from config in puck body creation in `src/physics/simulation.ts` (line ~62)
- [X] T014 [US1] Add angular velocity clamping loop after `world.step()` in `src/physics/simulation.ts` `step()` method
- [X] T015 [US1] Verify all T007–T012 tests pass after implementation

**Checkpoint**: Pucks rotate on pin contact, spin decays, velocity is capped. Existing tests pass (SC-004).

---

## Phase 4: User Story 2 — Puck-Puck Friction & Spin Transfer (Priority: P2)

**Goal**: Friction transfers angular momentum between colliding pucks; shoves induce small spin

**Independent Test**: Drop a puck onto a settled puck; both show spin changes. Shove a puck; it gains spin.

### Tests for User Story 2 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation**

- [X] T016 [P] [US2] Add test: two colliding pucks exchange angular velocity in `tests/unit/physics/simulation.test.ts`
- [X] T017 [P] [US2] Add test: shove with `shoveOffsetFraction > 0` produces angular velocity on puck in `tests/unit/physics/shove.test.ts`
- [X] T018 [P] [US2] Add test: shove at center (`shoveOffsetFraction = 0`) produces zero angular velocity in `tests/unit/physics/shove.test.ts`

### Implementation for User Story 2

- [X] T019 [US2] Modify `applyShove()` in `src/physics/simulation.ts` to apply impulse at off-center point using `shoveOffsetFraction` from config (line ~113)
- [X] T020 [US2] Verify all T016–T018 tests pass after implementation

**Checkpoint**: Puck-puck spin transfer works via friction. Shoves add spin. Existing tests pass.

---

## Phase 5: User Story 3 — Visual Rotation Rendering (Priority: P3)

**Goal**: Puck patterns rotate visually to match the physics angle

**Independent Test**: Drop a "stripes" puck; observe stripe lines tilting as the puck spins.

### Tests for User Story 3 ⚠️

> **Write these tests FIRST, ensure they FAIL before implementation**

- [X] T021 [P] [US3] Add test: `RenderState.pucks[].angle` is present and matches snapshot angle in `tests/integration/game-session.test.ts`

### Implementation for User Story 3

- [X] T022 [US3] Refactor `drawPuckPattern()` in `src/rendering/renderer.ts` to accept `angle` parameter and apply `ctx.translate(cx, cy) + ctx.rotate(angle)` transform before drawing patterns
- [X] T023 [US3] Update puck drawing loop in `drawFrame()` in `src/rendering/renderer.ts` to pass `puck.angle` to `drawPuckPattern()`
- [X] T024 [US3] Ensure ghost puck (dropIndicator) in `src/rendering/renderer.ts` renders with angle hardcoded to `0`
- [X] T025 [US3] Verify T021 test passes and manual visual test with "stripes" pattern shows rotation

**Checkpoint**: All three user stories complete. Patterns visually rotate. Ghost puck stays fixed.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression validation, determinism, and cleanup

- [X] T026 Run full test suite (`npm run test`) and verify all existing + new tests pass (SC-004)
- [X] T027 Run determinism verification: same inputs → same final angle across 10 runs (SC-005)
- [X] T028 Run `npm run typecheck` and `npm run lint` — fix any errors
- [X] T029 Run quickstart.md manual testing scenario to validate visual rotation behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001–T003 for types) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — core rotation physics
- **User Story 2 (Phase 4)**: Depends on Phase 3 (rotation must work before friction transfer matters)
- **User Story 3 (Phase 5)**: Depends on Phase 2 (needs `angle` in RenderState), can start in parallel with US1/US2 for rendering prep
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Core — must complete first. Enables rotation physics.
- **US2 (P2)**: Depends on US1 — puck-puck friction and shove spin rely on rotation being enabled.
- **US3 (P3)**: Can partially overlap with US1/US2 — rendering changes are independent files, but visual verification requires physics to work.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution Principle V)
- Implementation follows test definitions
- Verify all tests pass before marking story complete

### Parallel Opportunities

**Phase 1** (all [P]):
```
T001 (PhysicsConfig types) | T002 (ShoveConfig types) | T003 (RenderState types)
→ Then T004, T005 (config defaults — depend on types)
```

**Phase 3 tests** (all [P]):
```
T007 | T008 | T009 | T010 | T011 | T012 — all test files, no implementation deps
```

**Phase 4 tests** (all [P]):
```
T016 | T017 | T018 — different test files/scenarios
```

**Across stories** (limited):
```
US3 rendering (T022–T024) can be coded in parallel with US1/US2 physics,
but visual verification requires US1 physics to be working.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Type definitions and config
2. Complete Phase 2: Wire angle through pipeline
3. Complete Phase 3: Rotation on pin contact
4. **STOP and VALIDATE**: Drop pucks, observe spin — MVP is playable
5. Total: T001–T015 (15 tasks)

### Incremental Delivery

1. Setup + Foundational → Types compile, pipeline wired
2. Add US1 → Pucks rotate on pin hits → **MVP playable**
3. Add US2 → Puck-puck spin transfer + shove spin → Physics complete
4. Add US3 → Visual rotation rendering → Feature complete
5. Polish → Full regression validation

### Total Task Count

| Phase | Tasks | Parallel |
|-------|-------|----------|
| Setup | 5 | 3 parallel (T001–T003) |
| Foundational | 1 | — |
| US1 (tests + impl) | 9 | 6 parallel tests |
| US2 (tests + impl) | 5 | 3 parallel tests |
| US3 (tests + impl) | 5 | 1 parallel test |
| Polish | 4 | — |
| **Total** | **29** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to user story for traceability
- Constitution Principle V requires TDD — all tests written before implementation
- FR-010 (pin layout) and FR-011 (drop position) are preservation requirements — no tasks needed, validated by existing tests
- FR-013 (scoring unchanged) — no tasks needed, validated by existing scoring tests
- Friction values (puckFriction: 0.4, pinFriction: 0.3) are starting points — may need tuning during playtesting
- Commit after each task or logical group
