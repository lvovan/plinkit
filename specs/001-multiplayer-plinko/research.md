# Research: Multi-Player Plinko Game

**Date**: 2026-02-24
**Feature**: [spec.md](spec.md) | [plan.md](plan.md)

## Research Tasks & Decisions

### R1 — Physics Engine Selection

**Decision**: Planck.js

**Rationale**: Planck.js (Box2D port) provides same-session determinism,
first-class fixed-timestep API, TypeScript types (written in TS), and
~56 KB gzipped bundle size. Cross-platform determinism (Rapier's WASM
soft-float at ~470 KB) is unnecessary for a couch game where all
players share one device. Matter.js is eliminated by its lack of
determinism guarantees and stale maintenance.

**Alternatives considered**:

| Engine | Bundle (gzip) | Determinism | TS Types | Status | Verdict |
|--------|--------------|-------------|----------|--------|---------|
| Matter.js | ~26 KB | No guarantee | 3rd-party | Stale (~2 yr) | Eliminated |
| Planck.js | ~56 KB | Same-session | First-party | Active | **Selected** |
| Rapier (WASM) | ~470 KB | Cross-platform | First-party | Active | Overkill/too large |

### R2 — Rendering Approach

**Decision**: Raw Canvas 2D API (no rendering library)

**Rationale**: The game renders ~320 primitives per frame (120 pins +
80 pucks + particles + UI). This is 1–2 orders of magnitude below
where Canvas 2D becomes a bottleneck. Canvas 2D adds 0 KB to the
bundle, has excellent TypeScript support (built into lib.dom.d.ts),
is hardware-accelerated on all 2022-era mobile devices, and avoids
WebGL risks (context loss, shader compilation delay). The rendering
module should expose a clean interface (`drawBoard(state)`) so that
migration to PixiJS/WebGL is straightforward if the workload grows.

**Alternatives considered**:

| Option | Bundle (gzip) | Mobile 60fps | Fit for workload | Verdict |
|--------|--------------|--------------|-----------------|---------|
| Raw Canvas 2D | 0 KB | Yes | Perfect | **Selected** |
| PixiJS v8 | ~90–110 KB | Yes | Overkill | Rejected (budget) |
| Konva.js | ~45–55 KB | Risky | Wrong tool | Rejected (perf/fit) |
| Raw WebGL | 0 KB | Yes | Massive overkill | Rejected (effort) |

### R3 — Flick Gesture Detection

**Decision**: Pointer Events API with velocity-window sampling

**Rationale**: The Pointer Events API provides a single code path for
mouse + touch + pen input. `pointerId` handles multi-touch gating
(track first pointer, ignore others). `setPointerCapture()` ensures
fast flicks that leave the canvas are still tracked. Set
`touch-action: none` on the canvas to prevent browser scroll/zoom.

**Implementation pattern**:
- `pointerdown`: Record start position. Set `setPointerCapture`.
- `pointermove`: Push `{ x, y, timestamp }` into a ring buffer
  (keep last ~100 ms of samples).
- `pointerup`: Compute velocity from ring-buffer samples (last 50–80 ms
  window). If magnitude exceeds minimum threshold (~200 px/sec), emit
  a shove vector `{ dx, dy }` normalized and scaled. Otherwise ignore
  (tap or slow drag).
- Quantize the resulting vector to fixed precision (e.g., round to
  nearest 0.001) to ensure determinism.

**Alternatives considered**: Separate touch + mouse event handling
rejected due to dual-firing on mobile, two code paths, and no pointer
capture equivalent for touch events.

### R4 — Audio Strategy

**Decision**: Web Audio API with audio sprites

**Rationale**: Web Audio API is the only viable choice for game SFX:
<1 ms playback latency (pre-decoded AudioBuffers), unlimited polyphony
via lightweight AudioBufferSourceNodes, per-sound gain control, and
sprite region playback via `source.start(when, offset, duration)`.
HTMLAudioElement has 20–100 ms latency, limited concurrency, and no
per-sound controls — unsuitable for rapid pin collisions.

