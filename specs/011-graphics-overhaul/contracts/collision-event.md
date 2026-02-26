# Contract: CollisionEvent Interface Change

**Feature**: 011-graphics-overhaul  
**Type**: Internal interface (physics → rendering pipeline)

## Current Contract

```typescript
export interface CollisionEvent {
  type: 'pinHit' | 'puckHit' | 'wallHit';
  puckId: string;
  x: number;  // puck centre position
  y: number;  // puck centre position
}
```

## Updated Contract

```typescript
export interface CollisionEvent {
  type: 'pinHit' | 'puckHit' | 'wallHit';
  puckId: string;
  x: number;       // puck centre position (unchanged)
  y: number;       // puck centre position (unchanged)
  contactX: number; // world-space contact point X
  contactY: number; // world-space contact point Y
}
```

## Consumers

| Consumer | File | Usage |
|----------|------|-------|
| `main.ts` | Collision event handler | Passes `contactX`/`contactY` to `addCollisionFlash()` instead of `x`/`y` |
| `EffectsManager` | `effects.ts` | Receives contact point coordinates for flash positioning |
| `AudioManager` | `audio-manager.ts` | Uses `x`/`y` for panning — unaffected |

## Migration

- All collision event producers (`simulation.ts`) must populate `contactX`/`contactY`
- Fallback: if `WorldManifold` is unavailable, set `contactX = x`, `contactY = y`
- Backward compatible: existing `x`/`y` fields preserved with same semantics
