# Quickstart: Gameplay Audio Polish

**Feature**: 005-gameplay-audio-polish  
**Branch**: `005-gameplay-audio-polish`

## Prerequisites

- Node.js (LTS) + npm
- Git

## Setup

```bash
git checkout 005-gameplay-audio-polish
npm install
npm run dev        # Starts Vite dev server at localhost:5173
```

## What This Feature Changes

1. **Unlimited shoves** — The per-turn shove count limit (previously 2) is removed. Players can shove as many times as they want while the puck is in the shove zone. The shove counter UI is deleted.

2. **Puck patterns** — All pucks now have a visible non-solid pattern (stripes, dots, or rings) assigned automatically via round-robin. The `'solid'` pattern type is removed from the codebase.

3. **Synthesized SFX** — Sound effects (drop, pin-hit, shove, bucket-land, winner, tick, timeout) are generated in real-time using the Web Audio API. No audio files are loaded.

4. **Background music** — Two procedural looping tracks: a calm lobby track (registration/results screens) and an upbeat carnival gameplay track (during active play). Crossfades between tracks on game state transitions.

5. **Independent mute toggles** — Separate SFX and music mute buttons in the UI.

## Key Files

| File | Purpose |
|------|---------|
| `src/audio/audio-manager.ts` | Rewritten: Web Audio synth engine for SFX |
| `src/audio/synth-effects.ts` | NEW: Factory functions for each SFX type |
| `src/audio/music-manager.ts` | NEW: Step-sequencer for lobby + gameplay music |
| `src/audio/sprite-map.ts` | DELETED: No longer needed |
| `src/config/game-config.ts` | Modified: `maxShovesPerTurn` removed |
| `src/types/index.ts` | Modified: `'solid'` removed from `PuckPattern`, palette updated |
| `src/types/contracts.ts` | Modified: `AudioManager` and `UIOverlayManager` contracts updated, `MusicManager` added |
| `src/ui/shove-counter.ts` | DELETED: Shove counter no longer exists |
| `src/ui/overlay-manager.ts` | Modified: Shove counter removed, audio toggles added |
| `src/main.ts` | Modified: Shove limit removed, music wiring, audio init |

## Running Tests

```bash
npm test              # Unit + integration tests (Vitest)
npx playwright test   # E2E tests
```

## Manual Testing Scenarios

### Unlimited Shoves
1. Start a game with 2 players
2. Drop a puck
3. Perform 5+ shove gestures while the puck is in the shove zone
4. Verify all shoves apply force — none are rejected
5. Verify no shove counter appears on screen

### Puck Patterns
1. Start a game with 2 players
2. Observe that Player 1 has a striped puck and Player 2 has a dotted puck
3. Drop a puck and observe the pattern rotating on pin bounces
4. Before dropping, verify the ghost puck shows the pattern at a static angle

### Sound Effects
1. Start a game and ensure audio is unmuted
2. Drop a puck — listen for a clunk/drop sound
3. Watch the puck bounce through pins — listen for short tapping sounds on each hit
4. Perform a shove — listen for a whoosh sound
5. Wait for the puck to land in a bucket — listen for a celebratory sound
6. Toggle the SFX mute button — verify SFX stops but music continues

### Background Music
1. Open the game — after first click, verify calm lobby music plays
2. Start a game and drop the first puck — verify music crossfades to upbeat carnival track
3. Finish the game — verify music crossfades back to calm lobby track
4. Toggle the music mute button — verify music stops but SFX continues
5. Verify music loops without gaps for 5+ minutes

## Architecture Notes

- All audio uses a single shared `AudioContext` with `GainNode` bus routing:
  - `sfxGain` — SFX mute/volume control
  - `musicGain` — Music mute/volume control (with sub-gains per track for crossfading)
- SFX are fire-and-forget `OscillatorNode` + `GainNode` combinations, no persistent synth instances
- Music uses a look-ahead step-sequencer scheduling pattern against `AudioContext.currentTime`
- No external audio libraries — everything is native Web Audio API
