# Research: Menu System & Layout Polish

**Feature**: 007-menu-layout-polish  
**Date**: 2025-02-25

## Table of Contents

1. [Scoreboard Rank Animation](#1-scoreboard-rank-animation)
2. [Slow-Motion Physics](#2-slow-motion-physics)
3. [Slow-Motion Audio](#3-slow-motion-audio)
4. [Procedural Background Rendering](#4-procedural-background-rendering)
5. [Minor Changes (No Research Needed)](#5-minor-changes)

---

## 1. Scoreboard Rank Animation

### Decision: Fixed-height CSS transforms

Use `position: absolute` rows positioned via `transform: translateY()` with CSS `transition`.

### Rationale

Four approaches were evaluated:

| Approach | Smooth | Complexity | Reflows | GPU |
|----------|--------|-----------|---------|-----|
| FLIP technique | Yes | Medium | 2 | Yes |
| CSS `order` property | **No** | Trivial | 0 | N/A |
| Web Animations API | Yes | Medium | 2 | Yes |
| **Fixed-height transform** | **Yes** | **Low** | **0** | **Yes** |

Fixed-height transform wins because:
- Scoreboard has 2–6 uniform rows — no variable-height requirement
- Zero layout measurement, zero reflows — pure compositor animation
- Trivial implementation: sort, set `transform: translateY(rank * ROW_HEIGHT)`, CSS does the rest
- `will-change: transform` promotes to GPU layer (fine for ≤6 elements)

### Alternatives Considered

- **FLIP technique**: More code, two reflows per reorder. Overkill for a fixed-row-height list with ≤6 items. Would be the right choice if rows had variable heights.
- **CSS `order`**: Eliminated — `order` is not animatable. Elements snap instantly.
- **Web Animations API**: Same measurement overhead as FLIP. `Element.animate()` has nice ergonomics (`.finished` promise, no style cleanup) but the measurement cost is unnecessary here.

### Implementation Pattern

```ts
const ROW_HEIGHT = 32; // px
// Rows are position:absolute, top:0, transition: transform 300ms ease
// On update: sort players by score desc, then:
sorted.forEach((player, rank) => {
  row.style.transform = `translateY(${rank * ROW_HEIGHT}px)`;
});
```

Key changes from current implementation:
- Replace `innerHTML` with persistent DOM elements keyed by player ID
- Rows created once, text content updated via `.textContent`
- Container is `position: relative` with explicit height
- New rows fade in with `opacity: 0 → 1` transition

---

## 2. Slow-Motion Physics

### Decision: Multiply `world.step(fixedTimestep * timeScale)`, keep step rate at 60 Hz

### Rationale

Two approaches to slow physics in Planck.js:

| Approach | Step rate | Collision quality | Determinism |
|----------|-----------|-------------------|-------------|
| Modify accumulator drain rate | Drops (~18/s at 0.3×) | **Degrades** | Preserved |
| **Multiply timestep dt** | **Constant 60/s** | **Improves** | **Preserved** |

Multiplying `dt` is correct because:
- Planck.js treats `dt` as "how much simulated time to advance" — smaller `dt` = slower motion
- Step rate stays at 60 Hz, so collision detection quality actually *improves* during slow-mo
- Determinism is preserved as long as all clients use the same `timeScale` at the same tick
- No risk of tunneling (only risk with timeScale > 1.0, which we never use)

### State Machine

Flat enum with real-time timer, not a full state-machine class:

| Phase | Duration (real-time) | Easing | TimeScale |
|-------|---------------------|--------|-----------|
| normal | — | — | 1.0 |
| entering | 0.25s | easeOutCubic | 1.0 → 0.3 |
| slow | 1.5s | constant | 0.3 |
| exiting | 0.4s | easeInCubic | 0.3 → 1.0 |

Easing choice: `easeOutCubic` for entry (snappy deceleration), `easeInCubic` for exit (gentle start, snappy re-entry). Total event ≈ 2.15s real-time.

### Trigger

Puck's Y position crosses below `shoveZoneY` (already computed in board geometry). Once-per-turn guard: `triggeredThisTurn` flag, reset on turn start.

### Alternatives Considered

- **Accumulator-based**: Fewer physics steps means worse collision detection. Eliminated.
- **Replay-style freeze-frame**: Too complex, different UX. Not what spec describes.
- **Linear interpolation for timeScale**: Produces mechanical feel. Cubic easing is more cinematic with negligible extra code.

---

## 3. Slow-Motion Audio

### Decision: Stretch durations by `1/timeScale`, pitch-shift frequencies by `timeScale^0.5`

### Rationale

All audio in the game is OscillatorNode-based (no `AudioBufferSourceNode`, no `playbackRate`). Two control axes:

**Duration stretching** (`1/timeScale`):
- All SFX envelope times (attack, decay, stop time) multiplied by `1/timeScale`
- Music beat intervals multiplied by `1/timeScale`
- Creates perceived tempo slowdown

**Pitch shifting** (`timeScale^0.5`):
- Oscillator frequencies multiplied by `Math.pow(timeScale, 0.5)`
- Full shift (`timeScale`) is too extreme (1000 Hz → 300 Hz at 0.3×)
- Square root gives noticeable but palatable drop (1000 Hz → ~548 Hz at 0.3×)
- Emulates tape-slowdown effect without making sounds unrecognizable

### Music Integration

```ts
// In scheduler: effective beat = beatDuration / timeScale
// In note generation: freq *= Math.pow(timeScale, 0.5), duration /= timeScale
```

### SFX Integration

```ts
// AudioManager.play() passes timeScale as option
// Each synth function: durations *= 1/timeScale, frequencies *= timeScale^0.5
```

### Alternatives Considered

- **No pitch shift, only tempo**: Less immersive. Sounds "normal speed but spaced out."
- **Full linear pitch shift** (`freq * timeScale`): Too dramatic. At 0.3×, 1000 Hz → 300 Hz is a deep rumble.
- **Separate slow-mo sound effects**: Extra asset/SFX design work. Unnecessary when the existing synths stretch well.

---

## 4. Procedural Background Rendering

### Decision: Layered offscreen canvas — sine-wave hills, ellipse-cluster clouds, sky gradient

### Rationale

Key constraints: no image assets (offline-capable, <1 MB bundle), procedural, subtle animation, toggleable, 60fps safe.

### Layer Structure

| Layer | Contents | Caching | Update Frequency |
|-------|----------|---------|------------------|
| 0 — Sky | Vertical gradient (blue → warm horizon) | Offscreen, static | On resize only |
| 1 — Celestial | Sun circle + glow | Direct draw | Every frame (subtle Y bob) |
| 2 — Far hills | 2–3 overlapping sine-wave silhouettes | Offscreen, static | On resize only |
| 3 — Clouds | 4–6 ellipse clusters | Offscreen, animated | Every 3rd frame |
| 4 — Near hills | 1–2 foreground silhouettes | Offscreen, static | On resize only |

The board rectangle composites on top of all layers — background is only visible in margins around the board.

### Hill Generation

Summing 2–3 sine waves at different frequencies produces convincing rolling hills with zero dependencies. Perlin noise is overkill for 3 layers.

```ts
y = baseY + amp1*sin(freq1*x + phase1) + amp2*sin(freq2*x + phase2)
```

Different phase offsets per layer prevent alignment. Distant hills: lower amplitude, flatter, desaturated blue-greens.

### Cloud Rendering

Each cloud = 3–5 overlapping ellipses with `rgba(255,255,255,0.7)`. Animation: translate X at 3–8 px/s, wrap at canvas edge. Re-render to cloud buffer every 3 frames (~20fps, visually smooth for slowly drifting clouds).

### Performance Budget

| Operation | Cost | Frequency |
|-----------|------|-----------|
| 3× `drawImage` compositing | ~0.3ms | Every frame |
| Cloud position update | ~0.01ms | Every frame |
| Cloud buffer re-render | ~0.5ms | Every 3rd frame |
| Static layer rebuild | ~2–5ms | On resize only |

Total per-frame overhead: **~0.3ms**, well within 16.6ms budget.

### Resize Handling

Rebuild all offscreen canvases at new dimensions. Use same phase seeds so landscape doesn't randomly change. Chain into existing `CanvasRenderer.resize()`.

### Color Palette

| Element | Color |
|---------|-------|
| Sky top | `#87CEEB` |
| Sky horizon | `#E0F0FF` |
| Sun | `#FFE066` + glow ring |
| Far hills | `#5B7F5B` |
| Mid hills | `#4A8B3F` |
| Near hills | `#3D7A33` |
| Clouds | `rgba(255,255,255,0.7)` |

### Animation Toggle

Boolean flag on `BackgroundManager`. When off, `update()` is skipped — clouds freeze, zero cost. Toggle button in DOM beside sound controls.

### Alternatives Considered

- **Pre-rendered image**: Violates offline-capable constraint (or adds asset weight). Eliminated.
- **WebGL shader background**: Overkill. Canvas 2D is sufficient for this complexity.
- **Perlin noise terrain**: More code, random seed management, minimal visual benefit over sine superposition for 3–4 hill layers.
- **CSS gradient background behind canvas**: Can't animate, can't integrate with canvas pipeline, can't cache.

### Integration Point

In `renderer.ts drawFrame()`, insert `background.composite(ctx)` before the board fill. The two flat `fillRect` calls for outer/board background remain — they draw over the background within the board area.

### Estimated Size

~120–150 LOC for `BackgroundManager` + ~20 LOC config constants = well within 200 LOC target.

---

## 5. Minor Changes

These required no significant research:

### 5a. Copyright Subtitle (Registration Overlay)
Append after `<h2>` in registration panel. Plain DOM insertion. No new patterns needed.

### 5b. Audio Toggles Repositioning
Change CSS from `right:8px` to `left:8px`. One-line CSS change in `public/styles.css`.

### 5c. Collision Multiplier Format
Change `formatMultiplier()` from `"N.N×"` to `"×N.N"`. One-line string template change. Unit test update.

### 5d. Animation Toggle Button
Same pattern as existing audio toggle buttons. Create 44×44px button, add to audio toggles container or a sibling wrapper. Controls `BackgroundManager.animationEnabled`.
