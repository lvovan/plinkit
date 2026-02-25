# Quickstart: Puck Rotation & Friction Physics

**Date**: 2026-02-25

## Prerequisites

- Node.js 20+ (LTS)
- npm 10+ or pnpm 9+

## Setup

```bash
# Clone and enter the project
git clone <repo-url> plinkit
cd plinkit
git checkout 004-puck-rotation-friction

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The game opens at `http://localhost:5173`.

## What This Feature Changes

This feature enables puck rotation physics. Pucks now spin when
they hit pins, other pucks, or receive shoves. The spin is visible
through pattern rotation (stripes, dots) on the puck surface.

### Files Modified

| File | Change |
|------|--------|
| `src/types/index.ts` | `PhysicsConfig` + `ShoveConfig` gain new fields |
| `src/types/contracts.ts` | `RenderState.pucks[]` gains `angle` field |
| `src/config/game-config.ts` | New defaults for friction, angular damping, velocity cap, shove offset |
| `src/physics/simulation.ts` | `fixedRotation: false`, angular damping, velocity clamping, off-center shove |
| `src/rendering/renderer.ts` | Canvas rotation transform for puck patterns |
| `src/main.ts` | Pass `angle` from snapshot to render state |

### No New Files

This feature modifies only existing source files. No new modules,
dependencies, or assets are introduced.

## Key Commands

```bash
# Development
npm run dev              # Vite dev server with HMR

# Testing
npm run test             # All Vitest tests
npm run test:unit        # Unit tests only
npm run test:e2e         # Playwright E2E tests

# Quality
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
```

## Manual Testing: Rotation

1. **Start a game** with 2+ players
2. **Register** — choose a player with "stripes" or "dots" pattern for best visibility
3. **Drop a puck** off-center so it grazes a pin on one side
4. **Observe**: The puck's pattern should visibly spin after hitting the pin
5. **Shove a puck**: Each shove should add a small spin in addition to lateral movement
6. **Drop a second puck** onto a settled one: Both pucks should show spin changes on collision

## Tuning Rotation (config/game-config.ts)

| Parameter | Default | Effect |
|-----------|---------|--------|
| `puckFriction` | `0.4` | Higher = more spin from contacts |
| `pinFriction` | `0.3` | Higher = more spin from pin hits |
| `angularDamping` | `3.0` | Higher = spin decays faster (~1s at 3.0) |
| `maxAngularVelocity` | `12.57` | Cap in rad/s (12.57 = 2 rotations/sec) |
| `shoveOffsetFraction` | `0.25` | Higher = more spin per shove (0–1 range) |
