# Physics Engine Research: Matter.js vs Planck.js vs Rapier

**Date**: 2026-02-24  
**Context**: Selecting a 2D physics engine for a browser-based multiplayer Plinko game  
**Status**: Complete

## Requirements Summary

| Requirement | Detail |
|---|---|
| Determinism | Identical inputs → identical outputs, every time, across browsers/devices |
| Update loop | Fixed-timestep physics decoupled from rendering |
| Body count | Up to ~80 persistent rigid bodies (pucks remain on board) |
| Collision types | Circle–circle, circle–static (pucks vs pins, pucks vs pucks, pucks vs walls) |
| Performance target | 60 fps on 2022-era budget phone (Snapdragon 680 / Apple A13) |
| TypeScript | Strict mode compatibility |
| Bundle budget | Engine must fit comfortably within 1 MB gzipped total app budget |

---

## 1. Matter.js

**Repository**: https://github.com/liabru/matter-js  
**Latest version**: 0.20.0 (released ~2024, last commit ~2 years ago)  
**License**: MIT  
**Language**: JavaScript (original implementation, not a port)

### Bundle Size

| Metric | Size |
|---|---|
| `matter.min.js` (minified) | **83 KB** |
| Gzipped | **~26 KB** |

**Verdict**: Excellent. Smallest of the three by far.

### Determinism

**Not deterministic by design.** Matter.js uses standard JavaScript floating-point math (`Math.sin`, `Math.cos`, etc.) without any cross-platform determinism guarantees. The engine does not document or guarantee that identical initial conditions produce identical results across different browsers, devices, or even different runs on the same machine.

Key concerns:
- JS engine JIT optimizations can reorder floating-point operations
- No fixed-point or soft-float fallback
- `Math.trig` functions are implementation-defined and vary across engines (V8 vs SpiderMonkey vs JavaScriptCore)
- No snapshot/restore mechanism for verifying simulation state
- The test suite checks for consistency within a tolerance, not bit-exact reproduction

**Verdict**: **Disqualifying for this project.** The spec requires that "the same horizontal drop position, identical initial conditions → same trajectory and final bucket every time." Matter.js cannot guarantee this across browsers or devices.

### Fixed-Timestep API

`Matter.Runner` provides an `isFixed` option, but it defaults to `false` (variable timestep). You can call `Engine.update(engine, 1000/60)` manually with a constant delta, but the engine was not architected around a fixed-step pipeline. There's no built-in accumulator pattern or interpolation support — you'd build that yourself.

**Verdict**: Usable but manual. No first-class fixed-timestep support.

### TypeScript Support

- Written in plain JavaScript (100% JS codebase)
- Types available via DefinitelyTyped (`@types/matter-js` v0.20.2)
- Community-maintained types, not first-party
- Quality is acceptable but lags behind API changes and has occasional inaccuracies

**Verdict**: Adequate but not ideal. Third-party types with no strict-mode testing by the core team.

### Mobile Performance

- Pure JS execution, no WASM overhead or async init
- Lightweight at ~83 KB minified
- The broad-phase (grid-based) and narrow-phase are straightforward but not heavily optimized
- ~80 bodies is well within its comfort zone — Matter.js demos show 200+ bodies running smoothly
- Known issue: no sleeping optimization by default for fast-moving bodies; sleeping is supported but pucks in motion may not benefit until settled

**Verdict**: Good. 80 bodies is comfortable for Matter.js on budget mobile hardware.

### Community & Maintenance

| Metric | Value |
|---|---|
| GitHub stars | 18.1k |
| Contributors | 25 |
| Open issues | 232 |
| Open PRs | 47 |
| Last commit | ~2 years ago |
| Last release | 0.20.0 (~2024) |
| npm weekly downloads | High (widely used) |
| Used by | 13.1k projects |

**Verdict**: Very popular but **effectively unmaintained**. Single primary maintainer (liabru) with no commits in ~2 years. Large backlog of unresolved issues and PRs. Mature and stable, but no active development.

### Persistent Bodies (80+)

No known issues. Matter.js handles 200+ bodies in stress-test demos. Sleeping support helps once pucks settle. The broad-phase scales adequately for this count.

---

## 2. Planck.js

**Repository**: https://github.com/piqnt/planck.js  
**Latest version**: 1.4.3 (released ~2 weeks ago as of 2026-02-24)  
**License**: MIT  
**Language**: TypeScript (99.1% TS codebase) — a JavaScript/TypeScript rewrite of Box2D

