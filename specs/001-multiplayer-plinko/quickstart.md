# Quickstart: Multi-Player Plinko Game

**Date**: 2026-02-24

## Prerequisites

- Node.js 20+ (LTS)
- npm 10+ or pnpm 9+

## Setup

```bash
# Clone and enter the project
git clone <repo-url> plinkit
cd plinkit
git checkout 001-multiplayer-plinko

# Install dependencies
npm install

# Start the dev server (Vite)
npm run dev
```

The game opens at `http://localhost:5173`.

## Project Structure

```
src/
├── config/              # Game configuration (physics, board, scoring)
├── core/                # Game state machine, turn logic, scoring
├── physics/             # Planck.js wrapper, deterministic simulation
├── input/               # Pointer Events flick/gesture detection
├── rendering/           # Canvas 2D renderer
├── audio/               # Web Audio API sound manager
├── ui/                  # DOM overlays (registration, scoreboard, results)
├── types/               # Shared TypeScript interfaces
└── main.ts              # Entry point

public/
├── assets/sprites/      # Visual assets
├── assets/audio/        # Sound effect sprites
├── index.html
└── sw.js                # Service worker

tests/
├── unit/                # Game logic, scoring, physics (Vitest)
├── integration/         # Full game flow tests (Vitest)
└── e2e/                 # Visual smoke tests (Playwright)
```

## Key Commands

```bash
# Development
npm run dev              # Start Vite dev server with HMR
npm run build            # Production build to dist/

# Testing
npm run test             # Run all Vitest tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # Playwright E2E tests

# Quality
npm run lint             # TypeScript strict + ESLint
npm run typecheck        # tsc --noEmit
```

## How to Play (Manual Testing)

1. Open the game in a browser
2. Register 2–4 players (enter names, each gets a unique puck)
3. Configure round count (default 5) and press "Start"
4. On your turn:
   - Drag left/right to position the puck along the top
   - Tap/click to release (or wait 15 seconds for auto-drop)
   - After release, flick to shove (up to 2 shoves, only in top 2/3)
5. Watch the puck bounce through pins and land in a scoring bucket
6. Scores accumulate; after all rounds, winner is declared
7. Results screen: "Play Again" / "New Players" / "Quit"

## Technology Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript 5.x strict | Constitution requirement |
| Physics | Planck.js | Deterministic, 56 KB gzip, Box2D-proven |
| Rendering | Raw Canvas 2D | 0 KB overhead, sufficient for ~320 primitives |
| Audio | Web Audio API | Built-in, <1 ms latency, unlimited polyphony |
| Input | Pointer Events API | Unified mouse/touch, single code path |
| Build | Vite | Fast HMR, tree-shaking, TypeScript out of the box |
| Testing | Vitest + Playwright | Fast unit tests, browser E2E |

## Configuration

Physics parameters, board layout, and scoring values are defined in
`src/config/` as TypeScript objects. To tune gameplay:

- `src/config/physics.ts` — gravity, restitution, friction, iterations
- `src/config/board.ts` — pin rows, bucket count, spacing, scoring
- `src/config/shove.ts` — max force, flick threshold, shove zone limit
