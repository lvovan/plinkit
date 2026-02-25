# Research: Gameplay Audio Polish

**Feature**: 005-gameplay-audio-polish  
**Date**: 2026-02-25

## Decision 1: Audio Library Choice

**Decision**: Use the native Web Audio API with a thin custom wrapper — no external audio library.

**Rationale**: The game's audio needs are modest (7 SFX types + 2 procedural music tracks). Tone.js adds ~120–150 KB gzipped for features this game doesn't need (Transport sync, complex signal routing, AudioWorklets, MIDI). A custom wrapper achieves the same results in ~2–5 KB, well within the <1 MB bundle constraint.

**Alternatives considered**:
- **Tone.js**: Full-featured audio synthesis framework. Adds 120–150 KB gzipped (30–40% of total bundle). Tree-shaking is limited due to shared global context singletons. Rejected due to bundle size cost for marginal benefits.
- **Howler.js / Pizzicato.js**: Audio playback libraries focused on file-based audio, not synthesis. Not suitable for procedural generation.
- **Raw Web Audio with no wrapper**: Feasible but verbose. A thin typed wrapper improves ergonomics measurably.

## Decision 2: Sound Effect Synthesis Approach

**Decision**: Factory functions per SFX type using native `OscillatorNode` + `GainNode`. Fire-and-forget pattern — no persistent synth instances.

**Rationale**: Each SFX is a short one-shot sound (20–500ms). Creating and discarding Web Audio nodes per sound is efficient and avoids resource management complexity. The Web Audio API garbage-collects disconnected nodes automatically.

**SFX recipes**:
| Sound | Technique | Duration |
|-------|-----------|----------|
| Drop | Sine 200→60 Hz pitch sweep + noise burst (low-pass filtered) | ~200ms |
| Pin Hit | Triangle/sine ping at ~800–1200 Hz, fast decay, ±15% pitch variation | ~50ms |
| Shove | White noise through bandpass filter with frequency sweep 500→3000 Hz | ~200ms |
| Bucket Land | Rising pentatonic arpeggio (C5→E5→G5→C6), bright oscillator + delay | ~300ms |
| Winner | Major chord arpeggio (C4→E4→G4→C5) + sustained chord | ~1500ms |
| Tick | Sine blip at ~1000 Hz | ~20ms |
| Timeout | Square wave at ~150 Hz with slight vibrato via LFO | ~500ms |

**Alternatives considered**:
- **Pre-recorded audio sprites**: Requires sourcing/creating audio files. Adds binary assets to the repo. More complex asset pipeline. Rejected per clarification session decision.
- **Tone.js synths**: Same underlying approach (`OscillatorNode` + `GainNode`) but with framework overhead. Rejected for bundle size.

## Decision 3: Procedural Music Architecture

**Decision**: Custom step-sequencer using `AudioContext.currentTime` look-ahead scheduling. Two independent track instances — one for lobby music, one for gameplay music.

**Rationale**: The standard Web Audio scheduling pattern (schedule notes in small batches ahead of `currentTime`) provides sample-accurate timing without the overhead of a full music framework. Both tracks are simple enough (chord pads + melody + optional percussion) that a custom sequencer is straightforward.

**Track designs**:

### Lobby Track (calm, ambient)
- **Tempo**: ~65 BPM
- **Pad layer**: 2–3 oscillators (sine + triangle) forming simple chords (e.g., Cmaj7), slow LFO on filter cutoff
- **Melody**: Occasional pentatonic notes (C, D, E, G, A) with soft attack/release, sparse timing
- **Character**: Gentle, atmospheric, relaxed

### Gameplay Track (upbeat carnival)
- **Tempo**: ~130 BPM
- **Scale**: C pentatonic (inherently cheerful)
- **Bass**: Root-fifth pattern on quarter notes, sine oscillator, low octave
- **Melody**: 8th-note pattern cycling through pre-composed 2-bar phrases
- **Percussion**: Filtered noise for hi-hat feel (8th notes), low sine thuds for kick (beats 1 & 3)
- **Character**: Playful, suspenseful, town-fair atmosphere

**Alternatives considered**:
- **Tone.js Transport + Sequence**: Purpose-built for this, but brings 120–150 KB of overhead. The scheduling pattern is simple enough to implement directly.
- **Pre-composed audio file loop**: Would require sourcing music, adds binary assets, cannot easily randomize phrases for variety. Rejected per decision to synthesize all audio.

## Decision 4: Audio Bus Architecture

**Decision**: Single shared `AudioContext` with GainNode bus routing for independent SFX/music mute controls.

**Rationale**: Browsers limit concurrent `AudioContext` instances (Safari allows only 4). A single context with gain-based routing is the standard pattern. Independent `GainNode` buses trivially implement separate mute toggles.

**Routing topology**:
```
AudioContext
  └─ masterGain
       ├─ sfxGain → [SFX fire-and-forget nodes connect here]
       └─ musicGain
            ├─ lobbyGain → [lobby track sources]
            └─ gameplayGain → [gameplay track sources]
```

**Crossfade**: `GainNode.gain.linearRampToValueAtTime()` on both track buses over ~1.5 seconds. Both tracks run simultaneously; only their gain changes.

**Alternatives considered**:
- **Two separate AudioContexts**: One for SFX, one for music. Wastes browser context slots, more complex lifecycle management. Rejected.
- **Tone.js CrossFade node**: Same underlying approach but with library dependency. Rejected.

## Decision 5: AudioContext Unlock Strategy

**Decision**: Keep the existing `GameAudioManager.unlock()` pattern — `AudioContext.resume()` on user gesture.

**Rationale**: The existing implementation already follows the correct browser autoplay compliance pattern. No changes needed.

**Alternatives considered**: None — the existing implementation is correct.

## Decision 6: Rate-Limiting Strategy

**Decision**: Keep the existing application-level rate limiter (max 4 sounds per 50ms window) unchanged.

**Rationale**: Shove sounds are human-speed (~2–4 per second max) and won't stack like pin-hit sounds. The existing rate limiter was designed for rapid pin collisions in multiplayer and remains adequate even with unlimited shoves adding more shove-sound triggers.

**Alternatives considered**:
- **Increase the window or cap**: Unnecessary — shove gestures can't physically exceed the current cap rate.
- **Per-SFX-type rate limiting**: More granular but adds complexity. Not needed since the global cap already prevents audio overload.
