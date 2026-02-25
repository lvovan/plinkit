# Research: Persistent Puck Growth & Board Standardization

**Feature Branch**: `010-persistent-puck-growth`  
**Date**: 2026-02-25

---

## Research 1: Planck.js Runtime Fixture Resizing

**Decision**: Destroy the old `CircleShape` fixture and create a new one with the larger radius.

**Rationale**: Planck.js treats shapes as immutable — `CircleShape` has no `setRadius()` method. Even mutating the internal `m_radius` would leave the broad-phase AABB proxy stale. The `destroyFixture()` + `createFixture()` approach correctly updates mass, inertia, contacts, and proxies. Both operations assert `!isWorldLocked()`, so they **must be deferred** until after `world.step()` completes — they cannot be called inside a contact listener callback.

**Alternatives considered**:
- *Direct radius mutation*: Rejected — stale broad-phase proxies would cause missed/phantom collisions.
- *Destroy and recreate the body*: Rejected — unnecessarily complex; preserving velocity, position, and angle would require manual transfer. Fixture replacement on the existing body preserves all body state automatically.

**Pattern**:
```
1. body.destroyFixture(body.getFixtureList()!)
2. body.createFixture({ shape: new planck.Circle(newRadius), density, restitution, friction })
3. body.setAwake(true)   // wake the body so it interacts with neighbors
```

---

## Research 2: Same-Player Puck Contact Detection

**Decision**: Extend the existing `begin-contact` listener to detect puck-puck collisions. When both bodies have `userData.type === 'puck'`, look up the corresponding `PuckBody` records from `board.pucks` to compare `playerId`. Queue a growth event (do not execute inline).

**Rationale**: `begin-contact` fires once per contact pair creation — exactly the semantic we need (detect when two pucks first touch). The existing `handleCollision()` already classifies collisions by type; adding same-player puck detection is a natural extension. Growth execution must be deferred to after `world.step()` because fixture modification during the solver is forbidden.

**Alternatives considered**:
- *`pre-solve` listener*: Fires every frame while overlapping — would trigger duplicate growth events. Rejected.
- *Post-step proximity scan*: Polling all puck pairs each tick is O(n²) and misses fleeting contacts. Rejected.

---

## Research 3: Body Wake Behavior After Growth

**Decision**: After resizing a puck's fixture, explicitly call `body.setAwake(true)` on the grown puck. Neighboring sleeping bodies will be woken automatically by the contact solver on the next `world.step()` when it detects the new overlap via `findNewContacts()`.

**Rationale**: `createFixture()` sets `m_newFixture = true` on the world, triggering `findNewContacts()` at the start of the next step. When a new contact is created between a sleeping body and an awake body, Box2D/Planck wakes the sleeping body. The grown puck itself must be explicitly woken because both `destroyFixture` and `createFixture` do not change the body's awake state.

**Alternatives considered**:
- *Wake all nearby bodies manually*: Unnecessary — the engine handles this on the next step. Manual waking would add complexity without benefit.

---

## Research 4: Bucket Exit Detection (Revocable Scoring)

**Decision**: Continue monitoring settled pucks every tick. If a settled puck is woken (`body.isAwake()`) or its center moves outside its assigned bucket boundaries, mark it as unsettled (`isSettled = false`, `settledInBucket = null`) and emit a score-revocation event.

**Rationale**: Currently, once `isSettled = true`, pucks are skipped in the settlement check loop. For revocable scoring, the `BucketDetector` must check settled pucks for displacement. Using `body.isAwake()` as the primary signal is efficient — it only triggers when another body physically pushes the settled puck (e.g., growth displacement). A secondary check on x-position against bucket boundaries catches cases where the puck slides out while remaining awake.

**Alternatives considered**:
- *Contact listener for bucket-exit*: No obvious contact event for "leaving a region" — buckets are defined by x-coordinate ranges, not by physics fixtures. Rejected.
- *Score finalization (no revocation)*: The spec explicitly requires revocable scoring (FR-016). Not an option.

