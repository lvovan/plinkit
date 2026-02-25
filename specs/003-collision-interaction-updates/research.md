# Research: Collision & Interaction Updates

**Feature**: 003-collision-interaction-updates  
**Date**: 2026-02-25

## Research Tasks

### 1. Radial Flash Rendering on Canvas

**Decision**: Use a pool of time-limited flash objects rendered as radial gradients with `globalAlpha` fade.

**Rationale**: 
- The existing `EffectsManager` already uses a time-limited-array pattern for score pops (create → filter expired → render active). Radial flash follows the same pattern.
- Canvas `createRadialGradient` produces a bright-center-fading-edge circle in a single draw call — no sprites needed.
- Rendering cost: one `fillStyle = gradient` + one `arc` fill per active flash. At 60fps with ≤20 simultaneous flashes, this is negligible.
- Alpha fade: `globalAlpha = 1 - (elapsed / duration)` blends naturally with existing rendering.

**Alternatives considered**:
- **Sprite-based flash**: Requires loading an image asset; adds to bundle size; no visual advantage for a simple radial glow.
- **CSS overlay**: Game renders on canvas only (Constitution II); DOM overlays are for UI only.
- **WebGL particles**: Overkill for a simple flash; would require renderer architecture changes.

### 2. Multiplier Text at Collision Point

**Decision**: Render multiplier text as a companion element to each flash, using the same pool and lifecycle. Text floats slightly above the flash point and fades with it.

**Rationale**:
- Score pop rendering already demonstrates the pattern: `ctx.fillText` with `globalAlpha` fade, positioned at world coordinates.
- The multiplier text is very short (e.g., "1.3×") so font rendering overhead is minimal.
- Rendering alongside the flash ensures visual cohesion and a single cleanup lifecycle.

**Alternatives considered**:
- **DOM text overlay**: Breaks canvas-only rendering for game surface.
- **Pre-rendered number sprites**: Unnecessary complexity for short text strings.

### 3. Web Audio Polyphony for Rapid Collisions

**Decision**: Reuse existing `pinHit` sprite for all collision types. Add a simple rate limiter: if more than 4 sounds play within 50ms, attenuate subsequent sounds by 50% gain.

**Rationale**:
- Web Audio API's `BufferSource` nodes inherently support unlimited polyphony — each `play()` call creates an independent source node.
- Without rate limiting, 20+ near-simultaneous hits could produce a harsh combined volume spike.
- A 4-sounds-per-50ms threshold balances feedback density with audio clarity. Pitch variation (already implemented at 0.15) adds natural variety.

**Alternatives considered**:
- **Debounce (drop sounds)**: Loses feedback for some collisions; player expects 1:1 hit-to-sound.
- **Sound pool with fixed size**: More complex; unnecessary since Web Audio handles creation efficiently.
- **Separate sound per collision type**: Spec assumption says a single bounce sound is sufficient.
- **Volume ducking via compressor node**: More complex mastering chain; simple gain attenuation is sufficient.

### 4. Exponential Scoring Formula Validation

**Decision**: `multiplier = min(1.15^bounces, 10.0)`. Round score = `floor(baseScore × multiplier)`.

**Rationale** (mathematical validation):
| Bounces | 1.15^n | Capped |
|---------|--------|--------|
| 0 | 1.00 | 1.00 |
| 3 | 1.52 | 1.52 |
| 5 | 2.01 | 2.01 |
| 10 | 4.05 | 4.05 |
| 15 | 8.14 | 8.14 |
| 17 | 10.76 | **10.00** |
| 20 | 16.37 | **10.00** |

- SC-003 check: 10 bounces (4.05×) vs 5 bounces (2.01×) ratio = 2.01:1 ≥ 2× ✓
- Cap reached at bounce 17 → high but achievable, preventing runaway scores.
- `floor()` ensures integer scores matching current bucket score convention.
- Zero-bounce multiplier is exactly 1.0 (1.15^0 = 1) → FR-009 satisfied.

**Alternatives considered**:
- **1.1× rate**: Ratio at 5-bounce delta = 1.61×, fails SC-003's 2× requirement.
- **1.2× rate**: Cap reached at bounce 13; very aggressive growth may feel unbalanced.
- **Logarithmic scaling**: Diminishing returns feel unrewarding; exponential creates exciting "big bounce" moments.

### 5. Slash Trail Animation on Canvas

**Decision**: Render the slash as a tapered polyline along the flick vector, with alpha fade over 400ms. The line starts thick at the gesture origin and tapers to a point at the flick endpoint.

