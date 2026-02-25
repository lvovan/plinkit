# Research: Puck Rotation & Friction Physics (Planck.js 1.4)

**Date**: 2026-02-25
**Source**: Planck.js 1.4 source code (`node_modules/planck/src/dynamics/Body.ts`, `Contact.ts`, `Solver.ts`)

---

## 1. fixedRotation: false + angularDamping

### Answer

`angularDamping` is set on the **body definition** (the `BodyDef` object passed to `world.createBody()`). It can also be changed later via `body.setAngularDamping(value)`.

**Default value**: `0.0` (no damping).

### Damping Formula (from Solver.ts lines 310–320)

The solver applies damping each timestep using the **Padé approximation** of the exponential decay ODE `dω/dt + c·ω = 0`:

```
w *= 1.0 / (1.0 + h * angularDamping)
```

Where:
- `w` = angular velocity (rad/s)
- `h` = timestep duration (seconds), i.e. `1/60` at 60 Hz
- `angularDamping` = the damping coefficient (units: 1/time)

This is applied **every physics step**, so over N steps:

```
w(N) = w(0) * (1 / (1 + h * d))^N
```

### Value for ~1 second decay

At 60 Hz, 1 second = 60 steps. We want `w` to decay to ~5% of its initial value (perceptually "stopped"):

```
(1 / (1 + d/60))^60 ≈ 0.05
```

Solving: `1 / (1 + d/60) ≈ 0.05^(1/60) ≈ 0.9512`, so `d/60 ≈ 0.0513`, giving **d ≈ 3.08**.

| angularDamping | Decay after 1s (60 steps) | Feel |
|----------------|---------------------------|------|
| 1.0 | ~37% remaining | Very slow decay — spin lasts 2–3+ seconds |
| 2.0 | ~13% remaining | Moderate — spin visible for ~1.5s |
| **3.0** | **~5% remaining** | **~1 second — recommended starting value** |
| 5.0 | ~0.4% remaining | Fast decay — spin dies in ~0.5s |

### Code Snippet

```typescript
const body = world.createBody({
  type: 'dynamic',
  position: planck.Vec2(x, y),
  fixedRotation: false,       // enable rotation
  angularDamping: 3.0,        // ~1 second spin decay
});
```

Or set later:
```typescript
body.setAngularDamping(3.0);
```

### Caveats
- The Planck.js docs warn: *"The damping parameter can be larger than 1.0 but the damping effect becomes sensitive to the time step when the damping parameter is large."* Values up to ~10 are fine at fixed 60 Hz. Avoid values > 20.
- `angularDamping` is on the **body**, not the fixture.

---

## 2. Angular Velocity Capping

### Answer

There is **no built-in `maxAngularVelocity` property** in Planck.js/Box2D. You must clamp manually.

### Manual Clamping

Call `body.setAngularVelocity()` after each `world.step()`:

```typescript
world.step(dt);

for (const puck of activePucks) {
  const w = puck.body.getAngularVelocity();
  const max = config.physics.maxAngularVelocity; // e.g. 12.57
  if (Math.abs(w) > max) {
    puck.body.setAngularVelocity(Math.sign(w) * max);
  }
}
```

**API confirmed** from source (Body.ts line 728):
```typescript
setAngularVelocity(w: number): void {
  if (this.m_type == STATIC) { return; }
  if (w * w > 0.0) { this.setAwake(true); }
  this.m_angularVelocity = w;
}
```

This directly sets `m_angularVelocity` — safe to call after each step.

### Angular velocity ↔ rotation speed

| Rad/s | Rotations/s | Visual feel |
|-------|-------------|-------------|
| 3.14 | 0.5 | Gentle spin |
| 6.28 | 1.0 | Moderate spin |
| **12.57** | **2.0** | **Fast but readable — recommended cap** |
| 18.85 | 3.0 | Very fast, patterns may blur |

Formula: `rotations/s = |ω| / (2π)`, so 2 rot/s = 4π ≈ **12.57 rad/s**.

### Recommended Config

```typescript
maxAngularVelocity: 12.57  // 2 rotations per second
```

### Caveats
- Clamping must happen **after** `world.step()` but **before** reading state for rendering.
- Clamping does not affect the contact solver within that step — the solver may briefly produce higher values internally. This is acceptable.

---

## 3. Off-Center Impulse for Shove Spin

### Answer

`applyLinearImpulse(impulse, point)` applies both linear and angular effects when `point ≠ center of mass`.

