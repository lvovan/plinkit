# Contract: Board Configuration Constants

**Feature**: 011-graphics-overhaul  
**Type**: Internal interface (config → physics/rendering)

## New Constant

```typescript
// board-geometry.ts
export const BUCKET_DIVIDER_WIDTH = 0.3; // world units (total width of divider post)
```

Joins the existing `BUCKET_DIVIDER_HEIGHT = 1.5`.

## Modified Configuration

```typescript
// game-config.ts — BoardLayout.bucketWidths
// Before:
bucketWidths: [0.25, 0.20, 0.10, 0.20, 0.25]
// After:
bucketWidths: [0.20, 0.20, 0.20, 0.20, 0.20]
```

## Consumers

| Consumer | File | Impact |
|----------|------|--------|
| `BoardBuilder.build()` | `board-builder.ts` | Uses `BUCKET_DIVIDER_WIDTH` for Box half-extents |
| `Simulation.rebuildBoard()` | `simulation.ts` | Same Box creation as `BoardBuilder` |
| `CanvasRenderer.drawFrame()` | `renderer.ts` | Uses `BUCKET_DIVIDER_WIDTH` for filled rectangle width |
| `computeBucketBoundaries()` | `board-geometry.ts` | Uses `bucketWidths` fractions (no change to function logic) |
| `CanvasRenderer` bucket labels | `renderer.ts` | Label font size adapts to new bucket widths (existing scaling logic) |

## Invariants

- `bucketWidths` array must have exactly `bucketCount` elements and sum to 1.0
- `BUCKET_DIVIDER_WIDTH` must be < smallest bucket width × `boardWidth` (0.3 < 2.0 ✓)
