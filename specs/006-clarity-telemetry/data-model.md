# Data Model: Microsoft Clarity Telemetry

**Feature**: 006-clarity-telemetry  
**Date**: 2025-02-25

## Entities

### TelemetryManager (Singleton)

The central wrapper around the Clarity SDK. All other modules interact with telemetry through this interface only.

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | boolean | Whether Clarity was successfully initialized (project ID present, not in test env, SDK loaded) |

**Invariants**:
- `initialized` is `false` until `init()` completes successfully
- All public methods are no-ops when `initialized` is `false`
- No exceptions escape from any public method

### GameEvent

A discrete telemetry event sent to Clarity at a specific gameplay moment.

| Event Name | Trigger Point | Associated Tags |
|------------|---------------|-----------------|
| `game_start` | Game session begins (after registration) | `playerCount`: number of registered players |
| `turn_complete` | Puck settles in a bucket | `lastBucketScore`: bucket score, `bounceCount`: number of bounces |
| `game_end` | Results screen displayed | `winningScore`: final winning score, `totalRounds`: rounds played |
| `replay` | User selects "Play Again" | — |
| `new_session` | User selects "New Players" | — |

**Invariants**:
- Event names are lowercase with underscores (Clarity convention)
- Tags are always string values (Clarity API requirement; numbers are stringified)
- Events are fire-and-forget — no return value, no acknowledgment

### EnvironmentConfig

Build-time configuration injected by Vite.

| Variable | Source | Behavior |
|----------|--------|----------|
| `VITE_CLARITY_PROJECT_ID` | `.env` file at repo root / process env | If empty or missing, telemetry module skips initialization entirely |

**Invariants**:
- Value is inlined at build time by Vite (not available at runtime from `process.env`)
- Never hardcoded in source code
- Never logged or exposed to browser console

## Relationships

```
EnvironmentConfig --provides--> TelemetryManager.init()
TelemetryManager --sends--> GameEvent[] --> Clarity Cloud
main.ts game flow --calls--> TelemetryManager.trackEvent() / .setTag()
```

## State Transitions

```
TelemetryManager:
  [Uninitialized] --init(projectId)--> [Initialized]  (projectId truthy, not test env)
  [Uninitialized] --init(empty)-----> [Disabled]       (stays uninitialized, all calls are no-ops)
  [Uninitialized] --init(test env)--> [Disabled]       (navigator.webdriver detected)
  [Initialized]   --trackEvent()----> [Initialized]    (fires event, state unchanged)
  [Initialized]   --setTag()-------> [Initialized]     (sets tag, state unchanged)
  [Disabled]       --trackEvent()----> [Disabled]       (no-op)
  [Disabled]       --setTag()-------> [Disabled]        (no-op)
```

No destructive transitions — once initialized or disabled, the state is permanent for the page session.