**Source code** (Body.ts line 981–992):
```typescript
applyLinearImpulse(impulse: Vec2Value, point: Vec2Value, wake: boolean = true): void {
  // ...
  if (this.m_awakeFlag) {
    this.m_linearVelocity.addMul(this.m_invMass, impulse);
    this.m_angularVelocity += this.m_invI * Vec2.crossVec2Vec2(
      Vec2.sub(point, this.m_sweep.c),   // r = point - center_of_mass
      impulse
    );
  }
}
```

### Torque Formula

```
Δω = invI * (r × impulse)
```

Where:
- `r = point - center_of_mass` (the lever arm vector)
- `r × impulse` = 2D cross product = `r.x * impulse.y - r.y * impulse.x` (scalar torque)
- `invI` = inverse moment of inertia

For a solid circle: `I = 0.5 * m * R²`, so `invI = 2 / (m * R²)`.

With `density = 1.0`, `R = 0.5`: `mass = π * R² * density ≈ 0.785`, `I = 0.5 * 0.785 * 0.25 ≈ 0.098`, `invI ≈ 10.2`.

### Offset Distance Recommendation

The offset `r` should be a fraction of the puck radius. The linear impulse is **unchanged** regardless of application point (same `Δv`), so there's no "trajectory change" — only spin is added.

| Offset (fraction of R=0.5) | |r| (world units) | Δω for impulse mag=5 | Feel |
|----------------------------|-------------------|----------------------|------|
| 10% | 0.05 | ~2.5 rad/s | Barely perceptible spin |
| **20–30%** | **0.10–0.15** | **~5–7.5 rad/s** | **Small, visible spin — recommended** |
| 50% | 0.25 | ~12.5 rad/s | Heavy spin (hits cap) |
| 100% | 0.50 | ~25 rad/s (clamped) | Extreme, unrealistic |

### Recommended Implementation

Apply the impulse at a point offset perpendicular to the shove direction:

```typescript
const center = puck.body.getWorldCenter();
const mag = Math.sqrt(dx * dx + dy * dy);

// Perpendicular offset (always to the "right" of the impulse direction)
// This creates consistent spin direction relative to shove direction
const offsetFraction = 0.25; // 25% of puck radius
const offset = puckRadius * offsetFraction;
const perpX = (-dy / mag) * offset;  // perpendicular to impulse
const perpY = (dx / mag) * offset;

puck.body.applyLinearImpulse(
  planck.Vec2(dx, dy),
  planck.Vec2(center.x + perpX, center.y + perpY)
);
```

### Caveats
- The **linear velocity change is identical** regardless of application point. Only angular velocity changes. Source confirms: `m_linearVelocity.addMul(this.m_invMass, impulse)` — no dependency on `point`.
- The cross product sign determines spin direction. A positive cross product = counter-clockwise spin in Planck.js's coordinate system.
- For determinism, the offset calculation must use the same quantized shove vector, not raw floating-point input.

---

## 4. Friction-Based Torque on Circle Collisions

### Answer

**Yes — setting friction > 0 on both fixtures is sufficient.** Planck.js automatically computes tangential friction forces and applies the resulting torque to both bodies. No custom code is needed.

### How It Works (Contact.ts lines 955–990)

The velocity constraint solver:

1. **Computes the tangent direction** perpendicular to the contact normal:
   ```typescript
   matrix.crossVec2Num(tangent, normal, 1.0);
   ```

2. **Computes relative tangential velocity** at the contact point (including rotational contribution):
   ```typescript
   // dv includes both linear velocity AND ω × r terms
   dv = vB + wB × rB - vA - wA × rA
   vt = dot(dv, tangent)
   ```

3. **Computes tangential impulse** clamped by friction cone:
   ```typescript
   lambda = tangentMass * (-vt)
   maxFriction = friction * normalImpulse   // Coulomb friction
   newImpulse = clamp(accumulated + lambda, -maxFriction, maxFriction)
   ```

4. **Applies tangential impulse to both linear AND angular velocities**:
   ```typescript
   wA -= iA * cross(rA, P)   // P = lambda * tangent
   wB += iB * cross(rB, P)
   ```

The key insight: `rA` and `rB` are the vectors from each body's center of mass to the contact point. For a circle, `r = radius * contactNormal`, so `cross(r, tangent) = radius` (since normal ⊥ tangent). This means:

```
Δω = invI * radius * tangentImpulse
```