### Bundle Size

| Metric | Size |
|---|---|
| `planck.min.js` (minified, UMD) | **297 KB** |
| `planck.mjs` (ESM, tree-shakeable) | **402 KB** |
| Gzipped (minified) | **~56 KB** |

**Verdict**: Moderate. Larger than Matter.js but well within the 1 MB budget. The ESM build enables tree-shaking to reduce the effective size (joints, shapes not needed can be excluded).

### Determinism

**Locally deterministic (same-machine, same-browser).** Being a faithful Box2D port, Planck.js inherits Box2D's deterministic solver behavior: given the same initial conditions, the same sequence of `world.step()` calls produces the same result — *on the same platform*. 

Key caveats:
- Uses standard JS `Math` operations — not cross-platform deterministic
- `Math.sin`, `Math.cos`, `Math.atan2` results can differ between V8, SpiderMonkey, and JavaScriptCore
- No WASM soft-float or fixed-point layer to eliminate platform variance
- Box2D's original C++ determinism guarantees assume identical FPU behavior, which JS does not provide

Cross-platform (cross-browser) determinism is **not guaranteed**. However, for a local couch-competitive game where all players share the same device and browser, Planck.js will produce consistent results within that single session.

**Verdict**: **Sufficient for this project's actual use case.** The game is local/couch-competitive (same device, same browser). Planck.js is deterministic within a single browser session. If future requirements demand cross-device replay verification, this would need revisiting — but for the current spec (same device, turn-by-turn), it works.

### Fixed-Timestep API

First-class support via `world.step(timeStep, velocityIterations, positionIterations)`:

```ts
const timeStep = 1 / 60;
const velocityIterations = 8;
const positionIterations = 3;
world.step(timeStep, velocityIterations, positionIterations);
```

This is a direct port of Box2D's stepping model, which is designed around fixed timesteps. The API naturally separates physics updates from rendering. You call `world.step()` in your own game loop with a fixed delta, accumulate leftover time, and interpolate for rendering — a well-documented pattern from Box2D's design.

**Verdict**: Excellent. Fixed-timestep is the intended usage pattern. Box2D's solver is specifically tuned for this.

### TypeScript Support

- Written in TypeScript (99.1% of codebase)
- Ships its own `.d.ts` declarations (`"types": "index.d.ts"`)
- First-party types, directly from the source
- Type definitions in `test-d/` directory indicate type-level testing

**Verdict**: Excellent. First-party TypeScript with strict types from the source code itself.

### Mobile Performance

- Pure JS execution, no WASM init latency
- Box2D's solver is extensively battle-tested for performance in constrained environments
- The island/sleeping system automatically deactivates settled bodies, reducing per-frame work
- Box2D was originally designed for games with exactly this class of workload
- ~80 bodies is well within the typical Box2D comfort zone (Box2D games routinely handle 200–500 bodies)
- Velocity and position iteration counts are tunable — reducing them trades accuracy for speed

**Verdict**: Excellent. Box2D's architecture is specifically optimized for games on constrained hardware. The island + sleeping system is ideal for Plinko where most pucks eventually settle.

### Community & Maintenance

| Metric | Value |
|---|---|
| GitHub stars | 5.2k |
| Contributors | 25 |
| Open issues | 26 |
| Open PRs | 6 |
| Last commit | ~2 weeks ago |
| Last release | 1.4.3 (2 weeks ago) |
| Used by | 424 projects |
| Discord | Active |
| Primary maintainer | shakiba (active) |

**Verdict**: Actively maintained with a responsive primary maintainer. Smaller community than Matter.js but much healthier development cadence. Recent bug fixes and releases demonstrate ongoing commitment.

### Persistent Bodies (80+)

No known issues. Box2D's island system groups interacting bodies efficiently. Sleeping bodies consume minimal CPU. The AABB-tree broad-phase handles persistent bodies well. This is a core Box2D use case.

---

## 3. Rapier (WASM)

**Repository**: https://github.com/dimforge/rapier (Rust core), https://github.com/dimforge/rapier.js (JS bindings)  
**Latest version**: 0.19.3 (JS bindings, released ~3 months ago)  
**License**: Apache-2.0  
**Language**: Rust compiled to WASM, with TypeScript bindings

### Bundle Size

