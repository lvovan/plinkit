# Data Model: Puck Rotation & Friction Physics

**Date**: 2026-02-25
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

This document describes only the **changes** introduced by feature 004.
For the full data model, see [001 data-model.md](../001-multiplayer-plinko/data-model.md).

## Modified Entities

### PhysicsConfig

Extended with rotation-specific parameters.

| Field | Type | Default | Change | Description |
|-------|------|---------|--------|-------------|
| puckFriction | `number` | `0.4` | **Modified** (was 0.1) | Puck surface friction — higher value enables visible spin on pin/puck contact |
| pinFriction | `number` | `0.3` | **Modified** (was 0.05) | Pin surface friction — combined with puck friction (~0.35) for tangential torque |
| angularDamping | `number` | `3.0` | **New** | Spin decay rate — `3.0` gives ~1 second decay at 60 Hz |
| maxAngularVelocity | `number` | `12.57` | **New** | Angular velocity cap in rad/s — `12.57` = 2 rotations/sec (4π) |

All other PhysicsConfig fields remain unchanged.

**Validation rules**:
- `angularDamping` must be ≥ 0 (0 = no damping)
- `maxAngularVelocity` must be > 0

---

### ShoveConfig

Extended with off-center offset parameter.

| Field | Type | Default | Change | Description |
|-------|------|---------|--------|-------------|
| shoveOffsetFraction | `number` | `0.25` | **New** | Fraction of puck radius used as off-center offset for shove impulse application point. `0.25` = 25% of radius. |

**Validation rules**:
- `shoveOffsetFraction` must be ≥ 0 and ≤ 1.0 (0 = center, no spin; 1.0 = edge, maximum spin)

---

### Puck (runtime physics entity)

Rotation is enabled on the physics body. No new persisted fields —
rotation state lives in the Planck.js body.

| Property | Type | Change | Description |
|----------|------|--------|-------------|
| body | `planck.Body` | **Modified** | Created with `fixedRotation: false` and `angularDamping` from config. Body now tracks angle and angular velocity natively. |

All other Puck fields remain unchanged.

**Behavioral changes**:
- `body.getAngle()` returns accumulated rotation angle (radians) — previously always 0
- `body.getAngularVelocity()` returns spin rate (rad/s) — previously always 0
- After each `world.step()`, angular velocity is clamped to `±maxAngularVelocity`

---

### PhysicsSnapshot

No schema change. The existing `angle` field (`pucks[].angle`) now
carries meaningful rotation data instead of always being `0`.

| Property | Type | Change | Description |
|----------|------|--------|-------------|
| pucks[].angle | `number` | **Semantic** | Was always `0`; now reflects actual body rotation (radians) |

---

### RenderState

The puck rendering data gains an `angle` field.

| Property | Type | Change | Description |
|----------|------|--------|-------------|
| pucks[].angle | `number` | **New** | Rotation angle in radians, propagated from PhysicsSnapshot. Used by renderer to rotate puck patterns. |
| dropIndicator | (unchanged) | — | Ghost puck always rendered at angle 0 (no rotation). No field change needed — angle is omitted/hardcoded in renderer. |

---

## New Fields Summary

```
PhysicsConfig
  + angularDamping: number        (default: 3.0)
  + maxAngularVelocity: number    (default: 12.57)
  ~ puckFriction: number          (default changed: 0.1 → 0.4)
  ~ pinFriction: number           (default changed: 0.05 → 0.3)

ShoveConfig
  + shoveOffsetFraction: number   (default: 0.25)

RenderState.pucks[]
  + angle: number                 (from PhysicsSnapshot.pucks[].angle)
```

## Entity Relationships

No new entities or relationships. All changes are field additions/modifications
to existing entities. The data flow is:

```
PhysicsConfig.angularDamping ──→ Body creation (simulation.ts)
PhysicsConfig.maxAngularVelocity ──→ Post-step clamping (simulation.ts)
ShoveConfig.shoveOffsetFraction ──→ Off-center impulse point (simulation.ts)
Body.getAngle() ──→ PhysicsSnapshot.pucks[].angle ──→ RenderState.pucks[].angle ──→ Renderer rotation transform
```

## State Transitions

No new states or transitions. Puck rotation is a continuous physical
property that evolves during the existing `falling` turn phase and
persists in the existing `settled` state. The only behavioral addition
is angular velocity clamping after each physics step.
