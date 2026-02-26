# Tasks: Graphics Overhaul — Wood Theme & Visual Polish

**Input**: Design documents from `/specs/011-graphics-overhaul/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included for game-logic changes (contact point extraction, bucket width config) per Constitution Principle V. Visual/rendering changes are exempt from automated tests but have manual test scenarios.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration constants and type changes that multiple user stories depend on

- [x] T001 Add `BUCKET_DIVIDER_WIDTH = 0.3` constant to `src/config/board-geometry.ts`
- [x] T002 Add `contactX` and `contactY` fields to `CollisionEvent` interface in `src/types/contracts.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New module and config changes that user stories build upon

**⚠️ CRITICAL**: US1 depends on T003; US5 depends on T004

- [x] T003 Create `src/rendering/wood-pattern.ts` — `WoodPatternGenerator` class with `OffscreenCanvas`, `generate(width, height)` method producing procedural wood-grain (vertical gradient base `#5C3A1E`→`#8B5E3C`→`#A97B50`, 200–400 randomised horizontal grain lines at alpha 0.03–0.12, 2–4 radial-gradient knots), and `getCanvas()` accessor
- [x] T004 [P] Update `bucketWidths` from `[0.25, 0.20, 0.10, 0.20, 0.25]` to `[0.20, 0.20, 0.20, 0.20, 0.20]` in `src/config/game-config.ts`
- [x] T005 [P] Write unit test verifying bucket width fractions sum to 1.0 and all five equal 0.20 in `tests/unit/config/bucket-widths.test.ts`

**Checkpoint**: Wood pattern module exists, bucket config updated, shared constants/types ready

---

## Phase 3: User Story 1 — Wood-Themed Board (Priority: P1) 🎯 MVP

**Goal**: Replace solid navy board background with procedural wood-grain pattern

**Independent Test**: Launch game → board area displays warm wood-grain pattern; pegs, pucks, labels remain distinguishable

### Implementation for User Story 1

- [x] T006 [US1] Instantiate `WoodPatternGenerator` in `CanvasRenderer` constructor and call `generate()` on init and resize in `src/rendering/renderer.ts`
- [x] T007 [US1] Replace the board fill rectangle (`ctx.fillStyle = '#16213e'; ctx.fillRect(...)`) with `ctx.drawImage(woodCanvas, ...)` in the `drawFrame()` method of `src/rendering/renderer.ts`
- [x] T008 [US1] Verify peg contrast against wood background — adjust peg fill/stroke colours if needed for WCAG AA non-text contrast (3:1) in `src/rendering/renderer.ts`

**Checkpoint**: Board displays wood-grain pattern. All other elements still render correctly. US1 independently testable.

---

## Phase 4: User Story 5 — Bucket Width Redistribution (Priority: P3)

**Goal**: All five buckets occupy equal 20% of board width

**Independent Test**: Launch game → visually confirm all five buckets are equal width; score labels centred and legible

> **Note**: Moved ahead of US2/US3 because it was completed in Phase 2 (T004/T005). This phase is a verification checkpoint only.

### Implementation for User Story 5

- [x] T009 [US5] Verify score labels render correctly at new equal bucket widths — adjust font sizing logic in bucket label drawing section of `src/rendering/renderer.ts` if labels overflow or appear misaligned

**Checkpoint**: All five buckets equal width, labels legible. US5 independently testable.

---

## Phase 5: User Story 2 — Thicker Wood-Style Dividers (Priority: P2)

**Goal**: Dividers appear as thick wooden posts with matching physics bodies

**Independent Test**: Start game → dividers appear as visible wooden posts; puck-divider collisions behave correctly

### Implementation for User Story 2

- [x] T010 [US2] Replace `planck.Edge(...)` divider creation with `planck.Box(BUCKET_DIVIDER_WIDTH/2, BUCKET_DIVIDER_HEIGHT/2)` on a body positioned at rectangle centre in `src/physics/board-builder.ts`
- [x] T011 [US2] Apply identical Edge→Box divider change in `rebuildBoard()` method of `src/physics/simulation.ts`
- [x] T012 [US2] Replace divider stroke-line rendering with filled rectangle using horizontal wood gradient (`#5a3a1a` edges → `#a07828` centre) and 1.5px dark outline (`#3a2510`) in `src/rendering/renderer.ts`

**Checkpoint**: Dividers render as thick wood posts; physics collisions match visual width. US2 independently testable.

---

## Phase 6: User Story 3 — Refined Puck Art (Priority: P2)

**Goal**: Pucks display 3D shading with gradient highlights, specular spot, and edge shadow

**Independent Test**: Drop pucks for each player colour → each displays spherical 3D look; pattern overlays still visible; colours distinguishable

### Implementation for User Story 3

- [x] T013 [US3] Add colour utility functions (`lightenColour`, `darkenColour`) to derive highlight/shadow tints from player base colours in `src/rendering/renderer.ts` (or a helper within the file)
- [x] T014 [US3] Replace flat `ctx.arc` + `fillStyle` puck fill with layered radial gradients: (1) drop shadow offset circle, (2) main gradient (highlight-tint → base → shadow-shade), (3) specular highlight (off-centre white→transparent) in `src/rendering/renderer.ts`
- [x] T015 [US3] Adjust pattern overlay (`drawPuckPattern`) opacity to blend with new gradient shading — reduce overlay alpha so patterns are visible but don't overpower the 3D effect in `src/rendering/renderer.ts`
- [x] T016 [US3] Update puck outline from `#ffffff88` / 1.5px to a darker tint of the base colour / 2px for better definition on wood background in `src/rendering/renderer.ts`

