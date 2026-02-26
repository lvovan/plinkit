# Quickstart: Graphics Overhaul — Wood Theme & Visual Polish

**Feature**: 011-graphics-overhaul  
**Branch**: `011-graphics-overhaul`

## Overview

This feature updates the visual presentation of the Plinko board with five changes:
1. **Wood-grain board** — procedural pattern replacing the solid navy background
2. **Thick wood dividers** — rectangular posts with gradient shading (+ matching physics)
3. **3D puck shading** — radial gradient highlights, shadows, and specular spots
4. **Contact-point collision effects** — flashes at actual impact location
5. **Equal bucket widths** — all five buckets at 20% each

## Prerequisites

```bash
git checkout 011-graphics-overhaul
npm install          # no new dependencies
npm run dev          # start dev server
```

## Key Files to Modify

| File | Change Summary |
|------|---------------|
| `src/rendering/wood-pattern.ts` | **NEW** — procedural wood-grain generator |
| `src/rendering/renderer.ts` | Wood board, thick dividers, 3D pucks |
| `src/rendering/effects.ts` | Use `contactX`/`contactY` for flash positioning |
| `src/config/game-config.ts` | `bucketWidths` → `[0.20, 0.20, 0.20, 0.20, 0.20]` |
| `src/config/board-geometry.ts` | Add `BUCKET_DIVIDER_WIDTH = 0.3` |
| `src/physics/board-builder.ts` | `Edge` → `Box` for dividers |
| `src/physics/simulation.ts` | Extract contact point + Edge→Box in `rebuildBoard()` |
| `src/types/index.ts` | Add `contactX`/`contactY` to `CollisionEvent` |
| `src/main.ts` | Pass `contactX`/`contactY` to effect manager |

## Implementation Order

1. **Bucket widths** (config change, simplest, validates pipeline)
2. **Divider physics** (Edge→Box, must match visual width)
3. **Contact point extraction** (Planck.js `WorldManifold` API)
4. **Wood-grain pattern** (new module, offscreen canvas)
5. **Wood board rendering** (replace solid fill with wood canvas)
6. **Wood divider rendering** (gradient fill + outline)
7. **3D puck shading** (radial gradients, highlight, shadow)
8. **Contact-point flash positioning** (effects.ts + main.ts wiring)

## Testing Strategy

### Automated (Vitest)
- `tests/unit/config/bucket-widths.test.ts` — verify equal fractions sum to 1.0
- `tests/unit/physics/contact-point.test.ts` — verify contact point extraction
- `tests/unit/rendering/wood-pattern.test.ts` — verify canvas generation (dimensions, non-empty)

### Manual Visual
- Board displays warm wood-grain pattern
- Dividers appear as thick wooden posts
- Pucks show 3D gradient shading with visible highlights
- Collision flashes appear at puck-peg contact points (not puck centres)
- All five buckets are visually equal width

### E2E (Playwright)
- Existing `game-smoke.test.ts` must still pass (no gameplay regression)

## Performance Validation

- Wood pattern is pre-rendered to `OffscreenCanvas` (< 5 ms on mobile)
- Per-frame cost: one `drawImage()` call (GPU-accelerated)
- 3D puck shading: 2–3 `createRadialGradient` calls per puck (max 4 pucks)
- Target: 60 fps maintained with all changes active