**Anti-flicker measure**: Require the puck to be awake with velocity above `stalledVelocityThreshold` for at least 5 ticks (0.08s) before unsettling, to avoid flickering from brief jostle events.

---

## Research 5: Persistent Pucks Across Rounds

**Decision**: With fixed 8-row pins (no randomization), stop calling `sim.createWorld()` and `sim.clearPucks()` at round transitions. The world and all puck bodies persist for the entire game session. Since the board layout is now fixed, there is no need to rebuild pins between rounds.

**Rationale**: `createWorld()` creates a **new `planck.World`**, destroying all existing bodies. With a fixed board layout, pins, walls, and bucket dividers never change — there's no reason to rebuild them. Removing the `createWorld()` and `clearPucks()` calls from `transitionToNextRound()` is the simplest approach and directly satisfies FR-006/FR-007.

**Alternatives considered**:
- *Rebuild pins only, preserve pucks*: Would require a new `BoardBuilder.rebuildPins()` method that operates on the existing world. More complex, and unnecessary since the layout is fixed. Rejected for this feature. (Could be reconsidered if dynamic layouts return in a future feature.)
- *Serialize/deserialize pucks across world rebuilds*: Extremely complex — would need to save and restore position, velocity, angle, angular velocity, surface area growth state, player ownership, settlement status, etc. Rejected.

**Impact on round transitions**:
- `transitionToNextRound()`: Remove `randomizeLayout()`, `sim.clearPucks()`, `puckStyleMap.clear()`, and `sim.createWorld(config)`. Keep `startNextTurn()`.
- `startGame()`: Still calls `createWorld()` once at game start.
- `handleGameEnd()` (Play Again / New Players): Still calls `clearPucks()` + `createWorld()` to fully reset.

---

## Research 6: Chain-Reaction Growth Depth Limiting

**Decision**: Use a queue-based approach with a per-drop chain counter. When a growth event fires, enqueue any resulting same-player contacts. Process the queue sequentially between physics steps. Cap at 10 growth events per drop to prevent runaway cascades.

**Rationale**: Chain reactions are the most complex part of this feature. A growth event can push pucks into new contacts, which trigger more growth events. Processing must happen between `world.step()` calls because fixture modification is forbidden during the solver. A queue with a depth counter provides deterministic, capped behavior.

**Alternatives considered**:
- *Recursive processing within a single step pause*: Simpler but risks deep stacks and makes depth limiting harder. Rejected.
- *Spread over multiple physics steps*: Would cause visible delays in chain resolution. Rejected for responsiveness — all growth in a chain should resolve within a single "burst."

**Pattern**:
```
After world.step():
  1. Collect growth events from contact listener (queued during step)
  2. While queue is not empty AND chainCount < MAX_CHAIN_DEPTH:
     a. Pop event from queue
     b. Resize both pucks (destroy+create fixture)
     c. Wake both pucks
     d. Run a single world.step() to let physics resolve (micro-step)
     e. Collect any new same-player contacts into queue
     f. chainCount++
  3. Clear growth queue
```

---

## Research 7: Pop Sound Effect Synthesis

**Decision**: Add a `playPuckGrowth()` function in `synth-effects.ts` using the existing Web Audio API pattern. The sound should be a short "pop/bloop" — a sine wave with rapid pitch sweep (low to high) plus a filtered noise burst, ~100ms duration.

**Rationale**: All game sounds are synthesized — no audio files. The existing synth pattern (`OscillatorNode` + `GainNode` with envelope) is proven and consistent. A pop sound needs a quick attack, short pitch sweep upward, and rapid decay.

**Alternatives considered**:
- *Audio file*: Constitution forbids binary blobs in `src/`. All sounds must be synthesizer-based. Rejected.
- *Reuse existing bounce sound*: The spec explicitly requires a *dedicated* sound distinct from bounce collisions. Rejected.

**Synth sketch**:
```
Oscillator: sine, 200 Hz → 800 Hz sweep over 60ms
Gain: 0 → 0.4 (5ms attack) → 0 (80ms decay)
Optional: filtered white noise burst (bandpass ~2kHz, 40ms) for "pop" texture
```
