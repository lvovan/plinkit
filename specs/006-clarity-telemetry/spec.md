# Feature Specification: Microsoft Clarity Telemetry

**Feature Branch**: `006-clarity-telemetry`  
**Created**: 2025-02-25  
**Status**: Draft  
**Input**: User description: "Add Microsoft Clarity support for telemetry. Do not use cookies. Determine and implement the most relevant metrics to have (as this is a SPA application). Leverage the VITE_CLARITY_PROJECT_ID in ./src/.env to build-in the Clarity project ID."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Session Recording (Priority: P1)

As a product owner, I want every user session to be automatically recorded by Microsoft Clarity so that I can observe real user behavior — including heatmaps, session replays, and interaction patterns — without requiring any manual setup per session.

**Why this priority**: Session recording is the foundational capability of Clarity. Without it, no other telemetry feature works. This is the core integration that all other metrics depend on.

**Independent Test**: Can be fully tested by loading the application in a browser and verifying that the Clarity tracking script initializes, sends beacon data to Clarity servers, and a session appears in the Clarity dashboard.

**Acceptance Scenarios**:

1. **Given** a user navigates to the application, **When** the page loads, **Then** the Clarity tracking script initializes automatically without user action.
2. **Given** the Clarity script is loaded, **When** the user interacts with the game (taps, swipes, clicks), **Then** all interactions are captured and visible in the Clarity dashboard as session replays.
3. **Given** a user's browser has cookies disabled or restricted, **When** the Clarity script initializes, **Then** it operates in cookieless mode and does not set any cookies.
4. **Given** the application is built for deployment, **When** the build process runs, **Then** the Clarity project ID is injected from the `VITE_CLARITY_PROJECT_ID` environment variable and is not hardcoded in source code.

---

### User Story 2 - SPA Game Event Tracking (Priority: P2)

As a product owner, I want key game events (game start, round completion, puck drops, game end, winner declaration) tagged as custom Clarity events so that I can correlate user behavior with specific gameplay moments in session replays and analytics.

**Why this priority**: Raw session recordings are useful but lack context. Tagging game events allows filtering and segmenting sessions by gameplay milestones, dramatically increasing the value of the telemetry data.

**Independent Test**: Can be tested by playing a full game session, then checking the Clarity dashboard for custom event tags at expected moments (game start, each puck drop, round end, game over).

**Acceptance Scenarios**:

1. **Given** a user completes player registration and starts a game, **When** the game session begins, **Then** a "game_start" event is sent to Clarity with the number of players.
2. **Given** a player drops a puck, **When** the puck lands in a bucket, **Then** a "turn_complete" event is sent to Clarity with the bucket score and bounce count.
3. **Given** a player shoves a puck during a turn, **When** the shove is successfully applied, **Then** the shove is counted and the cumulative shove total is tracked for the session.
4. **Given** a game ends with a winner, **When** the results screen is displayed, **Then** a "game_end" event is sent to Clarity with the winning score, number of rounds played, total shove count, and average shoves per round.
5. **Given** a player chooses "Play Again" or "New Players" after a game ends, **When** the action is taken, **Then** a "replay" or "new_session" event is sent to Clarity respectively.

---

### User Story 3 - Engagement & Performance Insights (Priority: P3)

As a product owner, I want Clarity to capture engagement signals (session duration, interaction frequency, screen visibility changes) and page performance data so that I can understand how engaged users are and whether performance issues affect gameplay.

**Why this priority**: Understanding engagement depth and performance quality helps prioritize future improvements. This is additive value on top of the core recording and event tracking.

**Independent Test**: Can be tested by running a session of varying length, switching tabs, returning, and then checking the Clarity dashboard for engagement metrics and performance data.

**Acceptance Scenarios**:

1. **Given** a user plays multiple rounds, **When** reviewing the Clarity dashboard, **Then** session duration and interaction count are visible per session.
2. **Given** a user switches away from the game tab and returns, **When** the visibility change occurs, **Then** Clarity captures the idle period and active period accurately.
3. **Given** the application loads on a slow connection, **When** reviewing the Clarity dashboard, **Then** page load performance metrics (time to interactive, rendering delays) are available.

