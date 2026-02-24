# Research: Deterministic Physics Simulation with Planck.js

**Date**: 2026-02-24  
**Context**: Best practices for implementing deterministic, fixed-timestep physics in a browser-based Plinko game using Planck.js (Box2D port)  
**Status**: Complete  
**Depends on**: [research-physics-engine.md](research-physics-engine.md) (Planck.js selected as physics engine)

---

## 1. Fixed-Timestep Physics Loop (Accumulator Pattern)

### The Problem

Browser `requestAnimationFrame` delivers frames at variable intervals (16.6 ms at 60 fps, but can spike to 33 ms+ under load, or run at 120 fps on ProMotion displays). Feeding variable delta times into `world.step()` produces non-deterministic results and unstable simulations.

### The Solution: Accumulator Pattern

The canonical approach (from Glenn Fiedler's "Fix Your Timestep!") decouples physics from rendering:

```
accumulator += elapsed wall-clock time since last frame
while (accumulator >= FIXED_DT):
    apply any queued inputs for this simulation step
    world.step(FIXED_DT, velIter, posIter)
    simulationTick++
    accumulator -= FIXED_DT
render with interpolation: alpha = accumulator / FIXED_DT
```

**Key properties:**
- `world.step()` is always called with an identical `FIXED_DT` — never a variable value
- The `while` loop catches up if a frame was slow (e.g., two steps instead of one)
- Leftover time in the accumulator carries over to the next frame, not discarded
- A frame-time clamp (e.g., `Math.min(frameTime, 0.25)`) prevents the "spiral of death" where the simulation can never catch up after a long pause (tab switch, debugger breakpoint)

### Rendering Interpolation

After the physics loop, there will typically be a fractional timestep remainder in the accumulator. To avoid visual stutter, interpolate body positions for rendering:

```
alpha = accumulator / FIXED_DT
renderPosition = currentPosition * alpha + previousPosition * (1 - alpha)
```

This requires storing each body's previous-frame position before each `world.step()` call. For Plinko this is straightforward — iterate over active dynamic bodies and cache `body.getPosition()` before stepping.

### Planck.js API

```ts
world.step(timeStep: number, velocityIterations?: number, positionIterations?: number): void
```

- `timeStep`: "This should not vary" (from Planck.js docs) — use a constant
- Auto-clears forces after each step by default (`world.getAutoClearForces()` → `true`)
- If doing sub-stepping, call `world.setAutoClearForces(false)` and manually call `world.clearForces()` after all sub-steps

### Recommendation for Plinkit

- **Use `FIXED_DT = 1/60` (16.667 ms)** — the standard Box2D timestep. Good balance of accuracy and performance. No need for 1/120 given the moderate speeds and body count in Plinko.
- **Clamp frame time to 250 ms** — prevents runaway catch-up after tab switches.
- **Cap at 4 physics steps per frame** — additional safety against spiral of death on very slow devices.
- **Implement interpolation** — essential for smooth visuals when the display rate doesn't perfectly match the physics rate.

---

## 2. Planck.js Determinism Guarantees

### What is guaranteed

From Planck.js documentation (Limitations page):

> "For the same input, and same javascript runtime, Box2D/Planck.js will reproduce any simulation. Box2D/Planck.js does not use any random numbers nor base any computation on random events (such as timers, etc)."

This means: **same initial world state + same sequence of `world.step()` calls + same forces/impulses applied at the same simulation ticks = identical output**, within a single browser/JS engine.

### What is NOT guaranteed

Cross-browser/cross-platform determinism is explicitly not guaranteed:

> "People often want to know if Box2D/Planck.js can produce identical results on different binaries and on different platforms. The answer is no."

Reasons:
- JavaScript `Math.sin`, `Math.cos`, `Math.atan2` are implementation-defined (V8 vs SpiderMonkey vs JavaScriptCore may give different results)
- JIT compilers may reorder floating-point operations
- No fixed-point or soft-float fallback exists in Planck.js

### What you must avoid to maintain determinism

| Threat | Why it breaks determinism | Mitigation |
|--------|--------------------------|------------|
| Variable timestep | Different `dt` values → different solver results | Always pass the same constant `FIXED_DT` to `world.step()` |
| Frame-rate-dependent input | Applying forces in `requestAnimationFrame` without tying to simulation tick | Queue inputs, apply at specific simulation tick numbers |
| Non-deterministic iteration order | Iterating bodies/contacts in unpredictable order for game logic | Don't use `Map` iteration order for physics-affecting decisions; use the world's linked list order which is stable |
| `Math.random()` in physics path | Random perturbation injected into simulation | Never use randomness for any physics parameter; compute all values deterministically from game state |
| Floating-point intermediaries | Computing a value outside the engine and feeding it in (e.g., `Math.sin(angle) * force`) | Acceptable within same browser session — these values are deterministic on the same JS engine. Only a cross-browser concern. |
| Changing world configuration mid-sim | Modifying gravity, iteration counts, etc. between steps | Set all world parameters once at initialization; never change during a simulation run |
| Object creation/destruction order | Adding/removing bodies changes the world's internal linked lists | Always create/destroy bodies in the same deterministic order |

### Plinkit-specific assessment

For a couch-competitive game (same device, same browser, same session), Planck.js determinism is **fully sufficient**. The spec requirement — "same drop position + same initial conditions → same final bucket" — is met as long as:

1. The physics loop uses a fixed timestep
2. Shove forces are applied at deterministic simulation ticks (not at arbitrary frame times)
3. No randomness is introduced anywhere in the physics pipeline
4. Bodies are created in the same order every game

---

## 3. Body Sleeping and Determinism

### How sleeping works in Planck.js

Sleeping is an optimization inherited from Box2D. When a body's linear and angular velocities remain below internal thresholds for a period of time (~0.5 seconds by default), the body is put to sleep:

- **Sleeping bodies are excluded from the solver** — zero CPU cost per step
- **Sleeping bodies still participate in broad-phase** — they can be detected for collision
- **A sleeping body is woken automatically** when:
  - Another body collides with it
  - A force/impulse is applied to it
  - A joint connected to it is activated
  - `body.setAwake(true)` is called manually

### Sleeping and determinism

**Sleeping is deterministic.** The sleep/wake transitions are determined by the solver's internal velocity thresholds and timers, which are themselves deterministic given the same sequence of inputs. A sleeping body maintains its exact position and zero velocity — no drift, no numerical accumulation.

**Key concern — island system:** Box2D groups touching bodies into "islands" for solving. When a new puck hits a pile of sleeping pucks, the impacted pucks wake up and form a temporary island. The solver resolves this island, and once the pucks re-settle, they sleep again. This entire process is deterministic.

### Configuration

```ts
// World level — enable sleeping globally (default: true)
const world = new World({ allowSleep: true, gravity: { x: 0, y: -10 } });

// Body level — individual body sleep control
body.setSleepingAllowed(true);  // default: true
body.setAwake(true);            // wake a sleeping body
body.isAwake();                 // query sleep state
```

### Recommendation for Plinkit

- **Keep sleeping enabled** (`allowSleep: true`) — critical for performance with 80+ persistent bodies
- Sleeping is safe for determinism — no special handling needed
- After a puck settles and sleeps, it will stay in its exact position until disturbed
- When a new puck collides with sleeping pucks, they will wake, interact, and re-settle deterministically

---

## 4. Velocity Iterations vs Position Iterations

### What they do

The Box2D constraint solver has two phases per `world.step()` call:

1. **Velocity iterations**: Compute impulses to make bodies move correctly after collisions. Affects bounce accuracy, energy conservation, and how precisely restitution is applied. Higher values → more accurate bounces.

2. **Position iterations**: Adjust body positions to resolve overlap and prevent penetration. Affects stacking stability and how tightly bodies fit together. Higher values → less visual penetration between bodies.

These are iterative (Gauss-Seidel) — each iteration refines the solution. More iterations = better accuracy but more CPU time. The solver also exits early if the error is already small enough, so higher values don't always cost proportionally more.

### Planck.js defaults and recommendations

| Source | Velocity | Position | Notes |
|--------|----------|----------|-------|
| Planck.js docs (basic example) | 6 | 2 | "Suggested" |
| Planck.js docs (simulation page) | 8–10 | 3–8 | "Tune to your liking" |
| Box2D manual | 8 | 3 | Standard recommendation |
| iforce2d tutorials | 8 | 3 | "Start low, increase if collisions look sloppy" |

### Plinko-specific analysis

Plinko has specific demands:

- **High restitution collisions**: Pucks bounce off pins — velocity iterations matter most here. Too few iterations → inconsistent bounce angles, energy not conserved properly.
- **Circle-circle and circle-static collisions only**: Simpler than polygon contacts — the solver converges faster.
- **No stacking under high load**: Pucks settle into the bucket area but don't form tall towers. Position iterations matter less than in a block-stacking game.
- **Determinism concern**: The iteration count affects the solution quality but does not affect determinism *as long as the count is fixed*. The solver will produce the same result with the same iteration count every time.

### Recommendation for Plinkit

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Velocity iterations | **8** | Standard Box2D recommendation. Circle-only collisions converge well at 8. Provides accurate bounce behavior for Plinko pin interactions. |
| Position iterations | **3** | Sufficient for circle bodies that don't form deep stacks. Keeps per-step cost low. |

These values should be **fixed at initialization and never changed** during gameplay (determinism requirement). If bounces feel unrealistic during tuning, increase velocity iterations to 10 before adjusting restitution.

**Important guidance from Planck.js docs**: "60Hz and 10 iterations is far better than 30Hz and 20 iterations." Prefer higher step rate over higher iteration count.

---

## 5. Applying a Shove Force Mid-Simulation

### The shove mechanic

The player performs a flick gesture while their puck is falling through the top two-thirds of the board. This must apply a directional force/impulse to the puck at a specific, deterministic point in the simulation.

### Force vs Impulse

| Method | API | Effect | When to use |
|--------|-----|--------|-------------|
| `body.applyForce(force, point)` | Accumulated over the timestep | Gradual acceleration; effect depends on mass and timestep | Continuous effects (wind, thrust) |
| `body.applyForceToCenter(force)` | Same, but at center of mass | No torque generated | Continuous, non-rotating effects |
| `body.applyLinearImpulse(impulse, point)` | Instant velocity change | Immediate v = v + impulse/mass | One-shot events (shove, explosion) |
| `body.setLinearVelocity(v)` | Direct velocity override | Replaces current velocity entirely | Teleport-like mechanics |

**For the shove mechanic, use `applyLinearImpulse()`**:

- A shove is a discrete, one-time event — not a continuous force
- Impulse directly changes velocity in a single step, which is more intuitive for a "flick" gesture
- The impulse magnitude should be derived deterministically from the quantized flick vector
- Applying it at the body's world center avoids introducing spin (unless spin is desired)

### Deterministic application

The critical requirement is that the shove is applied at the **same simulation tick** every time. Architecture:

1. **Player performs flick** → gesture system computes a flick vector
2. **Quantize the flick vector** → round the vector components to a fixed precision (e.g., nearest 0.001) to eliminate floating-point noise from touch/mouse input
3. **Queue the shove** as `{ tick: currentSimTick, impulse: Vec2(qx, qy) }` — do NOT apply immediately
4. **In the physics loop**, before calling `world.step()`, check if any queued shoves match the current tick:

```
for each queued shove where shove.tick === currentSimTick:
    puckBody.applyLinearImpulse(shove.impulse, puckBody.getWorldCenter())
    // applyLinearImpulse automatically wakes the body
```

5. Then call `world.step(FIXED_DT, velIter, posIter)`

### Shove zone boundary check

The spec restricts shoves to the top two-thirds of the board (rows 1–9 of 12). This check should be done **at the time the gesture occurs**, using the puck's current physics position:

```
const puckY = puckBody.getPosition().y;
const shoveZoneBoundary = boardTop - (boardHeight * 2/3);  // in physics units
if (puckY > shoveZoneBoundary) {
    // Allow shove — puck is in the shove zone
}
```

Note: Planck.js uses a Y-up coordinate system (like Box2D), so "higher on the board" = larger Y values.

### Force capping

The spec requires a maximum shove intensity. Clamp the impulse magnitude:

```
const maxImpulse = MAX_SHOVE_MAGNITUDE;  // tunable constant
const magnitude = Vec2.lengthOf(impulseVec);
if (magnitude > maxImpulse) {
    impulseVec = Vec2.mul(impulseVec, maxImpulse / magnitude);
}
```

---

## 6. Stalled Body Detection

### The problem

A puck may fail to reach a scoring bucket — it could get wedged between pins, balanced on a pin, or oscillating slowly. The game needs to detect this and resolve it.

### Approach 1: Velocity threshold over time (recommended)

Track each active puck's linear velocity magnitude. If it stays below a threshold for N consecutive simulation ticks, consider it stalled:

```
interface PuckState {
    body: Body;
    lowVelocityTicks: number;
}

// After each world.step():
const speed = Vec2.lengthOf(puck.body.getLinearVelocity());
if (speed < STALL_VELOCITY_THRESHOLD) {
    puck.lowVelocityTicks++;
} else {
    puck.lowVelocityTicks = 0;
}

if (puck.lowVelocityTicks >= STALL_TICK_LIMIT) {
    // Body is stalled — take action
}
```

**Recommended values (starting point, needs tuning):**

| Parameter | Value | Notes |
|-----------|-------|-------|
| `STALL_VELOCITY_THRESHOLD` | 0.1 m/s | Below this, the body is "barely moving" |
| `STALL_TICK_LIMIT` | 120 ticks (2 seconds at 60 Hz) | Long enough to avoid false positives from momentary pauses |

### Approach 2: Position delta over time

Track the body's position every N ticks. If it hasn't moved more than a threshold distance, it's stalled:

```
// Every 60 ticks (1 second):
const displacement = Vec2.lengthOf(Vec2.sub(currentPos, lastRecordedPos));
if (displacement < STALL_DISTANCE_THRESHOLD) {
    stallCount++;
}
```

This is simpler but less responsive than velocity tracking.

### Approach 3: Use Box2D sleeping as a proxy

Since Box2D puts bodies to sleep when they're at rest, `body.isAwake() === false` is a natural "settled" indicator. However, sleeping thresholds are internal to Box2D and not directly configurable — and a body might sleep while balanced on a pin (not in a bucket). So sleeping alone is not sufficient; it detects "settled" but not "settled in a valid location."

### Recommended composite approach for Plinkit

Combine sleeping detection with position validation:

1. **Primary signal**: `body.isAwake() === false` — body has come to rest
2. **Validation**: Check if the puck's final Y position is within the bucket zone
3. **Timeout fallback**: If the puck has been active for more than `MAX_TURN_TICKS` (e.g., 600 = 10 seconds at 60 Hz) regardless of velocity, force-settle it

This three-layer approach handles:
- Normal settling (sleeping detection)
- Wedged/stuck pucks (timeout fallback)
- Slowly oscillating pucks (velocity threshold contributes to sleep + timeout catches edge cases)

### Resolution options for stalled pucks

When a stall is detected and the puck is not in a valid bucket:
- **Option A**: Apply a small downward impulse to nudge it free (may not be deterministic if applied at arbitrary times — must be at a fixed tick)
- **Option B**: Teleport it to the nearest bucket (feels artificial but is clean)
- **Option C**: Score it in the bucket it's closest to horizontally (best UX — no visual teleport needed, just assign the score)

---

## 7. Performance with 80+ Circle Bodies

### Baseline assessment

Box2D was designed for games with hundreds of bodies on constrained hardware. 80 circle bodies is a light workload. Key data points:

- Box2D C++ games routinely handle 200–500+ bodies at 60 fps
- Planck.js is pure JavaScript (no WASM overhead), running on modern JS engines with JIT compilation
- The Plinko scenario is favorable: most bodies are sleeping after settling, and new collisions only wake a local cluster (island system)

### How Box2D/Planck.js optimizations help

| Optimization | How it helps Plinko |
|--------------|-------------------|
| **Island system** | Groups interacting bodies for solving. A new puck hitting 3 sleeping pucks creates a small island of 4 bodies — the solver only processes those 4, not all 80. |
| **Body sleeping** | Settled pucks consume zero solver time. In steady state, only 1 body (the falling puck) + a few recently disturbed bodies are active. |
| **AABB tree broad-phase** | O(n log n) collision detection. Circle-circle and circle-static pairs are cheaply culled by bounding box. |
| **Circle collision specialization** | Circle-circle collision detection is the simplest case — just a distance check. No GJK/SAT needed. |

### Expected per-frame cost breakdown (80 bodies, ~75 sleeping)

| Phase | Active bodies | Approximate cost |
|-------|---------------|-----------------|
| Broad-phase | All 80 (AABB queries) | ~0.1 ms |
| Narrow-phase | ~5–10 active pairs | ~0.05 ms |
| Solver (velocity + position) | ~5 active bodies in island | ~0.1 ms |
| **Total per step** | | **~0.25 ms** |

On a Snapdragon 680 (budget 2022 phone), JavaScript runs roughly 3–5x slower than desktop. So ~0.75–1.25 ms per physics step — well within the 16.6 ms frame budget.

### Optimization tips

1. **Keep sleeping enabled** — This is the single most important optimization. Without sleeping, all 80 bodies would be solved every frame.

2. **Use static bodies for pins and walls** — Static bodies have zero mass computation cost and are excluded from the dynamic solver. Pins should be `'static'` type, not `'dynamic'` with fixed position.

3. **Set pins as static Circle shapes, not dynamic** — Confirms they're treated as immovable broadphase nodes with no solver overhead.

4. **Use `fixedRotation: true` for pucks** — Plinko pucks don't meaningfully rotate (they're circles). Disabling rotation eliminates angular velocity from the solver, saving ~30% of the per-body solve cost. Also makes `applyLinearImpulse` at center simpler (no torque).

