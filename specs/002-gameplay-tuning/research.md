# Research: Gameplay Tuning

**Feature**: 002-gameplay-tuning  
**Date**: 2026-02-24  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## 1. Out-of-Bounds Detection Pattern in Planck.js

### Question

What's the best way to detect when a dynamic body (puck) has moved above a certain Y coordinate (top of board) in Planck.js? Three options considered: (a) position check each step, (b) sensor body/fixture at the boundary, (c) AABB queries.

### Decision

**Option (a): Per-step position check** — read `body.getPosition().y` for each active puck during the `step()` method.

### Rationale

1. **Matches existing architecture**: The `BucketDetector.checkSettled()` already reads puck position every tick in the `step()` loop. Adding an OOB check is a single `if (pos.y > topBoundaryY)` comparison in the same loop — zero structural change.

2. **Trivially cheap**: The game has at most 4 active pucks. Reading `body.getPosition()` is a direct memory access (no computation). The entire OOB check is O(activePucks) ≈ O(4) per tick.

3. **Deterministic**: Position checks tied to the fixed-timestep simulation produce identical results across runs. No dependency on asynchronous contact callbacks or broadphase state.

4. **No edge cases**: A sensor body approach requires:
   - A static body with a sensor fixture spanning the full board width above the top edge.
   - Tracking begin-contact/end-contact events per puck (Map bookkeeping).
   - Handling the case where a very fast puck tunnels through the sensor's thin geometry.
   - The grace period logic still needed separately.
   
   All of this added complexity yields no benefit over a position check.

5. **Boundary definition is simple**: The top boundary Y is `boardHeight / 2` (currently 7.0). The check is `pos.y > boardHeight / 2 + puckRadius` (puck center fully above the top edge), matching FR-001 and the spec's edge case note ("puck must be fully above the top boundary").

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **(b) Sensor body** | "Physics-native"; works via contact callbacks | Adds a body + fixture to the world; requires contact filtering; tunneling risk for thin sensors; grace period still needs separate logic; more code for the same result |
| **(c) AABB query** | Can batch-query a region | `world.queryAABB()` walks the broadphase tree (O(log n)) — heavier than a direct position read; returns fixtures not bodies, requiring unwrapping; no advantage when we already have a reference to every puck |

### Implementation Sketch

```typescript
// In PhysicsSimulationImpl.step(), after world.step():
const topBoundaryY = this.config.boardLayout.boardHeight / 2;

for (const puck of this.board.pucks) {
  if (puck.isSettled) continue;
  const pos = puck.body.getPosition();
  if (pos.y > topBoundaryY + this.config.boardLayout.puckRadius) {
    // Puck center is fully above the top edge → start/continue grace period
  }
}
```

---

## 2. Grace Period Implementation for Out-of-Bounds

### Question

The puck should only be declared out-of-bounds if it stays above the top edge for 0.5 seconds continuously. What pattern — tick counter, timestamp-based, or state flag with frame counting?

### Decision

**Tick counter** — record the simulation tick when the puck first goes OOB; declare out-of-bounds when `currentTick - firstOobTick >= OOB_GRACE_TICKS`. Reset the timer if the puck returns in-bounds.

### Rationale

1. **Proven pattern in the codebase**: `BucketDetector` uses exactly this pattern via `stalledTimers: Map<string, number>`. The OOB detector can use an identical `oobTimers: Map<string, number>` with the same logic:

   ```typescript
   const OOB_GRACE_TICKS = 30; // 0.5s at 60 fps

   if (isAboveTop) {
     if (!this.oobTimers.has(puck.id)) {
       this.oobTimers.set(puck.id, currentTick);
     }
     if (currentTick - this.oobTimers.get(puck.id)! >= OOB_GRACE_TICKS) {
       // Declare OOB
     }
   } else {
     this.oobTimers.delete(puck.id); // Puck returned — reset
   }
   ```

