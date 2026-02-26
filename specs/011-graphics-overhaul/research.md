# Research: Graphics Overhaul — Wood Theme & Visual Polish

**Feature**: 011-graphics-overhaul  
**Date**: 2026-02-26

## 1. Procedural Wood-Grain Pattern (Canvas 2D)

### Decision
Use a **hybrid gradient + procedural grain lines** approach: vertical linear gradient base with 200–400 thin randomised horizontal `fillRect` grain lines and 2–4 radial-gradient knot shapes, all pre-rendered to an `OffscreenCanvas`.

### Rationale
1. Consistent with existing architecture — `BackgroundManager` already uses `OffscreenCanvas` with gradient fills and shape drawing. No pixel-level `ImageData` manipulation or noise library needed.
2. Performance: ~200–400 Canvas draw calls finish in < 3 ms on mobile. Perlin noise approach requires ~1.6 M pixel iterations (30–80 ms).
3. Visual fidelity at game scale: the board is partially occluded by pegs, pucks, dividers, and labels. At typical Plinko viewing distance, gradient + grain lines with knots is indistinguishable from noise-based wood.
4. Zero external dependencies: pure Canvas 2D API calls.

### Colour Palette

| Role | Hex | Description |
|------|-----|-------------|
| Base fill | `#8B5E3C` | Medium warm brown |
| Gradient dark | `#5C3A1E` | Dark walnut |
| Gradient light | `#A97B50` | Honey oak |
| Grain line dark | `#4A2E14` | Deep grain shadow |
| Grain line mid | `#6B4226` | Medium grain |
| Highlight line | `#C4A882` | Tan highlight (low opacity) |
| Knot center | `#3E2410` | Very dark brown |
| Knot ring | `#6B4928` | Medium ring brown |

### Contrast Analysis
- Gold text (`#ffd700`) on darkest wood (`#4A2E14`): **~7.2:1** — exceeds WCAG AAA (7:1)
- Grey pegs (`#c0c0c0`) with stroke on wood: meets non-text contrast (3:1) via geometric shape + outline
- Coloured pucks on wood: **~3.0:1** — meets non-text contrast; pucks also have distinct shape/motion

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| Perlin noise with domain warping | ~200 lines, 30–80 ms pre-render, pixel-level `ImageData` — doesn't match codebase style |
| SVG filter (`feTurbulence`) | Inconsistent cross-browser rendering, requires DOM element |
| CSS `repeating-linear-gradient` | Can't draw to `OffscreenCanvas`, breaks single-canvas architecture |
| WebGL shader | Entire pipeline is Canvas 2D; adding WebGL context too complex |
| Pre-baked image asset | Violates procedural-only, zero-asset constraint |

### Implementation Sketch
1. New `WoodPatternGenerator` class with `OffscreenCanvas`
2. `generate(width, height)`:
   - Vertical linear gradient (`#5C3A1E` → `#8B5E3C` → `#A97B50` → `#8B5E3C`)
   - 200–400 thin `fillRect` strips (1–2 px tall), randomised spacing (2–8 px), alpha 0.03–0.12 from grain palette
   - 2–4 elliptical radial-gradient knots at random positions
   - Optional final overlay gradient for sheen
3. In renderer: `drawImage(woodCanvas)` at board rect position (replaces `fillStyle = '#16213e'`)

---

## 2. Contact Point Extraction (Planck.js)

### Decision
Use `contact.getWorldManifold(null)` inside the existing `begin-contact` handler to extract world-space contact point coordinates.

### Rationale
- `WorldManifold` is the canonical Planck.js API for world-space contact geometry
- The manifold is **fully populated before `beginContact` fires** (Planck evaluates manifold → checks touching → fires event)
- For all collision types in this game (circle-circle, circle-polygon, circle-edge), exactly **1 contact point** is produced — `points[0]` is always sufficient
- No additional event handlers (`pre-solve`, `post-solve`) needed

### API Pattern
```typescript
const wm = contact.getWorldManifold(null);
if (wm && wm.pointCount > 0) {
  const contactX = wm.points[0].x;
  const contactY = wm.points[0].y;
}
```

### CollisionEvent Interface Change
```typescript
export interface CollisionEvent {
  type: 'pinHit' | 'puckHit' | 'wallHit';
  puckId: string;
  x: number;        // puck center (existing)
  y: number;        // puck center (existing)
  contactX: number;  // NEW: world-space contact point
  contactY: number;  // NEW: world-space contact point
}
```