5. **Avoid `bullet: true` unless needed** — Bullet mode enables CCD (continuous collision detection) with the swept-body algorithm, which is expensive. Only use it if pucks are moving fast enough to tunnel through pins. At typical Plinko velocities (gravity-driven), standard discrete collision is sufficient. If testing reveals tunneling, enable it only for the actively falling puck, not for settled pucks.

6. **Don't over-iterate** — 8 velocity / 3 position iterations is sufficient for circles. Doubling iterations roughly doubles solver cost.

7. **Monitor with `world.getProxyCount()`** — If broad-phase proxies grow unexpectedly, something is wrong (leaked bodies, etc.).

### Stress test recommendation

Before shipping, stress-test with all 80 bodies active (not sleeping) to verify the worst case. This can happen if a puck disturbs a large pile. Even in the absolute worst case where all 80 are awake simultaneously, the solve time should be under 3–4 ms on mobile — well within budget.

---

## 8. World Stepping API and Recommended Timestep

### The API

```ts
world.step(timeStep: number, velocityIterations?: number, positionIterations?: number): void
```

- **`timeStep`**: Duration of the simulation step in seconds. Must be constant for determinism.
- **`velocityIterations`**: Upper bound on velocity solver passes (default: 8 if omitted in some examples, but explicitly passing is recommended).
- **`positionIterations`**: Upper bound on position solver passes.