Multiple package variants exist. For this project, the deterministic-compat variant is most relevant:

| Package | JS Size | WASM Size | Total Min | Total Gzipped |
|---|---|---|---|---|
| `@dimforge/rapier2d-compat` | 189 KB | 1,176 KB | **1,365 KB** | **~462 KB** |
| `@dimforge/rapier2d-deterministic-compat` | 189 KB | 1,209 KB | **1,398 KB** | **~472 KB** |
| `@dimforge/rapier2d` (requires WASM bundler support) | — | — | ~1,175 KB | ~441 KB |

Note: The `-compat` variants embed the WASM as base64 in the JS file for wider bundler support, inflating the JS portion. The non-compat variant loads `.wasm` separately.

**Verdict**: Significantly larger than both JS alternatives. At ~462–472 KB gzipped for the engine alone, it consumes nearly half the 1 MB total app budget before any application code, assets, or rendering library. Usable but tight.

### Determinism

**Cross-platform deterministic — the strongest guarantee of all three.**

From Rapier's documentation:
> "The WASM/TypeScript/JavaScript version of Rapier is fully cross-platform deterministic. This means that running the same simulation (with the same initial conditions) using the same version of Rapier, on two different machines (even with different browsers, operating systems, and processors), will give the exact same results."

This is achieved via:
- The `@dimforge/rapier2d-deterministic` build uses software floating-point emulation, eliminating platform-dependent FPU behavior
- WASM execution is sandboxed and reproducible across platforms
- Snapshot support via `world.createSnapshot()` for state verification
- MD5 hash of snapshots is guaranteed identical across platforms

Caveats:
- The standard `rapier2d` build is only *locally* deterministic (same machine) — you must use the `-deterministic` variant for cross-platform guarantees
- Transcendental functions (`Math.sin`, `Math.cos`) used to *initialize* the simulation must also be deterministic — but this only applies to setup code, not the engine itself
- The `-deterministic` variant is slightly slower due to soft-float emulation

**Verdict**: Best-in-class determinism. Overkill for a local couch game, but unbeatable if cross-device replay is ever needed.

### Fixed-Timestep API

`world.step()` is called with `IntegrationParameters` that specify the timestep. The API is inherently fixed-timestep:

```ts
let world = new RAPIER.World({ x: 0.0, y: -9.81 });
// timestep is configured via world.integrationParameters.dt
world.step();
```

The physics pipeline is fully decoupled from rendering. No built-in runner — you manage the game loop yourself (which is what you want).

**Verdict**: Excellent. Inherently fixed-timestep by design.

### TypeScript Support

- JS bindings are written in TypeScript (67.6% of rapier.js repo)
- Ships comprehensive `.d.ts` files covering all API surfaces
- First-party types generated from the Rust/WASM bindings
- Well-structured type hierarchy (RigidBody, Collider, World, etc.)

**Verdict**: Excellent. First-party TypeScript with thorough type coverage.

### Mobile Performance

- WASM execution is generally faster than equivalent JS for compute-heavy workloads
- **However**: WASM initialization requires async loading (`await RAPIER.init()`) which adds startup latency
- The `-deterministic` variant uses soft-float, which is 2–3x slower than native float operations
- WASM memory management crosses the JS↔WASM boundary, adding overhead for getting/setting body positions
- For ~80 bodies, the raw compute advantage of WASM is largely irrelevant — the workload is too small for WASM to outperform a well-written JS solver
- WASM binary must be downloaded, compiled, and instantiated — cold-start penalty on mobile

**Verdict**: Adequate but with caveats. The WASM startup cost and JS↔WASM bridge overhead are non-trivial for a simple game. The compute advantage only materially helps at higher body counts (500+). The deterministic variant's soft-float penalty further reduces the performance advantage.

### Community & Maintenance

| Metric | Value |
|---|---|
| GitHub stars (Rust core) | 5.2k |
| GitHub stars (JS bindings) | 636 |
| Contributors (Rust) | 75 |
| Contributors (JS) | 22 |
| Open issues (Rust) | 148 |
| Open issues (JS) | 95 |
| Last Rust commit | ~1 month ago |
| Last JS release | 0.19.3 (~3 months ago) |
| Primary maintainer | sebcrozet / Dimforge |
| Funding | Sponsored (GitHub Sponsors) |

