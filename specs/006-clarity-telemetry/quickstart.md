# Quickstart: Microsoft Clarity Telemetry

**Feature**: 006-clarity-telemetry  
**Branch**: `006-clarity-telemetry`

## Prerequisites

- Node.js 18+ and npm
- A Microsoft Clarity project ID (from [clarity.microsoft.com](https://clarity.microsoft.com))
- Existing Plinkit development environment

## Setup

### 1. Install the Clarity SDK

```bash
npm install @microsoft/clarity
```

### 2. Create local `.env` file

Create a `.env` file in the **repo root** (not `src/`):

```bash
echo "VITE_CLARITY_PROJECT_ID=your-project-id-here" > .env
```

Replace `your-project-id-here` with your actual Clarity project ID.

### 3. Run the dev server

```bash
npm run dev
```

Clarity will initialize in the browser. Open DevTools → Network tab and look for requests to `www.clarity.ms` to confirm.

## Verifying the Integration

### Check Clarity is loading

1. Open the app in a browser
2. Open DevTools → Network tab
3. Filter by `clarity` — you should see requests to `www.clarity.ms/tag/<projectId>` and `/collect` POST requests

### Check cookieless mode

1. Open DevTools → Application → Cookies
2. Verify no `_clck` or `_clsk` cookies are set for the domain

### Check custom events

1. Play a game through to completion
2. Log into [clarity.microsoft.com](https://clarity.microsoft.com) → your project
3. Check Recordings — recent sessions should show custom events (game_start, turn_complete, game_end)
4. Check Filters — custom tags (playerCount, winningScore) should be available

### Check resilience

1. Install an ad blocker (e.g., uBlock Origin)
2. Add `www.clarity.ms` to the block list
3. Reload the app — the game should work normally with zero console errors

## Running Tests

```bash
# Unit tests (includes telemetry guard tests)
npm run test:unit

# E2E tests (Clarity auto-skips via navigator.webdriver)
npm run test:e2e
```

## Key Files

| File | Purpose |
|------|---------|
| `src/telemetry/clarity.ts` | Telemetry wrapper module — all Clarity SDK calls go through here |
| `src/vite-env.d.ts` | TypeScript type declarations for `import.meta.env.VITE_CLARITY_PROJECT_ID` |
| `src/main.ts` | Game flow — calls `initTelemetry()`, `trackEvent()`, `setTag()` at lifecycle points |
| `.env` | Local environment file (not committed) — contains `VITE_CLARITY_PROJECT_ID` |
| `.github/workflows/azure-static-web-apps-deploy.yml` | CI — writes `.env` from GitHub secrets |
| `tests/unit/telemetry/clarity.test.ts` | Unit tests for guard logic and event dispatch |