2. **Deterministic**: Ticks are tied to the fixed-timestep simulation (1/60s per tick). The grace period is always exactly 30 ticks (0.5s of sim time), regardless of tab backgrounding, frame drops, or wall-clock drift.

3. **Timestamp-based is wrong for this game**: If the browser tab is backgrounded, `performance.now()` advances but the physics simulation doesn't step. A timestamp-based timer would incorrectly expire the grace period during a pause. The tick counter only advances when the simulation actually runs.

4. **State flag + frame counter adds nothing**: A boolean `isOob` flag plus a separate `oobFrames` counter is functionally identical to the tick-counter Map but splits state across two variables. The Map entry's existence *is* the flag.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Timestamp (`performance.now()`)** | Familiar wall-clock semantics | Decoupled from sim time; advances during pause/background; non-deterministic across runs |
| **State flag + frame counter** | Explicit boolean makes intent clear | Two state variables instead of one Map entry; no functional advantage; diverges from established BucketDetector pattern |

### Constants

```typescript
/** Ticks a puck must remain above the top boundary to be declared OOB */
const OOB_GRACE_TICKS = 30; // 0.5s at 60 fps (matches BUCKET_SETTLE_TICKS)
```

---

## 3. Puck Radius Scaling Considerations

### Question

When doubling pin spacing from 1.0 to 2.0, the puck radius scales from 0.25 to ~0.5. Are there Planck.js-specific concerns (tunneling, collision quality, performance) at 60fps fixed timestep?

### Decision

**No Planck.js concerns. The radius of 0.5 is safe.** One gameplay-level observation about gap clearance is noted below.

### Rationale

#### Tunneling (CCD)

Tunneling occurs when a body moves farther than its own diameter in one timestep. At `dt = 1/60`:

- Puck diameter: `2 × 0.5 = 1.0` world unit
- Tunneling velocity threshold: `1.0 / (1/60) = 60 units/s`
- Maximum puck speed scenarios:
  - **Free-fall from top** (7 units): `v = √(2×10×7) ≈ 11.8 units/s` — far below threshold
  - **After max shove** (`maxForceMagnitude = 5.0` impulse on `density=1.0` puck): peak velocity ≈ 15–25 units/s depending on puck mass — still well under 60 units/s
  - **Worst case** (shove + gravity combined): < 40 units/s — still safe

The `bullet` flag is currently `false` on pucks. It can remain `false` since velocities stay well under the tunneling threshold. If extreme shove forces are ever added, enabling `bullet: true` for pucks adds continuous collision detection at negligible cost (1–4 bodies).

#### Collision Detection Quality