**Checkpoint**: All four player puck colours show polished 3D appearance. Patterns blend naturally. US3 independently testable.

---

## Phase 7: User Story 4 — Collision Effects at Contact Point (Priority: P3)

**Goal**: Collision flashes appear at actual physics contact point, not puck centre

**Independent Test**: Drop puck → collision flashes appear at puck-peg edge contact, not puck centre; works for peg and divider collisions

### Tests for User Story 4

- [x] T017 [P] [US4] Write unit test verifying `CollisionEvent.contactX`/`contactY` are populated from `WorldManifold` and differ from puck centre for a circle-circle collision in `tests/unit/physics/contact-point.test.ts`

### Implementation for User Story 4

- [x] T018 [US4] Extract contact point from `contact.getWorldManifold(null)` in `handleCollision()` of `src/physics/simulation.ts` — set `contactX = wm.points[0].x`, `contactY = wm.points[0].y` with fallback to puck centre if `wm` is null
- [x] T019 [US4] Populate `contactX`/`contactY` in all `CollisionEvent` objects pushed to `pendingCollisions[]` in `src/physics/simulation.ts`
- [x] T020 [US4] Update collision event handler in `src/main.ts` to pass `collision.contactX` and `collision.contactY` to `effects.addCollisionFlash()` instead of `collision.x` / `collision.y`
- [x] T021 [US4] Update `addCollisionFlash()` in `src/rendering/effects.ts` to use the contact-point coordinates for flash positioning (parameter rename for clarity)

**Checkpoint**: All collision flashes appear at contact points. US4 independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all user stories

- [x] T022 Verify all five user stories work together — play a full game with 2+ players, confirming wood board, thick dividers, 3D pucks, contact-point flashes, and equal bucket widths all render correctly in combination
- [x] T023 Performance validation — confirm 60 fps is maintained with all visual changes active, 4 simultaneous pucks, on a throttled (4× slowdown) CPU profile
- [x] T024 Run existing E2E smoke test suite (`npm run test:e2e`) and unit tests (`npm run test:unit`) to verify no regressions
- [x] T025 Run quickstart.md validation — follow quickstart.md steps and confirm all manual visual test scenarios pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: T003 depends on T001 (divider width constant); T004/T005 independent of T001/T002
- **Phase 3 (US1)**: Depends on T003 (wood pattern module)
- **Phase 4 (US5)**: Depends on T004 (bucket config) — can run in parallel with Phase 3
- **Phase 5 (US2)**: Depends on T001 (divider width constant) — can run in parallel with Phase 3/4
- **Phase 6 (US3)**: No dependencies on other user stories — can run in parallel with Phase 3/4/5
- **Phase 7 (US4)**: Depends on T002 (CollisionEvent type change) — can run in parallel with Phase 3/4/5/6
- **Phase 8 (Polish)**: Depends on all user story phases being complete

### User Story Dependencies

- **US1 (Wood Board)**: Independent — only needs wood pattern module from Phase 2
- **US2 (Thick Dividers)**: Independent — only needs `BUCKET_DIVIDER_WIDTH` from Phase 1
- **US3 (3D Pucks)**: Fully independent — no cross-story dependencies
- **US4 (Contact Point)**: Independent — only needs `CollisionEvent` type from Phase 1
- **US5 (Bucket Widths)**: Fully independent — config change from Phase 2

### Within Each User Story

- Tests (where included) written FIRST and must FAIL before implementation
- Config/type changes before rendering changes
- Physics changes before rendering changes (US2)
- Core implementation before integration

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T003, T004, T005 can all run in parallel (different files)
- Once Phase 2 completes, US1 through US5 can all proceed in parallel
- T017 (US4 test) can run in parallel with T013–T016 (US3 implementation)

---

## Parallel Example: After Phase 2 Completion

```bash
# Stream A: User Story 1 (Wood Board)
T006 → T007 → T008

# Stream B: User Story 2 (Thick Dividers)  
T010 → T011 → T012

# Stream C: User Story 3 (3D Pucks)
T013 → T014 → T015 → T016

# Stream D: User Story 4 (Contact Point) + User Story 5 (Bucket Widths)
T017 (test) → T018 → T019 → T020 → T021 | T009 (US5 verify)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003, T004, T005)
3. Complete Phase 3: User Story 1 (T006, T007, T008)
4. **STOP and VALIDATE**: Board shows wood-grain pattern — MVP delivered

### Incremental Delivery

1. Setup + Foundational → constants, types, wood module, bucket config ready
2. US1 (Wood Board) → visual transformation visible immediately
3. US5 (Bucket Widths) → config already applied, verify labels
4. US2 (Thick Dividers) → physics + rendering upgrade
5. US3 (3D Pucks) → visual quality uplift
6. US4 (Contact Point) → precision polish
7. Polish → full integration validation

### Sequential Single-Developer Strategy

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025

---

## Notes

- Total tasks: **25**
- Visual rendering tasks (US1, US2, US3) are exempt from automated tests per constitution; manual visual verification documented in spec
- Game logic tasks (US4 contact point, US5 bucket widths) include automated tests per constitution Principle V
- All tasks target existing single-project structure; one new file (`wood-pattern.ts`)
- No new dependencies added; all changes use existing Canvas 2D + Planck.js APIs
- Commit after each task or per-story checkpoint for clean git history
