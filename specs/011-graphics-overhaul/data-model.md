# Data Model: Graphics Overhaul — Wood Theme & Visual Polish

**Feature**: 011-graphics-overhaul  
**Date**: 2026-02-26  
**Source**: [spec.md](spec.md), [research.md](research.md)

## Entities

### WoodPattern (NEW)

Pre-rendered procedural wood-grain texture for the board surface.

| Field | Type | Description |
|-------|------|-------------|
| canvas | OffscreenCanvas | Pre-rendered wood-grain pattern at board pixel dimensions |
| width | number | Canvas width in pixels |
| height | number | Canvas height in pixels |

**Lifecycle**: Created once on game init and rebuilt on resize. Composited per frame via `drawImage()`.

**Relationships**: Used by `CanvasRenderer` in place of the current solid `#16213e` fill rectangle.

---

### CollisionEvent (MODIFIED)

Physics collision event emitted by the simulation on body contact.

| Field | Type | Change | Description |
|-------|------|--------|-------------|
| type | `'pinHit' \| 'puckHit' \| 'wallHit'` | Unchanged | Collision category |
| puckId | string | Unchanged | ID of the puck involved |
| x | number | Unchanged | Puck centre X (world coords) |
| y | number | Unchanged | Puck centre Y (world coords) |
| **contactX** | **number** | **NEW** | World-space X of actual contact point |
| **contactY** | **number** | **NEW** | World-space Y of actual contact point |

**Validation**: `contactX`/`contactY` fall back to puck centre if `WorldManifold` is unavailable.

**Relationships**: Consumed by `EffectsManager.addCollisionFlash()` which now uses `contactX`/`contactY` instead of `x`/`y` for flash positioning.

---

### BoardLayout (MODIFIED — config only)

Board configuration defining pin layout, buckets, and dimensions.

| Field | Type | Change | Description |
|-------|------|--------|-------------|
| bucketWidths | number[] | **MODIFIED** | Was `[0.25, 0.20, 0.10, 0.20, 0.25]` → now `[0.20, 0.20, 0.20, 0.20, 0.20]` |

All other fields unchanged. Downstream bucket boundary computation derives from this.

---

### Divider (MODIFIED — physics + rendering)

Vertical post separating scoring buckets.

| Attribute | Previous | New | Notes |
|-----------|----------|-----|-------|
| Physics shape | `planck.Edge` (zero-width line) | `planck.Box(0.15, 0.75)` (rectangle) | Body positioned at rect centre |
| Visual width | 2px stroked line | 0.3 world units filled rectangle | ~18px at typical scale |
| Visual style | White stroke (`#e0e0e0`) | Horizontal wood gradient with dark outline | Matches board wood theme |
| Height | 1.5 world units | 1.5 world units (unchanged) | `BUCKET_DIVIDER_HEIGHT` |

**New constant**: `BUCKET_DIVIDER_WIDTH = 0.3` (exported from `board-geometry.ts`)

**Relationships**: Physics body centred on bucket boundary. Both `board-builder.ts` and `simulation.ts` (in `rebuildBoard()`) must update identically.

---

### Puck Rendering (MODIFIED — visual only)

Player-controlled token with enhanced 3D shading.

| Attribute | Previous | New | Notes |
|-----------|----------|-----|-------|
| Fill | Flat `puck.style.color` | Multi-layer radial gradient (highlight→base→shadow) | 3D spherical impression |
| Drop shadow | None | Slight offset dark circle beneath puck | Depth cue |
| Specular highlight | None | Small off-centre white-to-transparent radial gradient | "Shiny bubble" spot |
| Pattern overlay | Drawn after flat fill | Drawn after gradient fill at reduced opacity | Blends with shading |
| Outline | `#ffffff88`, 1.5px | Slightly darker tint of base colour, 2px | Better definition on wood |

**Colour derivation**:
- Highlight tint: player colour blended 50% toward white
- Shadow shade: player colour blended 50% toward black
- Specular: `rgba(255, 255, 255, 0.6)` → transparent

No changes to `PuckStyle` type or `PUCK_PALETTE`. All shading is purely render-time.

---

## State Transitions

No new state machines. All changes are to rendering and configuration — existing game state flow is unaffected.

## Validation Rules

1. `bucketWidths` array must sum to 1.0 (existing validation still applies)
2. `BUCKET_DIVIDER_WIDTH` must be positive and less than the narrowest bucket width
3. `contactX`/`contactY` must always be populated (fallback to puck centre if manifold unavailable)
4. Wood pattern canvas dimensions must match current board pixel dimensions (regenerated on resize)
