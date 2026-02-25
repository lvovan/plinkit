# Internal Module Contracts: Microsoft Clarity Telemetry

**Feature**: 006-clarity-telemetry  
**Date**: 2025-02-25

## Contract Changes Summary

| Contract | Change | Impact |
|----------|--------|--------|
| TelemetryManager | New contract | New module (`src/telemetry/clarity.ts`) |
| main.ts game flow | Modified — add telemetry calls at lifecycle points | Non-breaking (additive only) |
| CI Workflow | Modified — fix `.env` path and `app_location` | Infrastructure fix |

---

## Contract: TelemetryManager

New module providing a fail-safe interface to Microsoft Clarity. All game modules call this wrapper — never the Clarity SDK directly.

```typescript
/**
 * Initialize the telemetry system.
 *
 * Reads the Clarity project ID from `import.meta.env.VITE_CLARITY_PROJECT_ID`.
 * Skips initialization if:
 *   - Project ID is empty/missing
 *   - Running in a test environment (navigator.webdriver === true)
 *   - Clarity SDK fails to load
 *
 * Configures cookieless mode (no cookies set).
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initTelemetry(): void;

/**
 * Send a named event to Clarity for session filtering and replay tagging.
 *
 * No-op if telemetry is not initialized.
 * Never throws — all errors are silently swallowed.
 *
 * @param name - Event name (e.g., 'game_start', 'turn_complete', 'game_end')
 */
export function trackEvent(name: string): void;

/**
 * Attach a key-value tag to the current Clarity session.
 *
 * Tags persist for the session and can be used for filtering in the dashboard.
 * Values are always strings (numbers should be stringified by the caller).
 *
 * No-op if telemetry is not initialized.
 * Never throws.
 *
 * @param key - Tag name (e.g., 'playerCount', 'winningScore')
 * @param value - Tag value (string or string array)
 */
export function setTag(key: string, value: string | string[]): void;

/**
 * Check whether telemetry was successfully initialized.
 *
 * Useful for conditional logic or debugging.
 */
export function isInitialized(): boolean;
```

### Usage Pattern (in main.ts)

```typescript
import { initTelemetry, trackEvent, setTag } from '@/telemetry/clarity';

// At app startup (before game loop)
initTelemetry();

// After player registration
trackEvent('game_start');
setTag('playerCount', String(registrations.length));

// After puck settles in bucket
trackEvent('turn_complete');
setTag('lastBucketScore', String(scoreBreakdown.baseScore));
setTag('bounceCount', String(bounceCount));

// After game ends
trackEvent('game_end');
setTag('winningScore', String(winningScore));
setTag('totalRounds', String(totalRounds));

// User actions on results screen
trackEvent('replay');    // Play Again
trackEvent('new_session'); // New Players
```

### Error Handling Contract

- **All public functions** are wrapped in try-catch
- **No exceptions** escape to the caller under any circumstances
- **No console.error** output (silent failure — telemetry is non-critical)
- If `console.warn` is used for debugging, it must be gated behind a development-only check

### Dependencies

- **Runtime**: `@microsoft/clarity` npm package (loaded dynamically by the SDK)
- **Build-time**: `VITE_CLARITY_PROJECT_ID` environment variable via Vite
- **No dependencies on**: game state, physics, rendering, audio, or any other game module

---

## Integration Points in main.ts

The following locations in `main.ts` will have telemetry calls added:

| Location | Call | Context |
|----------|------|---------|
| App bootstrap (before `loop.start()`) | `initTelemetry()` | One-time initialization |
| `startGame()` after `stateMachine.startSession()` | `trackEvent('game_start')`, `setTag('playerCount', ...)` | Game begins |
| `onStep()` settled puck handler | `trackEvent('turn_complete')`, `setTag('lastBucketScore', ...)`, `setTag('bounceCount', ...)` | Turn completes |
| `handleGameEnd()` | `trackEvent('game_end')`, `setTag('winningScore', ...)`, `setTag('totalRounds', ...)` | Game concludes |
| `handleGameEnd()` — "Play Again" branch | `trackEvent('replay')` | Replay chosen |
| `handleGameEnd()` — "New Players" branch | `trackEvent('new_session')` | New session chosen |

All calls are additive — no existing code is modified or removed.