**Key patterns**:
- **Audio unlock**: On first user gesture (`pointerdown`), create/resume
  the `AudioContext`. Play a silent buffer to trigger iOS Safari wake.
  Gate all subsequent playback on `context.state === 'running'`.
- **Audio sprites**: Pack all SFX into a single OGG file (with MP3
  fallback). Define a sprite map with `{ name, offset, duration }`.
  Decode once at load, play sub-regions. Reduces HTTP requests and
  total file size.
- **Sound pool**: For rapid-fire sounds (pin collisions), reuse the
  same AudioBuffer but create a new AudioBufferSourceNode per play.
  Apply slight pitch variation (±5% playbackRate) to avoid machine-gun
  repetition.
- **Format**: OGG Vorbis primary (Chrome, Firefox, Edge), MP3 fallback
  (Safari). ~50–100 KB total for all SFX.
- **Mute control**: Global GainNode between all sources and
  `context.destination`. Toggle gain between 1.0 and 0.0.

**Alternatives considered**: HTMLAudioElement rejected due to latency
and concurrency limits. External audio libraries (Howler.js, Tone.js)
rejected due to bundle budget — Web Audio API is fully sufficient.

### R5 — Deterministic Physics with Planck.js

**Decision**: Fixed-timestep accumulator pattern at 1/60 s with
deterministic input queuing

**Rationale**: Planck.js (Box2D) is deterministic within a single JS
runtime as long as: (a) the timestep never varies, (b) inputs are
applied at deterministic simulation ticks (not wall-clock time),
(c) no floating-point randomness is introduced, (d) bodies are
created/destroyed in a fixed order.

**Key implementation details**:

- **Fixed timestep**: `world.step(1/60, 8, 3)` — 8 velocity iterations,
  3 position iterations. Accumulator pattern: accumulate real elapsed
  time, consume in fixed-size steps, clamp frame time to 250 ms, cap
  at 4 steps per frame to prevent spiral of death.
- **Rendering interpolation**: Store previous + current positions.
  Interpolate based on accumulator remainder for smooth rendering
  between physics steps.
- **Shove forces**: Use `body.applyLinearImpulse(impulse, worldCenter)`
  for instantaneous velocity change. Queue shove impulses with a
  simulation tick number. Apply them *before* `world.step()` at that
  tick. Quantize input vectors to fixed precision.
- **Sleeping**: Planck.js sleeping is deterministic. Settled pucks
  automatically sleep, reducing solver cost. The island system wakes
  only bodies disturbed by new collisions. Keep sleeping enabled.
- **Stalled body detection**: Primary signal = `body.isAwake() === false`
  + puck center is within a bucket's x-range. Hard timeout at ~10s:
  if a puck is still awake after 10 seconds, force-assign it to the
  nearest bucket.
- **Performance**: With sleeping, the typical solved set is ~5 active
  bodies per step. Estimated ~1 ms per physics step on Snapdragon
  680. 80 total bodies is well within budget.
- **Body configuration**: Pins as static bodies. Pucks as dynamic
  circles with `fixedRotation: true` (rotation is invisible for
  circles, saves solver work). Avoid `bullet: true` unless tunneling
  is observed during testing.

## Bundle Budget Estimate

| Component | Estimated gzip size |
|-----------|-------------------|
| Planck.js | ~56 KB |
| App code (TS compiled) | ~30–50 KB |
| Audio sprites (OGG + MP3) | ~50–100 KB |
| Sprite assets | ~50–100 KB |
| Service worker + HTML | ~5 KB |
| Canvas 2D renderer | 0 KB (built-in) |
| **Total** | **~191–311 KB** |

Comfortable margin within the 1 MB gzipped budget. Bundle size concern
from Constitution Check is resolved: ⚠️ WATCH → ✅ PASS.