When `velocityIterations` and `positionIterations` are omitted, defaults depend on Planck.js version. **Always pass them explicitly** for determinism and clarity.

### WorldDef options relevant to simulation

```ts
const world = new World({
    gravity: { x: 0, y: -10 },   // m/s² — standard earth-like gravity
    allowSleep: true,             // default: true — critical for performance
    warmStarting: true,           // default: true — uses previous step's solution as starting point for solver
    continuousPhysics: true,      // default: true — enables CCD for dynamic-vs-static tunneling prevention
    subStepping: false,           // default: false — for testing only
    blockSolve: true,             // default: true — block solver for contact stacks
});
```

**`warmStarting`**: Uses the constraint solver's solution from the previous step as the initial guess for the next step. This dramatically improves convergence speed and is **essential for determinism** — always keep it `true`. Disabling it would make the solver start from scratch each step, wasting iterations and potentially producing different settling behavior.

**`continuousPhysics`**: Enables swept-collision (TOI) for dynamic bodies against static bodies. Prevents fast-moving pucks from tunneling through pins. Keep `true`.

**`blockSolve`**: Uses a block solver for stacked contact pairs. Improves stability when bodies pile up. Keep `true`.

### Recommended timestep value

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **1/60 s (16.67 ms)** | Standard Box2D timestep; well-tested; matches common display rate; lower CPU cost | Slightly less accurate for fast collisions | **Recommended** |
| 1/120 s (8.33 ms) | More accurate collision detection; smoother sub-frame behavior | 2× physics cost per frame; unnecessary for Plinko velocities | Overkill |
| 1/30 s (33.33 ms) | Lower CPU cost | Reduced accuracy; visible physics artifacts; pucks may tunnel through pins at higher velocities | Too coarse |

