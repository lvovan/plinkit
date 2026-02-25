# Quickstart: Menu System & Layout Polish

**Feature**: 007-menu-layout-polish  
**Branch**: `007-menu-layout-polish`

## Prerequisites

```bash
git checkout 007-menu-layout-polish
npm ci
```

## Dev Server

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## Verification by User Story

### US1 — Scoreboard Ranked Display

1. Register 3–4 players and start a game
2. Play through several turns until scores diverge
3. Observe the scoreboard in the top-right corner
4. **Verify**: Players are sorted by score descending (highest at top)
5. **Verify**: When a rank change occurs (player overtakes another), the row slides smoothly to its new position
6. **Verify**: Ties preserve their previous relative order

### US2 — Sound Controls Repositioned

1. Load the game on any screen size
2. **Verify**: SFX and music toggle buttons are visible in the **upper-left** corner
3. **Verify**: Sound controls do not overlap the scoreboard, turn indicator, or timer
4. Tap/click each toggle — confirm they still work correctly
5. Resize the window (or test on mobile) — confirm position stays upper-left without overlap

### US3 — Welcome Attribution

1. Open the app fresh (or click "New Players" to return to registration)
2. **Verify**: At the bottom of the registration overlay, the text "©️ Luc Vo Van, 2026 – Built with AI" is visible
3. Test on narrow mobile (320px) — confirm text doesn't overflow or overlap inputs
4. Test on ultra-wide (3440px) — confirm text stays centered and readable

### US4 — Collision Multiplier Format

1. Start a game and drop a puck into a dense pin area
2. Observe collision flash popups as the puck bounces
3. **Verify**: Each popup reads "×N.N" (e.g., "×1.0", "×1.2", "×3.5") — multiplication sign **before** the number
4. **Verify**: No trailing "x" or "×" after the number

### US5 — Slow-Motion Effect

1. Drop a puck from the top of the board
2. Watch as the puck falls past the shove line (the dashed boundary)
3. **Verify**: The puck visibly slows down for ~2 seconds
4. **Verify**: Music pitch and tempo drop proportionally during slow-mo
5. **Verify**: SFX (pin hits) sound deeper/slower during slow-mo
6. **Verify**: The timer and scoreboard continue at normal speed
7. **Verify**: Speed returns smoothly (no abrupt snap)
8. Drop a second puck in the same turn — confirm slow-mo does NOT trigger again (once per turn)

### US6 — Countryside Background

1. Load the game
2. **Verify**: A countryside background (sky gradient, rolling hills, sun, clouds) is visible behind and around the game board
3. **Verify**: Clouds drift slowly across the sky
4. **Verify**: The background does not obscure pins, pucks, buckets, or score popups
5. Find the animation toggle button near the sound controls (upper-left)
6. Tap/click it — **Verify**: Animation stops (clouds freeze), background remains as static scene
7. Tap/click again — **Verify**: Animation resumes
8. Resize the window — confirm background scales without artifacts

## Running Tests

```bash
# Unit tests (includes new scoreboard, slow-motion, and format tests)
npm test

# E2E tests
npx playwright test
```

## Key Files to Inspect

| Area | File |
|------|------|
| Scoreboard sort + animation | `src/ui/scoreboard.ts` |
| Slow-motion controller | `src/core/slow-motion.ts` |
| Background renderer | `src/rendering/background.ts` |
| Physics timeScale | `src/physics/simulation.ts` |
| Music timeScale | `src/audio/music-manager.ts` |
| SFX timeScale | `src/audio/audio-manager.ts`, `src/audio/synth-effects.ts` |
| Multiplier format | `src/main.ts` (`formatMultiplier()`) |
| Audio toggles CSS | `public/styles.css` |
| Registration subtitle | `src/ui/registration.ts` |
| Animation toggle | `src/ui/overlay-manager.ts` |
| Slow-motion config | `src/config/game-config.ts` |