---

### Edge Cases

- What happens when the `VITE_CLARITY_PROJECT_ID` environment variable is missing or empty? The Clarity script must not initialize, and no errors should be thrown to the console.
- What happens when a user has an ad blocker that blocks Clarity? The game must continue to function normally with no errors or degraded experience.
- What happens when the user is offline (service worker cached version)? Clarity may fail to load; the game must still work without errors.
- What happens in automated test environments? Clarity should not interfere with E2E or unit tests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST integrate Microsoft Clarity's tracking script, loading it during application initialization.
- **FR-002**: System MUST configure Clarity in cookieless mode so that no cookies are set by the Clarity tracker.
- **FR-003**: System MUST read the Clarity project ID from the `VITE_CLARITY_PROJECT_ID` environment variable at build time and inject it into the tracking script configuration.
- **FR-004**: System MUST gracefully handle a missing or empty `VITE_CLARITY_PROJECT_ID` by skipping Clarity initialization entirely without throwing errors.
- **FR-005**: System MUST send a custom "game_start" event to Clarity when a game session begins, including the player count.
- **FR-006**: System MUST send a custom "turn_complete" event to Clarity when a puck settles in a bucket, including the bucket score and bounce count.
- **FR-007**: System MUST send a custom "game_end" event to Clarity when the game concludes, including the final winning score, total rounds played, total shove count, and average shoves per round.
- **FR-007a**: System MUST track each successful player shove during the game session and include the cumulative count (`totalShoves`) and average per round (`avgShovesPerRound`) as Clarity tags on the `game_end` event.
- **FR-008**: System MUST send a custom "replay" event when a user chooses to play again with the same players.
- **FR-009**: System MUST send a custom "new_session" event when a user chooses to start with new players.
- **FR-010**: System MUST NOT break or degrade game functionality if Clarity fails to load (ad blocker, network error, offline mode).
- **FR-011**: System MUST NOT introduce visible performance degradation to the game loop or rendering pipeline from Clarity instrumentation.
- **FR-012**: System MUST NOT load Clarity in automated test environments (when running under Playwright or similar test harnesses).

### Key Entities

- **Clarity Session**: Represents a single user visit; captures interaction heatmaps, session replays, and engagement metrics. Managed entirely by the Clarity SDK.
- **Game Event**: A custom-tagged moment in gameplay (game_start, turn_complete, game_end, replay, new_session) sent to Clarity for filtering and analysis.
- **Environment Configuration**: The build-time variable (`VITE_CLARITY_PROJECT_ID`) that controls Clarity initialization and project targeting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of production user sessions are recorded in Clarity (excluding users with ad blockers) within the first week of deployment.
- **SC-002**: Custom game events (game_start, turn_complete, game_end) appear in the Clarity dashboard and can be used to filter session replays.
- **SC-003**: No cookies are set by the Clarity tracker, verifiable by inspecting browser storage during a session.
- **SC-004**: Game startup time does not increase by more than 200ms due to Clarity integration.
- **SC-005**: Zero game-breaking errors occur when Clarity is blocked or unavailable, verifiable by running the game with an ad blocker enabled.
- **SC-006**: All existing E2E tests continue to pass without modification after Clarity integration.

## Assumptions

- Microsoft Clarity's JavaScript SDK supports a cookieless configuration option (Clarity supports `cookies: false` in its configuration).
- The Vite build system will inline `import.meta.env.VITE_CLARITY_PROJECT_ID` at build time as a string replacement, which is standard Vite behavior.
- Clarity's `set` or `event` API will be used for custom event tagging; the specific API surface will be determined during implementation.
- The existing `.env` file pattern (`./src/.env`) is already used in the CI/CD pipeline and the Vite config resolves it correctly.
- Clarity's script is lightweight enough (~6KB gzipped) that async loading will not noticeably impact game startup.
- Session replays, heatmaps, and engagement dashboards are provided by Clarity's web dashboard and require no additional application-side work beyond sending event data.