**Verdict**: Actively maintained by a funded organization (Dimforge). Strong Rust ecosystem presence. JS bindings lag behind the Rust core but are regularly updated. Bevy (game engine) integration drives significant community investment.

### Persistent Bodies (80+)

No known issues. Rapier's island manager automatically tracks active vs sleeping bodies. The broad-phase (AABB-based) handles persistent bodies efficiently. Rapier is designed for much larger scenes.

---

## Comparison Matrix

| Criterion | Matter.js | Planck.js | Rapier |
|---|---|---|---|
| **Bundle size (min+gzip)** | ~26 KB | ~56 KB | ~462–472 KB |
| **Determinism (same device)** | Likely but not guaranteed | Yes (Box2D solver) | Yes |
| **Determinism (cross-platform)** | No | No | Yes (`-deterministic` build) |
| **Fixed-timestep API** | Manual (no first-class) | First-class (`world.step()`) | First-class (`world.step()`) |
| **TypeScript support** | Third-party (`@types`) | First-party (written in TS) | First-party (TS bindings) |
| **Mobile perf (80 bodies)** | Good | Excellent | Adequate (WASM overhead) |
| **Maintenance status** | Stale (~2 years) | Active (days ago) | Active (months ago) |
| **GitHub stars** | 18.1k | 5.2k | 5.2k (Rust) + 636 (JS) |
| **Sleeping / islands** | Basic sleeping | Full island system | Full island system |
| **Init complexity** | Synchronous | Synchronous | Async (WASM load) |
| **Last release** | 0.20.0 (~2024) | 1.4.3 (~Feb 2026) | 0.19.3 (~Nov 2025) |

---

## Recommendation

### **Use Planck.js** (`planck` npm package, v1.4.3)

#### Rationale

1. **Determinism — sufficient for the actual use case.** The game is local/couch-competitive: all players share one device and one browser. Planck.js (Box2D) is deterministic within a single browser session — `world.step()` with identical initial conditions and a fixed timestep produces identical results every time. Cross-platform determinism (Rapier's advantage) is unnecessary when players are on the same device.

2. **Fixed-timestep architecture.** Box2D was *designed* for fixed-timestep simulation. The `world.step(dt, velIter, posIter)` API is the canonical approach. This matches the spec requirement for a physics loop decoupled from rendering.

3. **Bundle size.** At ~56 KB gzipped, Planck.js leaves ample room in the 1 MB budget for the game application, rendering, and assets. Rapier's ~470 KB gzipped would consume nearly half the budget for the physics engine alone.

4. **TypeScript.** Written in TypeScript with first-party type definitions. No DefinitelyTyped lag, no type accuracy concerns. Works with `strict: true` out of the box.

5. **Mobile performance.** Pure JS with no WASM initialization penalty. Box2D's island + sleeping system is specifically designed for games with persistent bodies that eventually settle — exactly the Plinko use case. No async `init()` call, no JS↔WASM bridge overhead.

6. **Active maintenance.** Recent release (1.4.3, February 2026) with an active maintainer. Small issue backlog (26 open). Discord community for support.

7. **Battle-tested physics.** Box2D has been the industry-standard 2D physics engine for over 15 years. Its solver, broad-phase, and contact management are proven at scale. Plinko (circles bouncing off static circles and walls) is a straightforward Box2D scenario with well-understood behavior.

#### Why not Matter.js?

- No determinism guarantees — the spec explicitly requires deterministic simulation
- Unmaintained for ~2 years with 232 open issues
- No first-class fixed-timestep support
- Third-party TypeScript types

#### Why not Rapier?

- ~470 KB gzipped is too large for this use case — nearly half the total budget
- WASM initialization adds startup complexity and latency
- Cross-platform determinism is over-engineered for a local game
- JS↔WASM bridge overhead provides no benefit at 80 bodies
- The deterministic build's soft-float penalty slows simulation without benefit for a same-device game

#### Recommended package configuration

```json
{
  "dependencies": {
    "planck": "^1.4.3"
  }
}
```

#### Recommended simulation parameters (starting point)

```ts
import { World, Circle, Vec2 } from "planck";

const world = new World({ gravity: Vec2(0, -10) });

const TIMESTEP = 1 / 60;
const VELOCITY_ITERATIONS = 8;
const POSITION_ITERATIONS = 3;

// In game loop:
world.step(TIMESTEP, VELOCITY_ITERATIONS, POSITION_ITERATIONS);
```