### Gotchas
- `getWorldManifold(null)` can return `undefined` during body destruction — always null-check
- `points` array has 2 pre-allocated slots; only read up to `pointCount`
- Returned `Vec2` objects are internal/reused — copy `.x`/`.y` immediately, don't hold references

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| `contact.getManifold()` (local) | Returns local-space coords requiring manual transform |
| `pre-solve` handler | Unnecessary — manifold populated at `begin-contact` |
| Midpoint between body centres | Inaccurate for circle-polygon contacts |
| `post-solve` handler | Same geometry; `post-solve` only adds impulse data |

---

## 3. Divider Shape: Edge → Box Migration

### Decision
Replace `planck.Edge()` dividers with `planck.Box(halfWidth, halfHeight)` fixtures on bodies positioned at the rectangle centre. Total divider width: **0.3 world units** (`halfWidth = 0.15`).

### Rationale
- 0.3 units = 3% of 10.0-unit board width — visually "noticeably thick" without being bulky
- At ~60px per world unit, 0.3 units ≈ 18px — clearly visible as a solid post
- Puck radius is 0.5 units, so divider width is 60% of puck diameter — proportional
- `Box` creates a `PolygonShape` internally; Planck.js has a dedicated polygon–circle contact solver

### Physics Code Pattern
```typescript
const halfW = 0.15; // BUCKET_DIVIDER_WIDTH / 2
const halfH = BUCKET_DIVIDER_HEIGHT / 2;

const divider = world.createBody({
  type: 'static',
  position: planck.Vec2(x, bucketBottom + halfH),
});
divider.createFixture({
  shape: planck.Box(halfW, halfH),
  restitution: 0.2,
  friction: 0.3,
});
```

### Rendering Approach
Horizontal linear gradient across divider width to simulate cylindrical shading:
- Dark edges (`#5a3a1a`) → highlight centre (`#a07828`) → dark edges
- 1.5px dark outline (`#3a2510`)
- At 18px wide, procedural grain lines would be noise; smooth gradient reads as wood

### Bucket Width Impact
- Keep `computeBucketBoundaries()` unchanged — divider Box centred on existing boundary
- Physics naturally prevents pucks from entering divider space
- 4 inner dividers consume `4 × 0.3 = 1.2` units → effective bucket interior is `8.8 / 5 = 1.76` units each (with equal 20% widths)
- Narrowest bucket still ≥ 2× puck diameter — pucks fit comfortably

### Gotchas
- Box shapes have sharp 90° corners at top (unlike infinitely-thin Edges) — deflects pucks at sharper angles. This is desirable (realistic post interaction).  
- Box shapes make tunnelling virtually impossible (improvement over Edge).
- Both `board-builder.ts` and `simulation.ts` create dividers — both must be updated identically.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| `planck.Polygon` with 4 vertices | Works but `Box` is the built-in shorthand — unnecessary complexity |
| 0.2 world units width | Borderline "noticeable" at ~12px |
| 0.4 world units width | Consumes too much space on narrow buckets |
| Subtract divider width from bucket fractions | Adds complexity to `computeBucketBoundaries`; simpler to just centre Box on boundary |

---

## 4. Puck 3D Shading

### Decision
Use a layered radial gradient approach (no code dependencies):
1. **Base shadow:** Slightly offset dark gradient beneath the puck for drop-shadow effect
2. **Main fill:** Radial gradient from lighter tint (upper-left highlight) to base player colour to slightly darker shade at edges
3. **Specular highlight:** Small, off-centre radial gradient with white-to-transparent for a "shiny bubble" spot
4. **Pattern overlay:** Existing stripes/dots/rings at reduced opacity to blend with shading
5. **Edge outline:** Slightly darker and thicker stroke for definition

### Rationale
- Canvas 2D `createRadialGradient` is GPU-accelerated — negligible cost per puck (4 active pucks max)
- Same approach used in professional Canvas 2D game tutorials for 3D sphere effects
- Maintains colour distinctiveness: gradient darkens edges but preserves hue at centre
- Pattern overlays remain visible by drawing after the shading layer

### Colour Derivation
- Highlight tint: blend player colour 50% toward white
- Shadow shade: blend player colour 50% toward black  
- Specular: white at 60% opacity → transparent

---

## 5. Bucket Width Redistribution

### Decision
Change `bucketWidths` config from `[0.25, 0.20, 0.10, 0.20, 0.25]` to `[0.20, 0.20, 0.20, 0.20, 0.20]`.

### Rationale
- Direct config change in `game-config.ts`
- `computeBucketBoundaries()` already supports explicit `bucketWidths` fractions
- All downstream code (label rendering, score detection, physics boundaries) derives from this config
- Score values `[100, 1000, 10000, 1000, 100]` remain unchanged

### Impact
- Centre jackpot bucket grows from 10% → 20% (1.0 → 2.0 world units) — easier to hit
- Edge buckets shrink from 25% → 20% (2.5 → 2.0 world units) — slightly harder to hit
- Score label font size scales with bucket width (existing logic) — all labels become same size