**Use 1/60.** The Planck.js docs explicitly state: "Generally physics engines for games like a time step at least as fast as 60Hz or 1/60 seconds." This matches the primary display rate (60 fps), simplifying the accumulator logic (typically one step per frame). At Plinko velocities (gravity-driven, ~3–7 m/s), 1/60 provides sufficient collision fidelity.

### Complete recommended configuration

```ts
// Physics constants — set once, never change during gameplay
const FIXED_DT = 1 / 60;
const VELOCITY_ITERATIONS = 8;
const POSITION_ITERATIONS = 3;
const MAX_FRAME_TIME = 0.25;        // 250ms clamp
const MAX_STEPS_PER_FRAME = 4;      // spiral of death prevention

const world = new World({
    gravity: { x: 0, y: -10 },
    allowSleep: true,
    warmStarting: true,
    continuousPhysics: true,
    blockSolve: true,
});

// Game loop (called from requestAnimationFrame)
let accumulator = 0;
let simTick = 0;
let lastTime = performance.now() / 1000;

function gameLoop(timestamp: number): void {
    const currentTime = timestamp / 1000;
    let frameTime = currentTime - lastTime;
    lastTime = currentTime;

    // Clamp to prevent spiral of death
    frameTime = Math.min(frameTime, MAX_FRAME_TIME);
    accumulator += frameTime;

    let steps = 0;
    while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        // Apply any queued inputs for this tick
        processInputsForTick(simTick);

        // Step physics
        world.step(FIXED_DT, VELOCITY_ITERATIONS, POSITION_ITERATIONS);

        simTick++;
        accumulator -= FIXED_DT;
        steps++;
    }

    // Render with interpolation
    const alpha = accumulator / FIXED_DT;
    render(alpha);

    requestAnimationFrame(gameLoop);
}
```