Planck.js circles are the most numerically stable shape primitive. The [Planck.js / Box2D documentation](https://box2d.org/documentation/) recommends shapes between 0.1 and 10.0 world units. A radius of 0.5 is squarely in the optimal range. No quality concerns.

#### Performance

Circle-vs-circle and circle-vs-edge contact resolution is O(1) per pair. The broadphase AABB for a radius-0.5 circle is `1.0 × 1.0` (vs `0.5 × 0.5` for radius 0.25). The AABB tree cost scales with `log(n)` and is unaffected by this small size increase. With ≤ 4 pucks and ~30 pins (down from ~100), performance improves overall.

#### Gameplay Observation: Gap Clearance

The puck-to-gap-ratio changes because pin radius (`0.15`) is **not** being scaled:

| Metric | Original (spacing=1.0, puckR=0.25) | New (spacing=2.0, puckR=0.5) |
|--------|-------------------------------------|-------------------------------|
| Gap between pin edges | `1.0 - 2×0.15 = 0.70` | `2.0 - 2×0.15 = 1.70` |
| Puck diameter | `0.50` | `1.00` |
| Clearance (gap − puck) | `0.20` | `0.70` |
| Clearance ratio (clearance / spacing) | `0.20` | `0.35` |

The puck has proportionally more room to pass between pins without deflection. This may reduce pin interaction frequency slightly. Two mitigations if needed:

1. **Scale pin radius proportionally**: `0.15 → 0.30` to maintain the original clearance ratio. This is not in the current spec but could be a follow-up tuning knob.
2. **Accept the wider clearance**: With 6 rows instead of 12, the puck hits fewer pins overall. Slightly wider gaps may offset the reduced row count to keep the overall "bounce count" similar.

Neither is a Planck.js engine concern — purely gameplay tuning.

---

## 4. Pin Stagger Verification

### Question

With 5 buckets, even rows have 5 pins and odd rows have 4 pins. At `pinSpacing=2.0`, does the layout produce proper stagger (no odd-row pin directly below an even-row pin)?

### Decision

**The proposed config (5 buckets, spacing 2.0) WILL produce correct stagger — but only after fixing a bug in `computePinPositions()`.** The current formula applies a `rowOffset = pinSpacing / 2` to odd rows that **destroys** the natural stagger, causing 100% pin overlap in both the old and new configurations.

### Analysis

The current formula in `computePinPositions()` ([src/config/board-geometry.ts](../../src/config/board-geometry.ts#L22-L24)):

```typescript
const pinsInRow = row % 2 === 0 ? bucketCount : bucketCount - 1;
const rowOffset = row % 2 === 0 ? 0 : pinSpacing / 2;  // ← BUG
const rowWidth = (pinsInRow - 1) * pinSpacing;
// ...
const x = -rowWidth / 2 + col * pinSpacing + rowOffset;
```

#### Why the offset is wrong

When an odd row has N−1 pins and an even row has N pins, centering both rows at x=0 **naturally** produces half-spacing stagger. Adding `rowOffset = pinSpacing / 2` shifts the odd row by exactly one half-spacing, which cancels the natural offset and aligns pins vertically.

#### Verification with proposed config (bucketCount=5, pinSpacing=2.0)

**With `rowOffset` (current code — BROKEN):**

| Row type | Pins | Positions |
|----------|------|-----------|
| Even (5 pins) | 5 | **−4.0, −2.0, 0.0, 2.0, 4.0** |
| Odd (4 pins, offset=1.0) | 4 | **−2.0, 0.0, 2.0, 4.0** |

All 4 odd-row pins overlap with even-row pins. **Zero stagger.**

**Without `rowOffset` (FIXED):**

| Row type | Pins | Positions |
|----------|------|-----------|
| Even (5 pins) | 5 | **−4.0, −2.0, 0.0, 2.0, 4.0** |
| Odd (4 pins, no offset) | 4 | **−3.0, −1.0, 1.0, 3.0** |

Each odd-row pin is exactly midway between two adjacent even-row pins. **Perfect stagger.** ✓

#### Verification with original config (bucketCount=9, pinSpacing=1.0)

**With `rowOffset` (current code — ALSO BROKEN):**

| Row type | Pins | Positions |
|----------|------|-----------|
| Even (9 pins) | 9 | −4, −3, −2, −1, 0, 1, 2, 3, 4 |
| Odd (8 pins, offset=0.5) | 8 | **−3, −2, −1, 0, 1, 2, 3, 4** |

8 of 8 odd-row pins overlap with even-row pins. **Zero stagger.**

**Without `rowOffset` (FIXED):**

| Row type | Pins | Positions |
|----------|------|-----------|
| Even (9 pins) | 9 | −4, −3, −2, −1, 0, 1, 2, 3, 4 |
| Odd (8 pins, no offset) | 8 | **−3.5, −2.5, −1.5, −0.5, 0.5, 1.5, 2.5, 3.5** |

Perfect stagger. ✓

### Required Fix

In [src/config/board-geometry.ts](../../src/config/board-geometry.ts#L23), change:

```typescript
// BEFORE (broken):
const rowOffset = row % 2 === 0 ? 0 : pinSpacing / 2;

// AFTER (fixed):
const rowOffset = 0;
```

Or simply remove the `rowOffset` variable and the `+ rowOffset` from the position calculation.

### Board Coverage Check

With 5 buckets and `pinSpacing = 2.0`:
- Even row span: `(5−1) × 2.0 = 8.0 units` → 80% of 10-unit board width ✓
- Odd row span: `(4−1) × 2.0 = 6.0 units` → 60% of board width (acceptable — standard Plinko odd rows are narrower)
- Both rows centered at x=0 ✓

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Keep `rowOffset` and fix the value | Could theoretically adjust the amount | No correct non-zero value exists — the centering already provides the right offset |
| Use same pin count for all rows, alternate offset | Uniform density | Doesn't match standard Plinko layout; even/odd alternation with N / N−1 is the classic pattern |

---

## Summary of Findings

| # | Question | Decision | Risk |
|---|----------|----------|------|
| 1 | OOB detection pattern | Per-step position check (`pos.y > topBoundary`) | None — matches existing BucketDetector pattern |
| 2 | Grace period pattern | Tick counter via `Map<string, number>` (30 ticks = 0.5s) | None — identical to `stalledTimers` in BucketDetector |
| 3 | Puck radius 0.5 in Planck.js | Safe — no tunneling, collision, or performance concerns | Gameplay: wider gap clearance (note only, not a Planck.js issue) |
| 4 | Pin stagger at 5 buckets / spacing 2.0 | **Bug found:** `rowOffset` in `computePinPositions()` breaks stagger. Fix: remove `rowOffset`. After fix, stagger is perfect. | **High** — must fix before or during this feature |

---

## 5. New Board Configuration Values

### Decision

The following `DEFAULT_BOARD_LAYOUT` values change:

| Parameter | Old Value | New Value | Rationale |
|-----------|-----------|-----------|-----------|
| `pinRows` | 12 | 6 | Halved per spec FR-005 |
| `bucketCount` | 9 | 5 | Proportional reduction per spec FR-007 |
| `pinSpacing` | 1.0 | 2.0 | Maintains ~80% board-width coverage (clarification Q1, FR-005a) |
| `puckRadius` | 0.25 | 0.5 | Proportional to pinSpacing 2× scaling (FR-009) |
| `bucketScores` | [100,500,1000,5000,10000,5000,1000,500,100] | [100,1000,10000,1000,100] | Symmetric, high-center pattern (FR-008) |
| `pinRadius` | 0.15 | 0.15 | Unchanged |
| `boardWidth` | 10.0 | 10.0 | Unchanged |
| `boardHeight` | 14.0 | 14.0 | Unchanged |

`DEFAULT_SHOVE_CONFIG.shoveZoneRowLimit`: 9 → 5 (maintains ~83% of pin field as shove zone: 5 of 6 rows ≈ original 9 of 12 = 75%).

### Alternatives Considered

- **Bucket scores [100, 500, 5000, 500, 100]**: Lower max score, but maintaining 10000 at center preserves risk/reward tension from the original layout.
- **shoveZoneRowLimit = 4**: Would be exact 67% scaling (4 of 6), but row 5 (83%) feels better gameplay-wise since fewer rows means each row matters more.

---

## 6. Particle Reduction Values

### Decision

Change `PARTICLE_CONFIG.pinHit.count` from 6 to 3.

### Rationale

3 particles is the upper bound of the specified 2–3 range. Using 3 provides a visible spark while cutting the count in half. Using 2 risks the effect being barely perceptible, especially on mobile where particles are already small. The particle size range (`sizeMin: 1.5, sizeMax: 3`) and speed range remain unchanged — only count is reduced.

### Alternatives Considered

- **Count = 2**: Minimum viable. Makes pin-hit effects almost invisible on small screens.
- **Count = 3 with reduced speed/size**: Over-tuning. The count reduction alone achieves the goal.
