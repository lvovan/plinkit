# plinkit Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-24

## Active Technologies
- TypeScript 5.9 (strict mode) + Planck.js 1.4 (physics), Vite 7.3 (build), Vitest 4.0 (test), Playwright 1.58 (e2e) (003-collision-interaction-updates)
- N/A (browser-only, all state in runtime) (003-collision-interaction-updates)
- TypeScript (strict mode), ES2022 target + Planck.js ^1.4.3 (physics), Vite (bundler) (002-gameplay-tuning)
- N/A (all state in-memory, browser-only SPA) (002-gameplay-tuning)
- TypeScript 5.9, strict mode (`strict: true`, `no-explicit-any: error`) + Planck.js 1.4 (2D physics), Canvas 2D (rendering), Vite 7.3 (build), Web Audio API (audio) (004-puck-rotation-friction)
- N/A — all state in-memory (004-puck-rotation-friction)
- TypeScript 5.9.3 (strict mode) + Planck.js ^1.4.3 (physics), Vite 7.3.1 (bundler) — no new runtime dependencies (raw Web Audio API for synthesis) (005-gameplay-audio-polish)
- N/A — all state in browser runtime (005-gameplay-audio-polish)

- TypeScript 5.x, strict mode (`strict: true`) + Planck.js (2D physics, ~56 KB gzip), Raw Canvas 2D (rendering, 0 KB), Web Audio API (audio, built-in), Vite (build tooling) (001-multiplayer-plinko)

## Project Structure

```text
src/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.x, strict mode (`strict: true`): Follow standard conventions

## Recent Changes
- 005-gameplay-audio-polish: Added TypeScript 5.9.3 (strict mode) + Planck.js ^1.4.3 (physics), Vite 7.3.1 (bundler) — no new runtime dependencies (raw Web Audio API for synthesis)
- 004-puck-rotation-friction: Added TypeScript 5.9, strict mode (`strict: true`, `no-explicit-any: error`) + Planck.js 1.4 (2D physics), Canvas 2D (rendering), Vite 7.3 (build), Web Audio API (audio)

- 001-multiplayer-plinko: Added TypeScript 5.x, strict mode (`strict: true`) + Planck.js (2D physics, ~56 KB gzip), Raw Canvas 2D (rendering, 0 KB), Web Audio API (audio, built-in), Vite (build tooling)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