For the puck (`fixedRotation: false`): `invI > 0`, so torque is applied → **rotation emerges naturally**.
For the pin (`static` body): `invI = 0`, so no angular effect on the pin (correct — pins don't rotate).

### Friction Mixing

Combined friction between two fixtures uses the **geometric mean** (Contact.ts line 83–84):

```typescript
function mixFriction(friction1: number, friction2: number): number {
  return Math.sqrt(friction1 * friction2);
}
```

| Puck Friction | Pin Friction | Combined | Effect |
|---------------|--------------|----------|--------|
| 0.1 (current) | 0.05 (current) | 0.071 | Almost no spin — friction too low |
| 0.3 | 0.2 | 0.245 | Light spin |
| **0.4** | **0.3** | **0.346** | **Visible spin on glancing hits — recommended** |
| 0.6 | 0.5 | 0.548 | Heavy spin, puck "grips" pins |

### Recommended Config Values

```typescript
puckFriction: 0.4,   // up from 0.1
pinFriction: 0.3,    // up from 0.05
```

### Caveats
- With `fixedRotation: true` (current state), `m_invI = 0`, so friction impulses produce **zero torque**. The tangential impulse still exists but only affects linear velocity. Switching to `fixedRotation: false` is all that's needed to "unlock" friction-driven rotation.
- Circle-circle contacts have exactly 1 contact point, so the solver uses the simple (non-block) path.
- Wall friction (edges) also contributes to puck spin — the existing wall friction values (0.1–0.5) will produce small spin when pucks scrape walls.
- Puck-puck friction works identically — both pucks have `invI > 0`, so angular momentum transfers between them automatically.

---

## 5. Determinism with Rotation Enabled

### Answer

**Enabling rotation does NOT break Planck.js determinism**, provided:

1. **Same inputs** → same `fixedRotation`, `angularDamping`, friction values, `maxAngularVelocity` cap
2. **Same execution** → same fixed timestep, same iteration counts, same step order
3. **Same platform** → same browser/JS engine (IEEE 754 double precision)

### Why It Remains Deterministic

- Planck.js uses only **deterministic floating-point arithmetic** (add, multiply, divide, sqrt). No random number generators.
- The angular velocity is integrated using the same Padé approximation formula each step — no conditional branches that could diverge.
- The contact solver iterates in the same order (bodies are stored in insertion order via linked lists).
- Angular velocity clamping (manual, after step) uses only `Math.abs`, `Math.sign`, and comparison — all deterministic.

### Cross-Platform Concerns

- **Same browser, same device**: Fully deterministic. Identical outputs guaranteed.
- **Different browsers / different architectures**: IEEE 754 double precision guarantees identical results for basic operations (+, -, *, /). However, `Math.sqrt` may differ by 1 ULP (unit in the last place) across implementations. In practice, this has not caused divergence in Planck.js for typical game scenarios.
- **The project's existing determinism approach** (fixed timestep, same inputs, quantized shoves) is sufficient. Rotation adds no new sources of non-determinism.

### Caveats
- The angular velocity cap must use the **same clamped value** on all clients if multiplayer replay is needed. This is trivially satisfied since `maxAngularVelocity` comes from config.
- The off-center impulse offset must be computed deterministically from the quantized shove vector — avoid using any runtime-variable values (mouse position, frame time, etc.) in the offset calculation.
- `allowSleep: true` is already set. Bodies with near-zero angular velocity will be put to sleep by the engine's existing sleep logic (threshold includes `angularVelocity² > angularSleepToleranceSqr`). This is deterministic.

---

## Summary of Recommended Config Values

```typescript
// PhysicsConfig additions
angularDamping: 3.0,           // ~1 second spin decay at 60 Hz
maxAngularVelocity: 12.57,     // 2 rotations/second cap (4π)

// PhysicsConfig changes
puckFriction: 0.4,             // up from 0.1 — enables visible spin from pin contacts
pinFriction: 0.3,              // up from 0.05 — combined friction ≈ 0.35

// Body definition change
fixedRotation: false,          // was true — unlocks rotation physics

// Shove offset
shoveOffsetFraction: 0.25,     // 25% of puck radius — small spin per shove
```

These are starting points for playtesting. The spec suggests tuning ranges of:
- `puckFriction`: 0.3–0.5
- `pinFriction`: 0.2–0.4
- `angularDamping`: 1.0–3.0 (we start at 3.0 for the "~1 second" requirement)
