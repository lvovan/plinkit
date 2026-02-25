# Research: Microsoft Clarity Telemetry

**Feature**: 006-clarity-telemetry  
**Date**: 2025-02-25

## 1. Clarity SDK Integration Approach

### Decision: Use `@microsoft/clarity` npm package (v1.0.2+)

**Rationale**: Official Microsoft package with built-in TypeScript declarations. Provides a clean ESM import (`import Clarity from '@microsoft/clarity'`) instead of raw `window.clarity()` calls. The package is a thin wrapper (~7.6 KB unpacked) that dynamically injects the Clarity tracking script at runtime.

**Alternatives considered**:
- **Script tag in `index.html`**: Rejected — hardcodes project ID in source; no TypeScript types; harder to conditionally skip in test environments.
- **`clarity-js` (v0.8.55)**: Rejected — this is the open-source recording engine (1.18 MB), not the SaaS integration SDK.
- **`microsoft-clarity` (no scope)**: Rejected — abandoned Frontity plugin, unrelated.

### API Surface

| Method | Signature | Purpose |
|--------|-----------|---------|
| `Clarity.init(projectId)` | `(id: string) => void` | Initialize SDK, inject tracking script |
| `Clarity.consentV2(opts)` | `(opts: { ad_Storage: 'granted'|'denied', analytics_Storage: 'granted'|'denied' }) => void` | Control cookie behavior |
| `Clarity.event(name)` | `(name: string) => void` | Send custom event for filtering/segmentation |
| `Clarity.setTag(key, value)` | `(key: string, value: string \| string[]) => void` | Attach metadata to session |
| `Clarity.identify(id, ...)` | `(customId: string, sessionId?: string, pageId?: string, friendlyName?: string) => void` | Associate session with custom ID |
| `Clarity.upgrade(reason)` | `(reason: string) => void` | Prioritize session recording |

## 2. Cookieless Mode

### Decision: Call `Clarity.consentV2({ ad_Storage: 'denied', analytics_Storage: 'denied' })` immediately after `Clarity.init()`

**Rationale**: This is the official v2 consent API. Denying both storage types prevents Clarity from setting `_clck` and `_clsk` cookies. Each pageview creates an independent session (no cross-page session linking), but all interaction data, heatmaps, and recordings still work within a single page session — which is ideal for an SPA that never navigates away.

**Alternatives considered**:
- **Dashboard toggle (Settings → Setup → cookies OFF)**: Rejected — requires manual dashboard configuration per environment; not reproducible via code.
- **`Clarity.consent(false)`**: Rejected — v1 API, deprecated. Also erases existing cookies which is a different semantic.
- **No consent call**: Rejected — Clarity sets cookies by default, violating FR-002.

**Behavior in cookieless mode**:
- No cookies set (`_clck`, `_clsk` absent)
- Unique ID assigned per page view only
- Clarity still sends `/collect` POST requests with session data
- Session replays, heatmaps, and engagement metrics all function

## 3. Custom Event Strategy

### Decision: Use `Clarity.event()` for game lifecycle events and `Clarity.setTag()` for session-level metadata

**Rationale**: Events mark discrete moments for filtering session replays. Tags attach persistent metadata (player count, final score) that persists across the session for segmentation.

**Event mapping**:

| Game Event | Clarity Call | When Fired |
|------------|-------------|------------|
| Game starts | `Clarity.event("game_start")` + `Clarity.setTag("playerCount", n)` | After registration, `startSession()` |
| Turn completes | `Clarity.event("turn_complete")` + `Clarity.setTag("lastBucketScore", s)` | Puck settles in bucket |
| Game ends | `Clarity.event("game_end")` + `Clarity.setTag("winningScore", s)` + `Clarity.setTag("totalRounds", r)` | Results screen shown |
| Play again | `Clarity.event("replay")` | User selects "Play Again" |
| New players | `Clarity.event("new_session")` | User selects "New Players" |

**Alternatives considered**:
- **Only events, no tags**: Rejected — events mark moments but don't carry data. Tags enable filtering by score, player count, etc.
- **Only tags, no events**: Rejected — tags are session-level metadata, not timestamped. Events allow pinpointing exact moments in session replays.
- **`Clarity.identify()`**: Not needed — no user accounts exist. Plinkit is anonymous couch-play.

## 4. Vite Environment Variable Configuration

### Decision: Write `.env` to repo root; set `app_location: .` in CI workflow

**Rationale**: Vite loads `.env` files from `envDir`, which defaults to `root` (`.` in this project). The current CI writes to `./src/.env` which Vite cannot find. Additionally, `app_location: ./src` is incorrect — `package.json` is at the repo root.

**Changes required**:
1. CI workflow: Change `.env` write path from `./src/.env` to `./.env`
2. CI workflow: Change `app_location` from `./src` to `.`
3. TypeScript: Add `src/vite-env.d.ts` for `ImportMetaEnv` type augmentation
4. Code: Access via `import.meta.env.VITE_CLARITY_PROJECT_ID` (Vite replaces at build time)

**Alternatives considered**:
- **Add `envDir: 'src'` to vite.config.ts**: Rejected — still need to fix `app_location`; simpler to fix both in CI.
- **Hardcode project ID**: Rejected — violates FR-003 and security best practices.
- **Runtime fetch of config**: Rejected — over-engineering; Vite env vars are the standard approach for build-time config in Vite projects.

## 5. Resilience & Guard Logic

### Decision: Wrap all Clarity calls in a guard module that checks initialization state

**Rationale**: The telemetry wrapper must be fully fail-safe. If the project ID is missing, Clarity is blocked by an ad blocker, or the SDK fails to load, the game must continue without errors (FR-010).

**Guard strategy**:
1. Check `import.meta.env.VITE_CLARITY_PROJECT_ID` is truthy before calling `Clarity.init()`
2. Detect test environment via `navigator.webdriver` (set by Playwright) to skip initialization (FR-012)
3. Wrap all `Clarity.*` calls in try-catch — if SDK not loaded, calls are no-ops
4. Export a thin API from `src/telemetry/clarity.ts` that the rest of the app calls; never import `@microsoft/clarity` directly elsewhere

**Alternatives considered**:
- **No guards, trust Clarity to handle errors**: Rejected — if Clarity CDN is blocked, `Clarity.event()` would throw.
- **Feature flags**: Rejected — over-engineering for a single boolean (project ID present vs absent).

## 6. Test Strategy

### Decision: Unit test the guard module; skip Clarity in E2E

**Rationale**: The guard module has testable logic (missing project ID → skip init; test env → skip init; event dispatch → calls Clarity API). The actual Clarity SDK is a third-party service and should be mocked in unit tests. In E2E tests, `navigator.webdriver` is automatically true under Playwright, so Clarity self-disables.

**Test plan**:
- Unit tests for `src/telemetry/clarity.ts`:
  - `init()` skips when project ID is empty
  - `init()` skips when `navigator.webdriver` is true
  - `trackEvent()` calls `Clarity.event()` when initialized
  - `trackEvent()` is a no-op when not initialized
  - `setTag()` calls `Clarity.setTag()` when initialized
  - `setTag()` is a no-op when not initialized
- E2E: No changes needed — Clarity auto-skips via webdriver detection
- Existing tests: No modifications required
