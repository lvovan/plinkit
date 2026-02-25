# Tasks: Collision & Interaction Updates

**Input**: Design documents from `/specs/003-collision-interaction-updates/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/internal-modules.md, quickstart.md

**Tests**: Included for scoring logic and effect lifecycle per Constitution V (test-first for game logic). Visual rendering tasks are exempt from TDD but covered by quickstart.md manual verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared type definitions, config, and remove dead code — prerequisite for all user stories

- [x] T001 Add new types to src/types/index.ts: `ScoringConfig` (bounceMultiplierRate: number, bounceMultiplierCap: number), `ScoreBreakdown` (baseScore, bounceCount, multiplier, totalScore), `CollisionFlash` (x, y, startTime, duration, multiplierText), `SlashEffect` (originX, originY, directionX, directionY, magnitude, startTime, duration), `DropIndicator` (x, style: PuckStyle, visible)
- [x] T002 [P] Extend `RenderState` in src/types/contracts.ts: add optional `dropIndicator?: { x: number; style: PuckStyle }` field. Extend `TurnResult`: add `bounceCount: number` and `scoreBreakdown: ScoreBreakdown` fields, keep `scoreEarned` for backward compat (`scoreEarned === scoreBreakdown.totalScore`)
- [x] T003 [P] Add `DEFAULT_SCORING_CONFIG` (`{ bounceMultiplierRate: 1.15, bounceMultiplierCap: 10.0 }`) to src/config/game-config.ts and wire `scoring: ScoringConfig` into `GameConfig` interface and `createGameConfig()` deep-merge
- [x] T004 [P] Delete unused standalone src/rendering/particles.ts file and remove any import references to it across the codebase

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core effects infrastructure that MUST be complete before any user story can render effects

**⚠️ CRITICAL**: US1 (collision flash), US2 (score pop fix), and US4 (slash) all depend on the renderEffects pipeline being wired into the render loop

- [x] T005 Create `renderEffects(ctx, worldToCanvas, worldToPixels)` shell method in EffectsManager that iterates effect pools (flashes, slashes, score pops), filters expired entries each frame, and delegates to sub-renderers in src/rendering/effects.ts
- [x] T006 [P] Modify `emitParticles()` in CanvasRenderer to only emit for `'bucketLand'` type — `'pinHit'` and `'shove'` types become no-ops (silently ignored) in src/rendering/renderer.ts
- [x] T007 Wire `effects.renderEffects(ctx, worldToCanvas, worldToPixels)` call into `CanvasRenderer.drawFrame()` after puck rendering in src/rendering/renderer.ts

**Checkpoint**: Effects pipeline ready — collision flashes, score pops, and slashes can now be rendered. Particle spray removed for collisions/shoves, retained for bucket landings.

---

## Phase 3: User Story 1 — Collision Feedback Overhaul (Priority: P1) 🎯 MVP

**Goal**: Every pin/puck/wall collision produces a radial flash at the contact point with multiplier text and a bounce sound. All particle spray effects on collisions are gone.

**Independent Test**: Drop a puck and verify every collision shows a radial flash + multiplier text + sound, with no particle sprays.

### Tests for User Story 1

> **Constitution V**: Effect lifecycle is testable game logic — write tests FIRST, ensure they FAIL before implementation

- [x] T008 [P] [US1] Unit test for `addCollisionFlash` lifecycle: create flash with (x, y, multiplierText), verify active immediately, verify multiplierText stored, verify expired after 250ms in tests/unit/rendering/effects.test.ts

### Implementation for User Story 1

- [x] T009 [US1] Implement `addCollisionFlash(x: number, y: number, multiplierText: string)` method in EffectsManager — creates `CollisionFlash` with `startTime = performance.now()`, duration 250ms, adds to internal flashes pool in src/rendering/effects.ts
- [x] T010 [US1] Implement collision flash rendering in `renderEffects`: for each active flash, draw radial gradient (bright white center → transparent edge) using `createRadialGradient` with `globalAlpha = 1 - (elapsed / duration)`, then draw `multiplierText` (e.g., "1.3×") offset slightly above the flash point with same alpha and WCAG 4.5:1 contrast (gold on dark) in src/rendering/effects.ts
- [x] T011 [US1] Expand collision event loop in main.ts to handle ALL collision types (`pinHit`, `puckHit`, `wallHit`): increment local `bounceCount` variable, call `audioManager.play('pinHit', { pitchVariation: 0.15 })`, call `effects.addCollisionFlash(x, y, formatMultiplier(bounceCount))` where `formatMultiplier` returns `"${min(1.15^bounceCount, 10).toFixed(1)}×"` in src/main.ts
- [x] T012 [US1] Add audio rate limiter for rapid collisions: track recent play timestamps, if >4 sounds within 50ms window attenuate subsequent sounds by 50% gain reduction; implement as helper function near collision loop in src/main.ts

**Checkpoint**: US1 complete — every collision shows flash + multiplier text + sound. No particle sprays on hits. Bucket-landing particles still work.

---

## Phase 4: User Story 2 — Bounce-Based Exponential Scoring (Priority: P2)

**Goal**: Round score = base bucket score × exponential bounce multiplier. Player sees a two-line breakdown when puck settles.

**Independent Test**: Drop pucks with different bounce counts into the same bucket, verify higher-bounce drops score exponentially more, verify score breakdown display.

### Tests for User Story 2

> **Constitution V**: Scoring is pure game logic — write tests FIRST, ensure they FAIL before implementation

- [x] T013 [P] [US2] Unit tests for `calculateRoundScore` in tests/unit/core/scoring.test.ts: (a) 0 bounces → multiplier 1.0, totalScore equals baseScore; (b) 5 bounces → multiplier ≈2.01; (c) 10 bounces → multiplier ≈4.05; (d) 17+ bounces → multiplier capped at 10.0; (e) totalScore is always `floor(baseScore × multiplier)`; (f) invalid bucketIndex throws RangeError

### Implementation for User Story 2

- [x] T014 [US2] Implement `calculateRoundScore(bucketIndex: number, bounceCount: number): ScoreBreakdown` method on ScoringEngine — `multiplier = Math.min(config.bounceMultiplierRate ** bounceCount, config.bounceMultiplierCap)`, `totalScore = Math.floor(baseScore * multiplier)` in src/core/scoring.ts
- [x] T015 [US2] Modify `triggerScorePop()` signature from `(x, y, score: number)` to `(x, y, breakdown: ScoreBreakdown)` — update internal `ScorePopEffect` to store `breakdown` instead of raw score, increase duration from 1200ms to 1800ms in src/rendering/effects.ts
- [x] T016 [US2] Implement score pop rendering in `renderEffects`: two-line text with float-up-and-fade animation — line 1: `"baseScore × multiplier×"` (smaller font), line 2: `"= totalScore"` (larger, bold); fix existing bug where `renderScorePops()` was never called in render loop in src/rendering/effects.ts
- [x] T017 [US2] Update settled-puck handler in main.ts: call `scoring.calculateRoundScore(bucketIndex, bounceCount)` to get `ScoreBreakdown`, pass breakdown to `effects.triggerScorePop(x, y, breakdown)`, include `bounceCount` and `scoreBreakdown` in `TurnResult`, set `scoreEarned = breakdown.totalScore`, reset `bounceCount = 0` in src/main.ts
- [x] T018 [US2] Integration test for full round flow in tests/integration/game-session.test.ts: simulate drop → verify bounceCount incremented per collision → verify settlement calls calculateRoundScore with correct bounceCount → verify ScoreBreakdown has correct multiplier → verify TurnResult contains bounceCount and scoreBreakdown

**Checkpoint**: US2 complete — scores reflect bounce multiplier. Score breakdown pops display correctly. Combined with US1, the full collision-to-scoring pipeline works end-to-end.

---

## Phase 5: User Story 3 — Pre-Drop Puck Positioning (Priority: P3)

**Goal**: Ghost puck + dashed guide line at the top of the board shows where the puck will drop. Player drags horizontally to position.

**Independent Test**: Start a round, verify ghost puck appears at center, drag horizontally and verify it follows, release and verify puck drops from that position.

> **Note**: US3 has no scoring or physics logic — visual rendering only, exempt from TDD per Constitution V. Verified via quickstart.md manual checklist.

### Implementation for User Story 3

- [x] T019 [US3] Implement ghost puck rendering in `CanvasRenderer.drawFrame()`: when `state.dropIndicator` is present, draw player's puck at 40% opacity (`globalAlpha = 0.4`) at `(dropIndicator.x, topOfBoard)` using existing `drawPuckPattern`, rendered before active pucks in z-order in src/rendering/renderer.ts
- [x] T020 [US3] Add optional dashed vertical guide line from ghost puck position downward (5-6 dashes, subtle opacity) as directional affordance, drawn alongside ghost puck in src/rendering/renderer.ts
- [x] T021 [US3] Wire `dropIndicator` into `RenderState` assembly in main.ts: when `!puckDropped`, set `dropIndicator: { x: clamp(dropX, -boardHalfWidth, boardHalfWidth), style: currentPlayerPuckStyle }`; default `dropX` to center (0) per FR-014; omit `dropIndicator` from RenderState when puck is dropped in src/main.ts

**Checkpoint**: US3 complete — ghost puck visible, tracks horizontal input, puck drops from indicated position. Works independently of US1/US2/US4.

---

## Phase 6: User Story 4 — Shove Slash Animation (Priority: P4)

**Goal**: Successful shove triggers a Fruit Ninja-style slash animation along the gesture direction plus proportional board shake.

**Independent Test**: Shove a puck and verify a directional slash animation appears along the swipe direction with proportional board shake intensity.

### Tests for User Story 4

> **Constitution V**: Effect lifecycle is testable game logic — write tests FIRST, ensure they FAIL before implementation

- [x] T022 [P] [US4] Unit test for `addSlashEffect` lifecycle: create slash with (origin, direction, magnitude), verify active immediately, verify expired after 400ms, verify magnitude stored in tests/unit/rendering/effects.test.ts

### Implementation for User Story 4

- [x] T023 [US4] Implement `addSlashEffect(originX, originY, directionX, directionY, magnitude)` method in EffectsManager — creates `SlashEffect` with `startTime = performance.now()`, duration 400ms, adds to internal slashes pool in src/rendering/effects.ts
- [x] T024 [US4] Implement slash rendering in `renderEffects`: tapered polyline along direction vector (thick at origin, tapering to point at endpoint), bright color (white/cyan), `globalAlpha` fading over 400ms duration; visually distinct from radial collision flash (linear vs radial) per FR-019 in src/rendering/effects.ts
- [x] T025 [US4] Update shove handler in main.ts: on successful shove, compute proportional shake intensity as `5 × (forceMagnitude / maxForceMagnitude)`, call `renderer.shake(shakeIntensity, 150)`, and call `effects.addSlashEffect(puckX, puckY, normDirX, normDirY, forceMag)` in src/main.ts

**Checkpoint**: US4 complete — slash animation visible on every successful shove, proportional board shake, no slash on failed shoves. Works independently of US1/US2/US3.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, validation, and cross-story integration checks

- [x] T026 [P] Verify no dangling imports reference deleted src/rendering/particles.ts — search codebase for `particles` imports and remove any found
- [x] T027 [P] Audit all effect rendering in src/rendering/effects.ts: confirm every sub-renderer uses `ctx.save()`/`ctx.restore()` to prevent canvas state leaks between effects
- [x] T028 Performance validation: manually test all effects simultaneously (rapid collisions + slash + score pop + ghost puck) and verify 60fps maintained on mid-range mobile per FR-021
- [x] T029 Run quickstart.md feature verification checklist — validate all 5 items: (1) collision flash + multiplier text + sound, (2) no particle sprays except bucket-land, (3) score breakdown display, (4) ghost puck positioning, (5) slash animation + proportional shake

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (renderEffects pipeline) — delivers MVP
- **US2 (Phase 4)**: Depends on Phase 2 + US1 (bounce counter from US1's collision loop)
- **US3 (Phase 5)**: Depends on Phase 2 only (no dependency on US1/US2/US4) — can run in parallel with US4
- **US4 (Phase 6)**: Depends on Phase 2 only (no dependency on US1/US2/US3) — can run in parallel with US3
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no other story dependencies ← **MVP**
- **US2 (P2)**: After US1 — needs `bounceCount` variable established in US1's collision loop
- **US3 (P3)**: After Phase 2 — fully independent of other stories
- **US4 (P4)**: After Phase 2 — fully independent of other stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution V)
- Effect pools (addXxx methods) before rendering (renderXxx)
- Core implementation in effects.ts/scoring.ts before wiring in main.ts
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can all run in parallel (different files)
- **Phase 2**: T005 and T006 can run in parallel (effects.ts vs renderer.ts); T007 waits for both
- **Phase 3-4**: US1 then US2 (sequential — US2 depends on US1's bounce counter)
- **Phase 5-6**: US3 and US4 can run in parallel (different files, no shared dependencies)
- **Phase 7**: T026 and T027 can run in parallel

---

## Parallel Example: After Phase 2 Completes

```text
# Sequential path (recommended for single developer):
Phase 1 → Phase 2 → US1 (MVP) → US2 → US3 → US4 → Polish

