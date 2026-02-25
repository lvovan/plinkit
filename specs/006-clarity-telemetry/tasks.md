# Tasks: Microsoft Clarity Telemetry

**Input**: Design documents from `/specs/006-clarity-telemetry/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install dependencies, configure build tooling, fix CI workflow

- [x] T001 Install `@microsoft/clarity` npm package via `npm install @microsoft/clarity`
- [x] T002 [P] Create Vite environment type declarations in src/vite-env.d.ts with `VITE_CLARITY_PROJECT_ID` on `ImportMetaEnv`
- [x] T003 [P] Fix CI workflow: change `.env` write path from `./src/.env` to `./.env` and change `app_location` from `./src` to `.` in .github/workflows/azure-static-web-apps-deploy.yml
- [x] T004 [P] Add `.env` to .gitignore if not already present (contains secrets, must not be committed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the telemetry wrapper module that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create telemetry wrapper module in src/telemetry/clarity.ts exporting `initTelemetry()`, `trackEvent()`, `setTag()`, `isInitialized()` per contracts/internal-modules.md
- [x] T006 Implement guard logic in src/telemetry/clarity.ts: skip init when `VITE_CLARITY_PROJECT_ID` is empty, when `navigator.webdriver` is true, wrap all Clarity SDK calls in try-catch
- [x] T007 Implement cookieless mode in src/telemetry/clarity.ts: call `Clarity.consentV2({ ad_Storage: 'denied', analytics_Storage: 'denied' })` immediately after `Clarity.init()`
- [x] T008 [P] Create unit tests for guard logic in tests/unit/telemetry/clarity.test.ts: test skips on empty project ID, skips on webdriver, event dispatch when initialized, no-op when not initialized

**Checkpoint**: Telemetry module is complete and tested — user story integration can begin

---

## Phase 3: User Story 1 — Automatic Session Recording (Priority: P1) 🎯 MVP

**Goal**: Every production user session is automatically recorded by Clarity in cookieless mode with the project ID injected at build time.

**Independent Test**: Load the app in a browser, open DevTools → Network, filter by `clarity`, and verify requests to `www.clarity.ms`. Check Application → Cookies and confirm no `_clck` or `_clsk` cookies are set.

### Implementation

- [x] T009 [US1] Import and call `initTelemetry()` in src/main.ts at app bootstrap, before `loop.start()` and `startGame()`

**Checkpoint**: US1 complete — Clarity initializes on page load, records sessions in cookieless mode, project ID from env var

---

## Phase 4: User Story 2 — SPA Game Event Tracking (Priority: P2)

**Goal**: Key game lifecycle events are tagged in Clarity for filtering and segmenting session replays.

**Independent Test**: Play a full game, then check the Clarity dashboard → Recordings for custom events (game_start, turn_complete, game_end, replay, new_session) and tags (playerCount, winningScore).

### Implementation

- [x] T010 [US2] Add `trackEvent('game_start')` and `setTag('playerCount', ...)` in src/main.ts `startGame()` after `stateMachine.startSession()`
- [x] T011 [US2] Add `trackEvent('turn_complete')`, `setTag('lastBucketScore', ...)`, and `setTag('bounceCount', ...)` in src/main.ts `onStep()` settled puck handler
- [x] T012 [US2] Add `trackEvent('game_end')`, `setTag('winningScore', ...)`, and `setTag('totalRounds', ...)` in src/main.ts `handleGameEnd()`
- [x] T013 [P] [US2] Add `trackEvent('replay')` in src/main.ts `handleGameEnd()` "Play Again" branch and `trackEvent('new_session')` in "New Players" branch

**Checkpoint**: US2 complete — all game events tagged in Clarity, visible in dashboard filters and recordings

---

## Phase 5: User Story 3 — Engagement & Performance Insights (Priority: P3)

**Goal**: Clarity captures session duration, interaction frequency, visibility changes, and page load performance automatically.

**Independent Test**: Play a session, switch tabs, return, then check the Clarity dashboard for engagement metrics and performance data.

### Implementation

- [x] T014 [US3] Verify Clarity's built-in engagement and performance tracking is active by confirming no configuration disables it in src/telemetry/clarity.ts (Clarity captures these by default — no additional code needed, but verify the init call does not suppress them)

**Checkpoint**: US3 complete — engagement and performance metrics appear in the Clarity dashboard automatically

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, existing test compatibility, documentation

- [x] T015 [P] Run existing E2E tests (`npm run test:e2e`) and confirm they pass without modification (Clarity auto-skips via `navigator.webdriver`)
- [x] T016 [P] Run existing unit tests (`npm run test:unit`) and confirm they pass without modification
- [x] T017 Run quickstart.md validation: follow specs/006-clarity-telemetry/quickstart.md verification steps end-to-end
- [x] T018 Run `npm run build` and verify bundle size stays under 1 MB gzipped

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (npm install) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion (T005–T008)
- **US2 (Phase 4)**: Depends on Phase 2 completion; independent of US1
- **US3 (Phase 5)**: Depends on Phase 2 completion; independent of US1 and US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — no dependencies on other stories
- **US2 (P2)**: Depends only on Foundational — can run in parallel with US1
- **US3 (P3)**: Depends only on Foundational — can run in parallel with US1 and US2

### Within Each Phase

- Phase 1: T001 first, then T002–T004 in parallel
- Phase 2: T005 → T006 → T007 sequentially (same file), T008 in parallel with T007
- Phase 3: T009 standalone
- Phase 4: T010 → T011 → T012 sequentially (same file, different locations), T013 in parallel
- Phase 5: T014 standalone (verification only)
- Phase 6: T015 and T016 in parallel, then T017, then T018

### Parallel Opportunities

- T002, T003, T004 can all run in parallel (different files)
- T008 can run in parallel with T007 (different files: test file vs source file)
- US1, US2, US3 can all start once Phase 2 is done (if team capacity allows)
- T015 and T016 can run in parallel (different test suites)
- T013 can run in parallel with T010–T012 (different code branches in same file, but independent additions)

---

## Parallel Example: Setup Phase

```text
# After T001 completes:
Task T002: "Create Vite env type declarations in src/vite-env.d.ts"
Task T003: "Fix CI workflow in .github/workflows/azure-static-web-apps-deploy.yml"
Task T004: "Add .env to .gitignore"
```

## Parallel Example: Post-Foundational

```text
# After Phase 2 completes, all stories can start:
Task T009: [US1] "Import and call initTelemetry() in src/main.ts"
Task T010: [US2] "Add trackEvent('game_start') in src/main.ts startGame()"
Task T014: [US3] "Verify engagement tracking active in src/telemetry/clarity.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T008)
3. Complete Phase 3: US1 (T009)
4. **STOP and VALIDATE**: Clarity loads, records sessions, cookieless mode works
5. Deploy if ready — telemetry is live

### Incremental Delivery

1. Setup + Foundational → Module ready
2. Add US1 → Clarity recording live → Deploy (MVP!)
3. Add US2 → Game events tagged → Deploy
4. Add US3 → Verify engagement data → Deploy
5. Polish → Tests pass, bundle validated → Final deploy

---

## Notes

- Tests are included for the guard module (T008) since defensive logic is critical for resilience
- US3 is a verification task — Clarity captures engagement/performance metrics by default; no additional code is needed
- The CI workflow fix (T003) is in Setup because it's infrastructure, not user-story-specific
- All telemetry calls are additive — no existing code is modified or removed, only new imports and function calls added
- Commit after each task or logical group
