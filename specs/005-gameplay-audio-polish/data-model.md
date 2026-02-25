# Data Model: Gameplay Audio Polish

**Feature**: 005-gameplay-audio-polish  
**Date**: 2026-02-25

## Entity Changes

### Modified Entities

#### PuckPattern (type)

**Before**: `'solid' | 'stripes' | 'dots' | 'rings'`  
**After**: `'stripes' | 'dots' | 'rings'`

- Remove `'solid'` from the union type. All pucks must have a visible rotation pattern.
- The `'solid'` value becomes invalid — any existing references to `'solid'` must be updated.

#### PUCK_PALETTE (constant)

**Before**: 4 entries, first one is `{ color: '#E63946', pattern: 'solid', label: 'Red Solid' }`  
**After**: 4 entries, all with non-solid patterns. Patterns assigned round-robin:

| Index | Color | Pattern | Label |
|-------|-------|---------|-------|
| 0 | `#E63946` (Red) | `stripes` | Red Stripes |
| 1 | `#457B9D` (Blue) | `dots` | Blue Dots |
| 2 | `#2A9D8F` (Teal) | `rings` | Teal Rings |
| 3 | `#E9C46A` (Gold) | `stripes` | Gold Stripes |

Pattern cycles: stripes → dots → rings → stripes → ...

#### ShoveConfig (interface)

**Before**: Has `maxShovesPerTurn: number` field  
**After**: Remove `maxShovesPerTurn` field entirely

No replacement field is needed — the absence of a limit means unlimited.

**Cascading changes**:
- `GameConfig.shoveConfig` no longer has `maxShovesPerTurn`
- `game-config.ts` default: remove `maxShovesPerTurn: 2`
- `TurnContext.shovesRemaining` — remove this field (no longer meaningful)
- `main.ts` — remove `shovesUsed` counter and the `shovesUsed < config.shoveConfig.maxShovesPerTurn` guard
- `UIOverlayManager.updateShoveCounter()` — remove this method
- `ShoveCounterOverlay` — delete entire file

#### SoundName (type)

**Before**: `'drop' | 'pinHit' | 'shove' | 'bucketLand' | 'winner' | 'tick' | 'timeout'`  
**After**: Same union — no change needed. All 7 sound names remain valid. The implementation changes from sprite-sheet playback to Web Audio synthesis, but the type is unchanged.

#### AudioManager (interface)

**Before**:
```typescript
interface AudioManager {
  unlock(): Promise<void>;
  load(spriteUrl: string, spriteMap: SpriteMap): Promise<void>;
  play(name: SoundName, options?: { pitchVariation?: number }): void;
  setVolume(volume: number): void;
  toggleMute(): void;
}
```

**After**:
```typescript
interface AudioManager {
  unlock(): Promise<void>;
  init(): void;  // replaces load() — sets up synth instruments, no URL needed
  play(name: SoundName, options?: { pitchVariation?: number }): void;
  setSfxVolume(volume: number): void;
  toggleMuteSfx(): void;
  isSfxMuted(): boolean;
}
```

Changes:
- `load(spriteUrl, spriteMap)` → `init()` — no external files to load
- `setVolume()` → `setSfxVolume()` — scoped to SFX; music has its own volume
- `toggleMute()` → `toggleMuteSfx()` — scoped to SFX
- Add `isSfxMuted()` — query state for UI toggle display
- Remove `SpriteMap` interface (no longer needed)

### New Entities

#### MusicTrack (type)

```typescript
type MusicTrack = 'lobby' | 'gameplay';
```

Identifies which of the two music tracks is active or requested.

#### MusicManager (interface)

```typescript
interface MusicManager {
  init(ctx: AudioContext, destination: AudioNode): void;
  startTrack(track: MusicTrack): void;
  crossfadeTo(track: MusicTrack, durationMs?: number): void;
  stop(): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  isMuted(): boolean;
}
```

- Manages two procedural looping music tracks (lobby + gameplay)
- Crossfades between tracks on game state transitions
- Independent mute/volume from SFX
- Connects to shared `AudioContext` via provided destination node

#### AudioBus (internal concept)

Not a formal interface — an implementation detail. A `GainNode` routing topology:

```
AudioContext
  └─ masterGain
       ├─ sfxGain   → [SFX nodes connect here]
       └─ musicGain
            ├─ lobbyGain    → [lobby track sources]
            └─ gameplayGain → [gameplay track sources]
```

### Removed Entities

#### SpriteMap (interface)

```typescript
// REMOVED — no longer needed
interface SpriteMap {
  [name: string]: { offset: number; duration: number };
}
```

Sprite-sheet audio is replaced by programmatic synthesis. No offset/duration mapping needed.

#### ShoveCounterOverlay (class)

Entire class removed. No shove count to display.

#### UIOverlayManager.updateShoveCounter() (method)

```typescript
// REMOVED from interface
updateShoveCounter(remaining: number, total: number): void;
```

No replacement — the method is simply deleted from the contract.

## Validation Rules

- `PuckPattern` must be one of `'stripes' | 'dots' | 'rings'` — never `'solid'`
- `PUCK_PALETTE` entries must all have non-solid patterns
- Each player in a game must have a unique combination of `color + pattern` (guaranteed by palette ordering for ≤4 players; for >4, palette must cycle with unique combos)
- `SFX volume` and `music volume` are independent floats clamped to [0, 1]
- Music crossfade duration defaults to 1500ms if not specified

## State Transitions

### Music Track State Machine

```
[init] → lobby (on first user interaction)
lobby → gameplay (on first puck drop of a round)
gameplay → lobby (on results screen shown)
lobby → gameplay (on new round, first puck drop)
```

Music state is driven by game phase transitions:
- `registration` → lobby track
- `playing` (first drop) → gameplay track  
- `results` → lobby track
- `tieBreaker` → gameplay track continues
- `ended` → lobby track