# Parallel path (two developers):
Phase 1 → Phase 2 →
  Developer A: US1 → US2 (sequential, US2 needs US1's bounce counter)
  Developer B: US3 and US4 (parallel with each other, independent of US1/US2)
→ Polish
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types, config, cleanup)
2. Complete Phase 2: Foundational (effects pipeline, particle removal)
3. Complete Phase 3: User Story 1 (collision flash + sound)
4. **STOP and VALIDATE**: Every collision produces flash + multiplier text + sound, no particle sprays
5. This alone delivers the most impactful user-facing change

### Incremental Delivery

1. Setup + Foundational → Effects infrastructure ready
2. US1 → Collision feedback live → Validate independently (MVP!)
3. US2 → Exponential scoring live → Validate scoring end-to-end
4. US3 + US4 → Ghost puck + slash live → Validate independently
5. Polish → Final verification, performance, cleanup
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- All effect durations: collision flash 250ms, score pop 1800ms, slash 400ms
- Scoring formula: `min(1.15^bounceCount, 10.0)` — cap at ~17 bounces
- Shake formula: `5 × (forceMagnitude / maxForceMagnitude)` — linear proportional
- Ghost puck: 40% opacity, default center, clamped to board bounds
- Audio rate limit: max 4 sounds per 50ms window, 50% gain attenuation on overflow
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