**Rationale**:
- A tapered polyline is the simplest canvas-native approach: 2-3 `lineTo` calls with decreasing `lineWidth` and a gradient or solid bright color (e.g., white or cyan).
- 400ms duration (within the 500ms FR-018 cap) provides readable feedback without lingering.
- Direction-aligned rendering naturally conveys the shove direction.
- Visually distinct from radial flash (linear vs. radial shape) → FR-019 satisfied.

**Alternatives considered**:
- **Bezier curve with glow**: More visually polished but harder to align with the linear flick vector.
- **Sprite animation**: Requires directional sprite variants; adds to bundle size.
- **afterimage trail (multiple fading copies)**: Higher cost for minimal visual gain over a tapered line.

### 6. Ghost Puck Pre-Drop Indicator

**Decision**: Render a semi-transparent version of the player's puck style at the drop position (top of board, fixed Y at the drop height). Use 40% opacity to convey "preview" state.

**Rationale**:
- The renderer already has `drawPuckPattern(ctx, cx, cy, r, pattern)` for rendering styled pucks. Rendering the same puck at reduced alpha reuses existing code.
- A dashed vertical guide line from the ghost puck downward (5-6 dashes) adds directional affordance.
- The `dropX` value is already tracked in main.ts via `input.onDropPositionChange`. Just needs to be added to `RenderState` and rendered when `!puckDropped`.

**Alternatives considered**:
- **Horizontal guideline only**: Less discoverable — players might not understand what it means.
- **Animated bouncing arrow**: More attention-grabbing but could feel juvenile; ghost puck is more contextual.
- **Full-opacity puck that transitions on drop**: May confuse players about whether the puck has already been dropped.

### 7. Proportional Shake Intensity for Shoves

**Decision**: Scale shake intensity linearly with shove force magnitude. `intensity = basePx × (forceMagnitude / maxForceMagnitude)`, where basePx = 5 (max shake for max-force shove). Duration stays at 150ms.

**Rationale**:
- Current shake is hardcoded at 3px intensity, 150ms. With max force = 5.0, a linear scale gives: min shove (~1.0 force) → 1px shake, max shove (5.0 force) → 5px shake.
- Linear scaling is intuitive: stronger flick → stronger shake. No need for exponential or logarithmic mapping.
- Duration stays constant because shake duration is about "how long the effect lingers", not "how strong the hit was".

**Alternatives considered**:
- **Exponential scaling**: Would make weak shoves nearly imperceptible while strong shoves feel earthquake-like.
- **Duration scaling**: Varying duration feels less natural than varying intensity for force feedback.
- **No change (fixed 3px)**: Spec explicitly requires proportional shake.

### 8. Particle System Cleanup Strategy

**Decision**: Remove the inline particle system from `CanvasRenderer` for `pinHit` and `shove` types. Keep `bucketLand` particles inline. Delete the standalone `ParticleSystem` class entirely (it was never used).

**Rationale**:
- Two separate particle implementations exist: standalone `ParticleSystem` (unused) and inline in `CanvasRenderer` (active for `pinHit`, `bucketLand`, `shove`).
- Per spec: bucket-landing particles are exempt from removal.
- Simplest approach: modify `emitParticles()` to only emit for `bucketLand`, ignore other types. Keep `updateParticles()` for the remaining bucket-land particles.
- Delete `src/rendering/particles.ts` since it was never wired and won't be used.

**Alternatives considered**:
- **Refactor to use standalone `ParticleSystem` for bucket-land**: More architectural cleanliness but higher change surface for no user-facing benefit.
- **Keep both systems**: Violates spec requirement to remove particle spray effects from collisions/shoves.

### 9. Score Breakdown Display

**Decision**: Extend `EffectsManager.triggerScorePop` to accept a `ScoreBreakdown` object. Render as two-line text: line 1 shows "baseScore × multiplier×" and line 2 shows "= totalScore" in larger, bolder text. Uses the same float-up-and-fade animation as current score pops but with a longer duration (1800ms vs 1200ms) to give players time to read the breakdown.

**Rationale**:
- Score pop mechanism already exists and is nearly wired (created but render call missing — a known bug). Extending it to show breakdown reuses the pattern.
- Two-line format keeps the breakdown compact: `"1000 × 3.2×"` on top, `"= 3200"` below in emphasis.
- The currently-broken `renderScorePops()` must be wired into the render loop anyway — this fixes an existing bug while implementing the new feature.

**Alternatives considered**:
- **DOM overlay popup**: Breaks canvas-only game surface rendering.
- **Single-line format**: `"1000 × 3.2× = 3200"` may be too wide, especially on mobile.
- **Separate UI panel**: Over-engineered for a transient 2-second display.
