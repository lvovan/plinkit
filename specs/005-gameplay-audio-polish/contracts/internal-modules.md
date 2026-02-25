# Internal Module Contracts: Gameplay Audio Polish

**Feature**: 005-gameplay-audio-polish  
**Date**: 2026-02-25

## Contract Changes Summary

| Contract | Change | Impact |
|----------|--------|--------|
| AudioManager | Redesigned — sprite-sheet → synthesis | Breaking change |
| MusicManager | New contract | New module |
| UIOverlayManager | Remove `updateShoveCounter()` | Breaking change |
| GameStateMachine | Remove `shovesRemaining` from `TurnContext` | Breaking change |
| PhysicsSimulation | No changes | None |
| InputManager | No changes | None |
| Renderer | No changes (pattern rendering already implemented) | None |

---

## Contract 4 (Revised): AudioManager

Replaces sprite-sheet playback with Web Audio API synthesis. SFX-only — music is handled by the new `MusicManager` contract.

```typescript
export type SoundName = 'drop' | 'pinHit' | 'shove' | 'bucketLand' | 'winner' | 'tick' | 'timeout';

export interface AudioManager {
  /**
   * Resume the AudioContext after user gesture (browser autoplay policy).
   * Must be called from a user-initiated event handler.
   */
  unlock(): Promise<void>;

  /**
   * Initialize synth instruments and audio bus routing.
   * Replaces the old load(spriteUrl, spriteMap) method.
   * No external resources are fetched — all audio is synthesized.
   */
  init(): void;

  /**
   * Play a named sound effect using Web Audio synthesis.
   * No-ops if SFX is muted or AudioContext is not initialized.
   * @param name - Which SFX to trigger
   * @param options - Optional: pitchVariation (±fraction, e.g. 0.15 = ±15%)
   */
  play(name: SoundName, options?: { pitchVariation?: number }): void;

  /**
   * Set SFX volume (0.0 = silent, 1.0 = full).
   * Does not affect music volume.
   */
  setSfxVolume(volume: number): void;

  /** Toggle SFX mute on/off. Does not affect music. */
  toggleMuteSfx(): void;

  /** Query whether SFX is currently muted. */
  isSfxMuted(): boolean;

  /**
   * Get the shared AudioContext for use by MusicManager.
   * Returns the same context used by SFX routing.
   */
  getContext(): AudioContext;

  /**
   * Get the master gain node that all audio routes through.
   * MusicManager should connect its output here.
   */
  getMasterGain(): GainNode;
}
```

**Breaking changes from previous contract**:
- `load(spriteUrl, spriteMap)` → `init()` (no parameters)
- `setVolume()` → `setSfxVolume()` (scoped naming)
- `toggleMute()` → `toggleMuteSfx()` (scoped naming)
- Added: `isSfxMuted()`, `getContext()`, `getMasterGain()`
- Removed: `SpriteMap` interface (no longer needed)

---

## Contract 7 (New): MusicManager

Manages two procedural looping music tracks with crossfade support and independent mute control.

```typescript
export type MusicTrack = 'lobby' | 'gameplay';

export interface MusicManager {
  /**
   * Initialize the music system.
   * @param ctx - Shared AudioContext (from AudioManager.getContext())
   * @param destination - Audio node to connect output to (from AudioManager.getMasterGain())
   */
  init(ctx: AudioContext, destination: AudioNode): void;

  /**
   * Start playing a music track immediately (no crossfade).
   * Stops any currently playing track first.
   * Used for initial music start after first user interaction.
   */
  startTrack(track: MusicTrack): void;

  /**
   * Crossfade from the current track to the specified track.
   * If no track is playing, behaves like startTrack.
   * @param track - Target track to crossfade to
   * @param durationMs - Crossfade duration in ms (default: 1500)
   */
  crossfadeTo(track: MusicTrack, durationMs?: number): void;

  /**
   * Stop all music playback.
   */
  stop(): void;

  /**
   * Set music volume (0.0 = silent, 1.0 = full).
   * Does not affect SFX volume.
   */
  setVolume(volume: number): void;

  /** Toggle music mute on/off. Does not affect SFX. */
  toggleMute(): void;

  /** Query whether music is currently muted. */
  isMuted(): boolean;

  /** Query which track is currently active (or null if stopped). */
  getCurrentTrack(): MusicTrack | null;
}
```

---

## Contract 5 (Revised): GameStateMachine — TurnContext

Remove `shovesRemaining` from `TurnContext` since shoves are now unlimited.

```typescript
export interface TurnContext {
  player: Player;
  turnNumber: number;
  roundNumber: number;
  // REMOVED: shovesRemaining: number;
  timerSeconds: number;
}
```

---

## Contract 6 (Revised): UIOverlayManager

Remove `updateShoveCounter()`. Add music/SFX mute toggle support.

```typescript
export interface UIOverlayManager {
  showRegistration(maxPlayers: number): Promise<PlayerRegistration[]>;
  updateScoreboard(players: Player[]): void;
  showTurnIndicator(player: Player, timerSeconds: number): void;
  updateTimer(secondsRemaining: number): void;
  // REMOVED: updateShoveCounter(remaining: number, total: number): void;
  showResults(players: Player[], winner: Player | Player[]): Promise<ResultsAction>;
  showOutOfBounds(): void;
  showFarewell(): void;
  hideAll(): void;

  /** NEW: Set up mute toggle buttons and wire callbacks */
  initAudioToggles(
    onToggleSfx: () => void,
    onToggleMusic: () => void
  ): void;

  /** NEW: Update toggle button visual state */
  updateAudioToggleState(sfxMuted: boolean, musicMuted: boolean): void;
}
```

**Changes**:
- Removed: `updateShoveCounter(remaining, total)`
- Added: `initAudioToggles(onToggleSfx, onToggleMusic)` — creates two toggle buttons in the UI
- Added: `updateAudioToggleState(sfxMuted, musicMuted)` — updates button icons/states

---

## Wiring: main.ts Integration Points

The following integration changes are needed in `main.ts`:

1. **Shove guard** — Remove `shovesUsed < config.shoveConfig.maxShovesPerTurn` check. Keep only `activePuckId && !shovesDisabled` as the guard condition.

2. **Shove tracking** — Remove `shovesUsed` variable and all increment/reset logic. Remove all `overlays.updateShoveCounter()` calls.

3. **Audio init** — Replace `audioManager.load(url, spriteMap)` with `audioManager.init()`. No URL needed.

4. **Music manager** — Create `MusicManager` instance. Connect to `audioManager.getContext()` and `audioManager.getMasterGain()`. Call `musicManager.init()`.

5. **Music transitions** — Wire music track changes to game state:
   - On `registration` screen shown (after first user interaction): `musicManager.startTrack('lobby')`
   - On first puck drop of a round: `musicManager.crossfadeTo('gameplay')`
   - On `results` screen shown: `musicManager.crossfadeTo('lobby')`

6. **Audio toggles** — Call `overlays.initAudioToggles()` with callbacks that delegate to `audioManager.toggleMuteSfx()` and `musicManager.toggleMute()` respectively.
