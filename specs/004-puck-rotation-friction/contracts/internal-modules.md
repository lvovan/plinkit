# Internal Module Contracts: Puck Rotation & Friction Physics

**Feature**: 004-puck-rotation-friction
**Date**: 2026-02-25
**Context**: Changes to existing module contracts introduced by this feature.
References the base contracts from `specs/001-multiplayer-plinko/contracts/internal-modules.md`.

---

## Contract Changes Overview

```
src/config/    → PhysicsConfig defaults changed (friction), new fields (angularDamping, maxAngularVelocity)
               → ShoveConfig gains shoveOffsetFraction field
src/types/     → PhysicsConfig interface extended
               → ShoveConfig interface extended
               → RenderState.pucks gains angle field
src/physics/   → PhysicsSimulation: puck bodies enable rotation, angular velocity capped post-step,
                 shove impulse applied off-center
src/rendering/ → Renderer: puck patterns rotated by angle, ghost puck hardcoded angle=0
src/main.ts    → Snapshot→RenderState mapping passes angle
```

No changes to: InputManager, AudioManager, UIOverlayManager, GameStateMachine, ScoringEngine contracts.

---

## Contract 1: PhysicsConfig (extended)

Two new fields and two default value changes.

```typescript
interface PhysicsConfig {
  // ... existing fields unchanged ...

  puckFriction: number;           // DEFAULT CHANGED: 0.1 → 0.4
  pinFriction: number;            // DEFAULT CHANGED: 0.05 → 0.3

  /** NEW: Angular damping applied to puck bodies. Controls spin decay rate.
   *  Formula: ω *= 1 / (1 + dt × angularDamping) per step.
   *  Default: 3.0 (~5% remaining after 1 second at 60 Hz). */
  angularDamping: number;

  /** NEW: Maximum angular velocity (rad/s) for pucks.
   *  Clamped after each physics step.
   *  Default: 12.57 (≈ 2 rotations/second = 4π). */
  maxAngularVelocity: number;
}
```

**Contract guarantees**:
- `angularDamping ≥ 0` (0 = no damping, spin persists forever)
- `maxAngularVelocity > 0`
- Friction values use the geometric mean for fixture pairs: `combined = √(f1 × f2)`

---

## Contract 2: ShoveConfig (extended)

One new field.

```typescript
interface ShoveConfig {
  // ... existing fields unchanged ...

  /** NEW: Fraction of puck radius used as off-center offset for shove impulse.
   *  Creates a torque proportional to the shove magnitude.
   *  0 = center-of-mass (no spin), 1.0 = edge (maximum spin).
   *  Default: 0.25 (25% of puck radius). */
  shoveOffsetFraction: number;
}
```

**Contract guarantees**:
- `shoveOffsetFraction ≥ 0` and `≤ 1.0`
- Linear velocity from shove is unchanged regardless of offset value (Planck.js applies `Δv = impulse / mass` independent of application point)
- Angular velocity change `Δω = invI × (r × impulse)` where `|r| = puckRadius × shoveOffsetFraction`

---

## Contract 3: PhysicsSimulation (behavior changes)

The interface signature is **unchanged**. The behavioral contract changes:

### `dropPuck(x, playerId)` — body creation

```typescript
// BEFORE:
const body = world.createBody({
  type: 'dynamic',
  position: planck.Vec2(x, dropY),
  fixedRotation: true,       // ← rotation disabled
  bullet: false,
});

// AFTER:
const body = world.createBody({
  type: 'dynamic',
  position: planck.Vec2(x, dropY),
  fixedRotation: false,      // ← rotation ENABLED
  angularDamping: config.physics.angularDamping,  // ← NEW
  bullet: false,
});
```

### `step()` — angular velocity clamping

After `world.step()`, all puck bodies are clamped:

```typescript
world.step(dt, velIter, posIter);

// NEW: Clamp angular velocity
const maxW = config.physics.maxAngularVelocity;
for (const puck of board.pucks) {
  const w = puck.body.getAngularVelocity();
  if (Math.abs(w) > maxW) {
    puck.body.setAngularVelocity(Math.sign(w) * maxW);
  }
}
```

### `applyShove(puckId, vector)` — off-center impulse

```typescript
// BEFORE:
puck.body.applyLinearImpulse(
  planck.Vec2(dx, dy),
  puck.body.getWorldCenter(),  // ← center of mass
);

// AFTER:
const center = puck.body.getWorldCenter();
const mag = Math.sqrt(dx * dx + dy * dy);
if (mag > 0) {
  const offset = puckRadius * config.shoveConfig.shoveOffsetFraction;
  const perpX = (-dy / mag) * offset;
  const perpY = (dx / mag) * offset;
  puck.body.applyLinearImpulse(
    planck.Vec2(dx, dy),
    planck.Vec2(center.x + perpX, center.y + perpY),  // ← off-center
  );
}
```

### `getSnapshot()` — no change

The existing `angle` field in `PhysicsSnapshot` already reads `body.getAngle()`.
With `fixedRotation: false`, this now returns meaningful rotation values.

**Contract guarantees**:
- Determinism is preserved — same inputs produce same angle/velocity outcomes
- Angular velocity is always `≤ maxAngularVelocity` in absolute value at snapshot time
- All existing collision events (pinHit, puckHit, wallHit) are emitted unchanged
- Settled puck detection is unchanged — rotation does not affect bucket scoring

---

## Contract 4: RenderState (extended)

One new field on each puck in the render state.

```typescript
interface RenderState {
  // ... existing fields unchanged ...

  pucks: Array<{
    x: number;
    y: number;
    radius: number;
    style: PuckStyle;
    settled: boolean;
    angle: number;              // ← NEW: rotation in radians from physics
  }>;

  // dropIndicator: unchanged — ghost puck rendered at angle 0 always
}
```

**Contract guarantees**:
- `angle` is in radians, positive = counter-clockwise (Planck.js convention)
- Ghost puck (dropIndicator) has no `angle` field — renderer hardcodes `0`

---

## Contract 5: Renderer (behavior changes)

The interface signature is **unchanged**. The behavioral contract changes:

### `drawFrame(state)` — puck pattern rotation

```typescript
// For each puck in state.pucks:
ctx.save();
ctx.translate(canvasX, canvasY);
ctx.rotate(puck.angle);      // ← NEW: apply rotation from physics
// Draw pattern at (0, 0) — patterns are now origin-centered
// ...
ctx.restore();
```

**Contract guarantees**:
- "stripes" and "dots" patterns visibly rotate with the puck's angle
- "rings" pattern is rotationally symmetric — rotation is applied but not visually apparent
- "solid" pattern has no overlay — rotation is invisible
- Ghost puck always drawn at angle 0 (existing behavior, no angle in dropIndicator)
- Puck outline circle is rotationally symmetric — rotation only affects pattern overlay

---

## Snapshot → RenderState Mapping (main.ts)

The wiring in `main.ts` must propagate the angle:

```typescript
// BEFORE:
pucks: snapshot.pucks.map(p => ({
  x: p.x,
  y: p.y,
  radius: layout.puckRadius,
  style: puckStyleMap.get(p.id) ?? currentPuckStyle,
  settled: p.settled,
})),

// AFTER:
pucks: snapshot.pucks.map(p => ({
  x: p.x,
  y: p.y,
  radius: layout.puckRadius,
  style: puckStyleMap.get(p.id) ?? currentPuckStyle,
  settled: p.settled,
  angle: p.angle,             // ← NEW
})),
```