---

## Summary of Recommendations

| Topic | Recommendation |
|-------|---------------|
| Timestep | `1/60` seconds, fixed, never varied |
| Velocity iterations | 8 |
| Position iterations | 3 |
| Accumulator pattern | Yes — with 250 ms frame clamp and max 4 steps/frame |
| Rendering interpolation | Yes — linear interpolation between previous and current positions |
| Determinism scope | Same-device, same-browser determinism (sufficient for couch-competitive) |
| Sleeping | Enabled globally and per-body; deterministic; critical for performance |
| Warm starting | Keep enabled (default `true`) |
| Continuous physics (CCD) | Keep enabled for dynamic-vs-static tunneling prevention |
| Shove mechanic | Use `body.applyLinearImpulse()` at a deterministic simulation tick; quantize input vectors |
| Puck body config | `dynamic`, `fixedRotation: true`, `Circle` shape |
| Pin body config | `static`, `Circle` shape |
| Stalled body detection | Composite: sleeping check + bucket position validation + hard timeout |
| Bullet mode | Off by default; enable only for falling puck if tunneling is observed |
| Performance at 80 bodies | No concern; island/sleeping system handles this easily; ~1 ms per step on budget mobile |

---

## Sources

- [Planck.js Documentation — Simulation](https://piqnt.com/planck.js/docs/world/simulation)
- [Planck.js Documentation — Body](https://piqnt.com/planck.js/docs/body)
- [Planck.js Documentation — Fixture](https://piqnt.com/planck.js/docs/fixture)
- [Planck.js Documentation — Rendering](https://piqnt.com/planck.js/docs/rendering)
- [Planck.js Documentation — Limitations](https://piqnt.com/planck.js/docs/limitations)
- [Planck.js API — World class](https://piqnt.com/planck.js/docs/api/classes/World)
- [Planck.js API — Body class](https://piqnt.com/planck.js/docs/api/classes/Body)
- [Planck.js API — WorldDef interface](https://piqnt.com/planck.js/docs/api/interfaces/WorldDef)
- [Glenn Fiedler — "Fix Your Timestep!"](https://gafferongames.com/post/fix_your_timestep/)
- [iforce2d — Box2D World Settings Tutorial](https://www.iforce2d.net/b2dtut/worlds)
